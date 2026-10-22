import type { ColumnType, Insertable, Selectable, Updateable } from "kysely";

/**
 * Database table definitions for Kysely.
 *
 * Dates are stored as ISO strings. `date` columns are local calendar days
 * (YYYY-MM-DD) and `*_at` columns are full ISO timestamps.
 */

export interface HabitTable {
	id: string;
	/** Owning user ("local" on single-tenant installs). */
	user_id: string;
	name: string;
	/** Atomic Habits: identity-based habit ("I am the type of person who..."). */
	identity: string | null;
	/** body | mind | character | craft */
	pillar: string;
	/** Implementation intention: "I will [habit] at [time] in [location]". */
	cue_time: string | null;
	cue_location: string | null;
	/** Habit stacking: "After I [current habit], I will [new habit]". */
	stack_after: string | null;
	/** Two-minute rule: the smallest version that still counts as showing up. */
	two_minute: string | null;
	/** check | count */
	kind: string;
	target: number;
	unit: string | null;
	/** JSON array of weekdays (0 = Sunday .. 6 = Saturday). */
	schedule: string;
	sort_order: number;
	/** Local calendar day the habit started counting (YYYY-MM-DD). */
	start_date: string;
	created_at: ColumnType<string, string | undefined, never>;
	/** Local calendar day the habit stopped counting. */
	archived_at: string | null;
}

export interface HabitLogTable {
	habit_id: string;
	date: string;
	value: number;
	/** 1 when only the two-minute version was done. */
	minimum: number;
	note: string | null;
	updated_at: string;
}

export interface DebriefTable {
	user_id: string;
	date: string;
	mission: string | null;
	wins: string | null;
	losses: string | null;
	ownership: string | null;
	adjust: string | null;
	rating: number | null;
	/** JSON map of field -> ISO time it was last edited on the client (LWW merge). */
	field_times: ColumnType<string, string | undefined, string>;
	updated_at: string;
}

export interface SettingTable {
	user_id: string;
	key: string;
	value: string;
}

export interface UserTable {
	id: string;
	/** OIDC issuer + subject identify a person across logins. */
	issuer: string;
	subject: string;
	email: string | null;
	name: string | null;
	created_at: string;
	last_login_at: string;
}

/** Instance-wide values, e.g. the generated session signing secret. */
export interface InstanceTable {
	key: string;
	value: string;
}

export interface Database {
	users: UserTable;
	instance: InstanceTable;
	habits: HabitTable;
	habit_logs: HabitLogTable;
	debriefs: DebriefTable;
	settings: SettingTable;
}

export type HabitRow = Selectable<HabitTable>;
export type NewHabitRow = Insertable<HabitTable>;
export type HabitUpdate = Updateable<HabitTable>;
export type HabitLogRow = Selectable<HabitLogTable>;
export type DebriefRow = Selectable<DebriefTable>;
