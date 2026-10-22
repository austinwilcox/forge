import type { Kysely } from "kysely";
import type { z } from "zod";
import type { debriefInput, logInput } from "#/lib/schemas";
import type { Database } from "./db/schema";

/**
 * Conflict rules for writes replayed from offline devices. Each write carries
 * the time it was made on the device; the newest one wins — per habit/day for
 * logs, per field for debriefs. Kept apart from the server functions so the
 * rules can be tested against a real (in-memory) database.
 */

/** A device clock running ahead can't claim the future and win every conflict. */
export function clientStamp(iso: string, now = new Date().toISOString()) {
	const t = new Date(iso).toISOString();
	return t < now ? t : now;
}

/**
 * Clearing a log keeps the row at zero (a tombstone), so an older "done"
 * replayed later from another device can't bring it back. Returns false when
 * the habit isn't this user's (or was deleted while the write was queued) —
 * dropped quietly so it can't block the queue forever.
 */
export async function writeLog(
	db: Kysely<Database>,
	userId: string,
	data: z.output<typeof logInput>,
) {
	const owned = await db
		.selectFrom("habits")
		.select("id")
		.where("id", "=", data.habitId)
		.where("user_id", "=", userId)
		.executeTakeFirst();
	if (!owned) return false;
	const row = {
		habit_id: data.habitId,
		date: data.date,
		value: data.value,
		minimum: data.minimum ? 1 : 0,
		note: data.note ?? null,
		updated_at: clientStamp(data.updatedAt),
	};
	await db
		.insertInto("habit_logs")
		.values(row)
		.onConflict((oc) =>
			oc
				.columns(["habit_id", "date"])
				.doUpdateSet({
					value: row.value,
					minimum: row.minimum,
					note: row.note,
					updated_at: row.updated_at,
				})
				.where("habit_logs.updated_at", "<=", row.updated_at),
		)
		.execute();
	return true;
}

const DEBRIEF_FIELDS = [
	"mission",
	"wins",
	"losses",
	"ownership",
	"adjust",
	"rating",
] as const;

/**
 * The mission set on a phone offline at 0600 and the evening debrief typed on
 * a laptop both survive, whichever syncs first.
 */
export async function mergeDebrief(
	db: Kysely<Database>,
	userId: string,
	data: z.output<typeof debriefInput>,
) {
	const stamp = clientStamp(data.updatedAt);
	await db.transaction().execute(async (trx) => {
		const existing = await trx
			.selectFrom("debriefs")
			.select("field_times")
			.where("user_id", "=", userId)
			.where("date", "=", data.date)
			.executeTakeFirst();
		const times: Record<string, string> = existing
			? JSON.parse(existing.field_times)
			: {};
		const patch: Record<string, string | number | null> = {};
		for (const field of DEBRIEF_FIELDS) {
			const value = data[field];
			if (value === undefined || (times[field] ?? "") > stamp) continue;
			patch[field] = value;
			times[field] = stamp;
		}
		const values = {
			...patch,
			field_times: JSON.stringify(times),
			updated_at: new Date().toISOString(),
		};
		if (!existing)
			await trx
				.insertInto("debriefs")
				.values({ user_id: userId, date: data.date, ...values })
				.execute();
		else if (Object.keys(patch).length)
			await trx
				.updateTable("debriefs")
				.set(values)
				.where("user_id", "=", userId)
				.where("date", "=", data.date)
				.execute();
	});
}
