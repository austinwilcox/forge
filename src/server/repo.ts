import type { Kysely } from "kysely";
import type { Habit, HabitLog } from "#/lib/habits";
import type { Pillar, Profile } from "#/lib/schemas";
import type { Database, DebriefRow, HabitLogRow, HabitRow } from "./db/schema";

/**
 * Row <-> domain mapping and shared queries used by server functions. Every
 * query takes the owning user id: tenants never see each other's rows.
 */

export function toHabit(row: HabitRow): Habit {
	return {
		id: row.id,
		name: row.name,
		identity: row.identity,
		pillar: row.pillar as Pillar,
		cueTime: row.cue_time,
		cueLocation: row.cue_location,
		stackAfter: row.stack_after,
		twoMinute: row.two_minute,
		kind: row.kind === "count" ? "count" : "check",
		target: row.target,
		unit: row.unit,
		schedule: JSON.parse(row.schedule) as number[],
		sortOrder: row.sort_order,
		startDate: row.start_date,
		archivedAt: row.archived_at,
	};
}

export function toLog(row: HabitLogRow): HabitLog {
	return {
		habitId: row.habit_id,
		date: row.date,
		value: row.value,
		minimum: row.minimum === 1,
		note: row.note,
	};
}

export type Debrief = Omit<
	DebriefRow,
	"updated_at" | "field_times" | "user_id"
> & {
	updatedAt: string;
};

export function toDebrief(row: DebriefRow): Debrief {
	const { updated_at, field_times: _, user_id: __, ...rest } = row;
	return { ...rest, updatedAt: updated_at };
}

export async function loadHabits(
	db: Kysely<Database>,
	userId: string,
	opts: { includeArchived?: boolean } = {},
) {
	let q = db
		.selectFrom("habits")
		.selectAll()
		.where("user_id", "=", userId)
		.orderBy("sort_order")
		.orderBy("created_at");
	if (!opts.includeArchived) q = q.where("archived_at", "is", null);
	return (await q.execute()).map(toHabit);
}

export async function loadLogs(
	db: Kysely<Database>,
	userId: string,
	from: string,
	to: string,
) {
	const rows = await db
		.selectFrom("habit_logs")
		.innerJoin("habits", "habits.id", "habit_logs.habit_id")
		.selectAll("habit_logs")
		.where("habits.user_id", "=", userId)
		.where("habit_logs.date", ">=", from)
		.where("habit_logs.date", "<=", to)
		.execute();
	return rows.map(toLog);
}

export async function loadProfile(
	db: Kysely<Database>,
	userId: string,
): Promise<Profile> {
	const rows = await db
		.selectFrom("settings")
		.selectAll()
		.where("user_id", "=", userId)
		.where("key", "in", ["name", "creed"])
		.execute();
	const get = (k: string) => rows.find((r) => r.key === k)?.value ?? null;
	return { name: get("name"), creed: get("creed") };
}
