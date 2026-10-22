import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import SQLite from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";
import { Migrator } from "kysely/migration";
import { migrationProvider } from "./migrations";
import type { Database } from "./schema";

/**
 * Single shared Kysely instance. SQLite is a file on disk, so a self-hosted
 * install only needs a persistent volume mounted at the DATABASE_PATH dir.
 */
let dbPromise: Promise<Kysely<Database>> | undefined;

export function databasePath() {
	return resolve(process.env.DATABASE_PATH ?? "./data/forge.db");
}

export function createDb(path: string) {
	if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
	const sqlite = new SQLite(path);
	sqlite.pragma("journal_mode = WAL");
	sqlite.pragma("foreign_keys = ON");
	sqlite.pragma("busy_timeout = 5000");
	return new Kysely<Database>({
		dialect: new SqliteDialect({ database: sqlite }),
	});
}

export async function migrate(db: Kysely<Database>) {
	const migrator = new Migrator({ db, provider: migrationProvider });
	const { error, results } = await migrator.migrateToLatest();
	for (const r of results ?? []) {
		if (r.status === "Success") console.log(`[db] applied ${r.migrationName}`);
		if (r.status === "Error") console.error(`[db] failed ${r.migrationName}`);
	}
	if (error) throw error;
}

export function getDb(): Promise<Kysely<Database>> {
	dbPromise ??= (async () => {
		const db = createDb(databasePath());
		await migrate(db);
		return db;
	})().catch((err) => {
		dbPromise = undefined;
		throw err;
	});
	return dbPromise;
}
