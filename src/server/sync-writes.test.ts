import { beforeEach, describe, expect, it } from "vitest";
import { debriefInput, logInput } from "#/lib/schemas";
import { createDb, migrate } from "./db/client";
import { loadHabits, loadLogs } from "./repo";
import { clientStamp, mergeDebrief, writeLog } from "./sync-writes";

const T = (min: number) =>
	new Date(Date.UTC(2026, 9, 22, 12, min)).toISOString();
const DATE = "2026-10-22";

let db: ReturnType<typeof createDb>;

async function habit(id: string, userId: string) {
	await db
		.insertInto("habits")
		.values({
			id,
			user_id: userId,
			name: id,
			pillar: "body",
			kind: "check",
			target: 1,
			schedule: "[0,1,2,3,4,5,6]",
			sort_order: 0,
			start_date: "2026-01-01",
			identity: null,
			cue_time: null,
			cue_location: null,
			stack_after: null,
			two_minute: null,
			unit: null,
			archived_at: null,
		})
		.execute();
}

const log = (habitId: string, value: number, at: string) =>
	logInput.parse({ habitId, date: DATE, value, updatedAt: at });

beforeEach(async () => {
	db = createDb(":memory:");
	await migrate(db);
	await habit("h-alice", "alice");
	await habit("h-bob", "bob");
});

describe("writeLog (last write wins)", () => {
	it("keeps the newer write when an older one arrives late", async () => {
		await writeLog(db, "alice", log("h-alice", 0, T(30))); // laptop: undo at 12:30
		await writeLog(db, "alice", log("h-alice", 1, T(10))); // phone: offline "done" from 12:10 syncs later
		const [row] = await loadLogs(db, "alice", DATE, DATE);
		expect(row.value).toBe(0);
	});

	it("applies a newer write over an older one", async () => {
		await writeLog(db, "alice", log("h-alice", 1, T(10)));
		await writeLog(db, "alice", log("h-alice", 0, T(30)));
		expect((await loadLogs(db, "alice", DATE, DATE))[0].value).toBe(0);
	});

	it("refuses to write to another tenant's habit", async () => {
		expect(await writeLog(db, "bob", log("h-alice", 1, T(10)))).toBe(false);
		expect(await loadLogs(db, "alice", DATE, DATE)).toHaveLength(0);
	});
});

describe("tenant isolation", () => {
	it("only returns the requesting user's habits and logs", async () => {
		await writeLog(db, "alice", log("h-alice", 1, T(1)));
		await writeLog(db, "bob", log("h-bob", 1, T(1)));
		expect((await loadHabits(db, "alice")).map((h) => h.id)).toEqual([
			"h-alice",
		]);
		expect(
			(await loadLogs(db, "bob", DATE, DATE)).map((l) => l.habitId),
		).toEqual(["h-bob"]);
	});
});

describe("mergeDebrief (per-field last write wins)", () => {
	const patch = (fields: Record<string, unknown>, at: string) =>
		debriefInput.parse({ date: DATE, ...fields, updatedAt: at });
	const read = (userId: string) =>
		db
			.selectFrom("debriefs")
			.selectAll()
			.where("user_id", "=", userId)
			.executeTakeFirstOrThrow();

	it("keeps an early offline mission when a later debrief syncs first", async () => {
		await mergeDebrief(
			db,
			"alice",
			patch({ wins: "Trained", ownership: "Slept late", rating: 7 }, T(50)),
		);
		await mergeDebrief(db, "alice", patch({ mission: "Ship it" }, T(5)));
		const row = await read("alice");
		expect(row).toMatchObject({
			mission: "Ship it",
			wins: "Trained",
			ownership: "Slept late",
			rating: 7,
		});
	});

	it("an older edit of the same field loses", async () => {
		await mergeDebrief(db, "alice", patch({ mission: "New" }, T(40)));
		await mergeDebrief(db, "alice", patch({ mission: "Old" }, T(20)));
		expect((await read("alice")).mission).toBe("New");
	});

	it("keeps tenants' debriefs for the same day apart", async () => {
		await mergeDebrief(db, "alice", patch({ mission: "Alice" }, T(1)));
		await mergeDebrief(db, "bob", patch({ mission: "Bob" }, T(1)));
		expect((await read("alice")).mission).toBe("Alice");
		expect((await read("bob")).mission).toBe("Bob");
	});
});

describe("clientStamp", () => {
	it("clamps a device clock that runs ahead of the server", () => {
		expect(clientStamp("2099-01-01T00:00:00.000Z", T(0))).toBe(T(0));
		expect(clientStamp(T(1), T(5))).toBe(T(1));
	});
});
