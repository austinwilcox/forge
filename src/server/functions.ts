import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { STARTER_PROTOCOL } from "#/lib/principles";
import {
	debriefInput,
	habitInput,
	habitUpdateInput,
	isoDate,
	logInput,
	profileInput,
} from "#/lib/schemas";
import { authMiddleware } from "./auth";
import { getDb } from "./db/client";
import { loadHabits, loadLogs, loadProfile, toDebrief } from "./repo";
import { mergeDebrief, writeLog } from "./sync-writes";

/**
 * Every data server function goes through `authMiddleware` and validates its
 * input with the same zod schemas the forms use. The middleware supplies
 * `context.userId`; every query is scoped to it.
 */

function habitColumns(h: z.output<typeof habitInput>) {
	return {
		name: h.name,
		identity: h.identity,
		pillar: h.pillar,
		cue_time: h.cueTime,
		cue_location: h.cueLocation,
		stack_after: h.stackAfter,
		two_minute: h.twoMinute,
		kind: h.kind,
		target: h.kind === "check" ? 1 : h.target,
		unit: h.kind === "check" ? null : h.unit,
		schedule: JSON.stringify([...new Set(h.schedule)].sort()),
	};
}

// ── Habits ──────────────────────────────────────────────────────────────────

export const listHabits = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(z.object({ includeArchived: z.boolean().default(true) }))
	.handler(async ({ data, context }) =>
		loadHabits(await getDb(), context.userId, data),
	);

export const createHabit = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(z.object({ habit: habitInput, startDate: isoDate }))
	.handler(async ({ data, context }) => {
		const db = await getDb();
		const max = await db
			.selectFrom("habits")
			.select((eb) => eb.fn.max("sort_order").as("max"))
			.where("user_id", "=", context.userId)
			.executeTakeFirst();
		const id = randomUUID();
		await db
			.insertInto("habits")
			.values({
				id,
				user_id: context.userId,
				...habitColumns(data.habit),
				sort_order: (max?.max ?? -1) + 1,
				start_date: data.startDate,
				archived_at: null,
			})
			.execute();
		return { id };
	});

export const updateHabit = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(habitUpdateInput)
	.handler(async ({ data, context }) => {
		const db = await getDb();
		await db
			.updateTable("habits")
			.set(habitColumns(data.habit))
			.where("id", "=", data.id)
			.where("user_id", "=", context.userId)
			.execute();
		return { id: data.id };
	});

export const setHabitArchived = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(z.object({ id: z.string(), archivedOn: isoDate.nullable() }))
	.handler(async ({ data, context }) => {
		const db = await getDb();
		await db
			.updateTable("habits")
			.set({ archived_at: data.archivedOn })
			.where("id", "=", data.id)
			.where("user_id", "=", context.userId)
			.execute();
		return { id: data.id };
	});

export const deleteHabit = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(z.object({ id: z.string() }))
	.handler(async ({ data, context }) => {
		const db = await getDb();
		await db
			.deleteFrom("habits")
			.where("id", "=", data.id)
			.where("user_id", "=", context.userId)
			.execute();
		return { id: data.id };
	});

export const reorderHabits = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(z.object({ ids: z.array(z.string()).max(500) }))
	.handler(async ({ data, context }) => {
		const db = await getDb();
		await db.transaction().execute(async (trx) => {
			for (const [i, id] of data.ids.entries()) {
				await trx
					.updateTable("habits")
					.set({ sort_order: i })
					.where("id", "=", id)
					.where("user_id", "=", context.userId)
					.execute();
			}
		});
		return { ok: true };
	});

export const installStarterProtocol = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(z.object({ startDate: isoDate }))
	.handler(async ({ data, context }) => {
		const db = await getDb();
		await db
			.insertInto("habits")
			.values(
				STARTER_PROTOCOL.map((h, i) => ({
					id: randomUUID(),
					user_id: context.userId,
					...habitColumns(
						habitInput.parse({
							...h,
							identity: h.identity ?? "",
							cueTime: h.cueTime ?? "",
							cueLocation: h.cueLocation ?? "",
							stackAfter: h.stackAfter ?? "",
							twoMinute: h.twoMinute ?? "",
							unit: h.unit ?? "",
							schedule: [...h.schedule],
						}),
					),
					sort_order: i,
					start_date: data.startDate,
					archived_at: null,
				})),
			)
			.execute();
		return { ok: true };
	});

// ── Sync reads ──────────────────────────────────────────────────────────────

/**
 * The device keeps a local copy of recent history and computes Today and
 * Progress from it, so both keep working with no connection.
 */
export const listLogs = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(z.object({ since: isoDate }))
	.handler(async ({ data, context }) =>
		loadLogs(await getDb(), context.userId, data.since, "9999-12-31"),
	);

export const listDebriefs = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(z.object({ since: isoDate }))
	.handler(async ({ data, context }) => {
		const db = await getDb();
		const rows = await db
			.selectFrom("debriefs")
			.selectAll()
			.where("user_id", "=", context.userId)
			.where("date", ">=", data.since)
			.orderBy("date", "desc")
			.execute();
		return rows.map(toDebrief);
	});

// ── Sync writes ─────────────────────────────────────────────────────────────

/** Upsert one habit/day, newest edit wins. See sync-writes.ts. */
export const setLog = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(logInput)
	.handler(async ({ data, context }) => ({
		ok: await writeLog(await getDb(), context.userId, data),
	}));

/** Merge a debrief patch field by field, newest edit wins. See sync-writes.ts. */
export const saveDebrief = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(debriefInput)
	.handler(async ({ data, context }) => {
		await mergeDebrief(await getDb(), context.userId, data);
		return { date: data.date };
	});

// ── Profile ─────────────────────────────────────────────────────────────────

export const getProfile = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => loadProfile(await getDb(), context.userId));

export const saveProfile = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(profileInput)
	.handler(async ({ data, context }) => {
		const db = await getDb();
		for (const [key, value] of Object.entries(data)) {
			if (value === null)
				await db
					.deleteFrom("settings")
					.where("user_id", "=", context.userId)
					.where("key", "=", key)
					.execute();
			else
				await db
					.insertInto("settings")
					.values({ user_id: context.userId, key, value })
					.onConflict((oc) =>
						oc.columns(["user_id", "key"]).doUpdateSet({ value }),
					)
					.execute();
		}
		return { ok: true };
	});
