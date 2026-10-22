import { type Kysely, sql } from "kysely";
import type { Migration, MigrationProvider } from "kysely/migration";

/**
 * Migrations live in code (not on disk) so they ship inside the server bundle
 * and run automatically when the container starts.
 */
const migrations: Record<string, Migration> = {
	"0001_initial": {
		async up(db: Kysely<unknown>) {
			await db.schema
				.createTable("habits")
				.addColumn("id", "text", (c) => c.primaryKey())
				.addColumn("name", "text", (c) => c.notNull())
				.addColumn("identity", "text")
				.addColumn("pillar", "text", (c) => c.notNull().defaultTo("body"))
				.addColumn("cue_time", "text")
				.addColumn("cue_location", "text")
				.addColumn("stack_after", "text")
				.addColumn("two_minute", "text")
				.addColumn("kind", "text", (c) => c.notNull().defaultTo("check"))
				.addColumn("target", "integer", (c) => c.notNull().defaultTo(1))
				.addColumn("unit", "text")
				.addColumn("schedule", "text", (c) =>
					c.notNull().defaultTo("[0,1,2,3,4,5,6]"),
				)
				.addColumn("sort_order", "integer", (c) => c.notNull().defaultTo(0))
				.addColumn("start_date", "text", (c) => c.notNull())
				.addColumn("created_at", "text", (c) =>
					c.notNull().defaultTo(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
				)
				.addColumn("archived_at", "text")
				.execute();

			await db.schema
				.createTable("habit_logs")
				.addColumn("habit_id", "text", (c) =>
					c.notNull().references("habits.id").onDelete("cascade"),
				)
				.addColumn("date", "text", (c) => c.notNull())
				.addColumn("value", "integer", (c) => c.notNull().defaultTo(0))
				.addColumn("minimum", "integer", (c) => c.notNull().defaultTo(0))
				.addColumn("note", "text")
				.addColumn("updated_at", "text", (c) => c.notNull())
				.addPrimaryKeyConstraint("habit_logs_pk", ["habit_id", "date"])
				.execute();

			await db.schema
				.createIndex("habit_logs_date_idx")
				.on("habit_logs")
				.column("date")
				.execute();

			await db.schema
				.createTable("debriefs")
				.addColumn("date", "text", (c) => c.primaryKey())
				.addColumn("mission", "text")
				.addColumn("wins", "text")
				.addColumn("losses", "text")
				.addColumn("ownership", "text")
				.addColumn("adjust", "text")
				.addColumn("rating", "integer")
				.addColumn("updated_at", "text", (c) => c.notNull())
				.execute();

			await db.schema
				.createTable("settings")
				.addColumn("key", "text", (c) => c.primaryKey())
				.addColumn("value", "text", (c) => c.notNull())
				.execute();
		},
		async down(db: Kysely<unknown>) {
			await db.schema.dropTable("settings").execute();
			await db.schema.dropTable("debriefs").execute();
			await db.schema.dropTable("habit_logs").execute();
			await db.schema.dropTable("habits").execute();
		},
	},
	// Offline sync: debriefs merge field by field, newest edit wins per field.
	"0002_debrief_field_times": {
		async up(db: Kysely<unknown>) {
			await db.schema
				.alterTable("debriefs")
				.addColumn("field_times", "text", (c) => c.notNull().defaultTo("{}"))
				.execute();
		},
		async down(db: Kysely<unknown>) {
			await db.schema
				.alterTable("debriefs")
				.dropColumn("field_times")
				.execute();
		},
	},
	/**
	 * Multi-tenancy. Every row belongs to a user. Single-tenant installs use the
	 * built-in "local" user; with OIDC each identity gets its own user. SQLite
	 * can't change a primary key in place, so debriefs/settings are rebuilt.
	 */
	"0003_tenants": {
		async up(db: Kysely<unknown>) {
			await db.schema
				.createTable("users")
				.addColumn("id", "text", (c) => c.primaryKey())
				.addColumn("issuer", "text", (c) => c.notNull())
				.addColumn("subject", "text", (c) => c.notNull())
				.addColumn("email", "text")
				.addColumn("name", "text")
				.addColumn("created_at", "text", (c) => c.notNull())
				.addColumn("last_login_at", "text", (c) => c.notNull())
				.addUniqueConstraint("users_identity", ["issuer", "subject"])
				.execute();

			await db.schema
				.createTable("instance")
				.addColumn("key", "text", (c) => c.primaryKey())
				.addColumn("value", "text", (c) => c.notNull())
				.execute();

			await db.schema
				.alterTable("habits")
				.addColumn("user_id", "text", (c) => c.notNull().defaultTo("local"))
				.execute();
			await db.schema
				.createIndex("habits_user_idx")
				.on("habits")
				.column("user_id")
				.execute();

			await db.schema
				.createTable("debriefs_v3")
				.addColumn("user_id", "text", (c) => c.notNull())
				.addColumn("date", "text", (c) => c.notNull())
				.addColumn("mission", "text")
				.addColumn("wins", "text")
				.addColumn("losses", "text")
				.addColumn("ownership", "text")
				.addColumn("adjust", "text")
				.addColumn("rating", "integer")
				.addColumn("field_times", "text", (c) => c.notNull().defaultTo("{}"))
				.addColumn("updated_at", "text", (c) => c.notNull())
				.addPrimaryKeyConstraint("debriefs_pk", ["user_id", "date"])
				.execute();
			await sql`insert into debriefs_v3 (user_id, date, mission, wins, losses, ownership, adjust, rating, field_times, updated_at)
				select 'local', date, mission, wins, losses, ownership, adjust, rating, field_times, updated_at from debriefs`.execute(
				db,
			);
			await db.schema.dropTable("debriefs").execute();
			await db.schema.alterTable("debriefs_v3").renameTo("debriefs").execute();

			await db.schema
				.createTable("settings_v3")
				.addColumn("user_id", "text", (c) => c.notNull())
				.addColumn("key", "text", (c) => c.notNull())
				.addColumn("value", "text", (c) => c.notNull())
				.addPrimaryKeyConstraint("settings_pk", ["user_id", "key"])
				.execute();
			await sql`insert into settings_v3 (user_id, key, value) select 'local', key, value from settings`.execute(
				db,
			);
			await db.schema.dropTable("settings").execute();
			await db.schema.alterTable("settings_v3").renameTo("settings").execute();
		},
	},
};

export const migrationProvider: MigrationProvider = {
	async getMigrations() {
		return migrations;
	},
};
