/**
 * Seeds ~90 days of realistic history so the dashboard has something to show.
 *   pnpm db:seed-demo           # only if the database has no habits
 *   pnpm db:seed-demo --force   # wipe and reseed
 */
import { randomUUID } from "node:crypto";
import { addDays, dateRange, today, weekday } from "../src/lib/dates";
import { STARTER_PROTOCOL } from "../src/lib/principles";
import { createDb, databasePath, migrate } from "../src/server/db/client";

const DAYS = 90;
/** Seed into the single-tenant user, or another user id: --user=<id>. */
const USER = process.argv.find((a) => a.startsWith("--user="))?.slice(7) ?? "local";
const force = process.argv.includes("--force");
const db = createDb(databasePath());
await migrate(db);

const existing = await db.selectFrom("habits").select("id").where("user_id", "=", USER).execute();
if (existing.length && !force) {
	console.log(`Database already has ${existing.length} habits. Use --force to wipe and reseed.`);
	process.exit(0);
}
// Logs go with their habits (ON DELETE CASCADE).
for (const t of ["debriefs", "habits", "settings"] as const) await db.deleteFrom(t).where("user_id", "=", USER).execute();

// Deterministic PRNG so demos look the same every time.
let seed = 42;
const rand = () => {
	seed = (seed * 1664525 + 1013904223) % 4294967296;
	return seed / 4294967296;
};

const end = today();
const start = addDays(end, -(DAYS - 1));
const habits = STARTER_PROTOCOL.map((h, i) => ({ ...h, id: randomUUID(), order: i }));

await db
	.insertInto("habits")
	.values(
		habits.map((h) => ({
			id: h.id,
			user_id: USER,
			name: h.name,
			identity: h.identity,
			pillar: h.pillar,
			cue_time: h.cueTime,
			cue_location: h.cueLocation,
			stack_after: h.stackAfter,
			two_minute: h.twoMinute,
			kind: h.kind,
			target: h.target,
			unit: h.unit,
			schedule: JSON.stringify(h.schedule),
			sort_order: h.order,
			start_date: start,
			archived_at: null,
		})),
	)
	.execute();

const base: Record<string, number> = {
	"Wake up at 0500": 0.62,
	Train: 0.7,
	Read: 0.66,
	"Deep work block": 0.6,
	"No alcohol": 0.8,
	"Evening debrief": 0.5,
};

const logs = [];
for (const [i, date] of dateRange(start, addDays(end, -1)).entries()) {
	const progress = i / DAYS; // discipline improves over time
	const weekendDip = [0, 6].includes(weekday(date)) ? -0.12 : 0;
	for (const h of habits) {
		if (!(h.schedule as readonly number[]).includes(weekday(date))) continue;
		const p = Math.min(0.97, base[h.name] + progress * 0.3 + weekendDip);
		const r = rand();
		if (r < p) {
			const value = h.kind === "count" ? Math.round(h.target * (0.9 + rand() * 0.5)) : 1;
			logs.push({ habit_id: h.id, date, value, minimum: 0, note: null, updated_at: new Date().toISOString() });
		} else if (h.twoMinute && r < p + 0.12) {
			logs.push({ habit_id: h.id, date, value: 0, minimum: 1, note: null, updated_at: new Date().toISOString() });
		}
	}
}
for (let i = 0; i < logs.length; i += 200) await db.insertInto("habit_logs").values(logs.slice(i, i + 200)).execute();

// A couple of reps done already today.
for (const h of habits.slice(0, 2)) {
	await db
		.insertInto("habit_logs")
		.values({ habit_id: h.id, date: end, value: h.kind === "count" ? h.target : 1, minimum: 0, note: null, updated_at: new Date().toISOString() })
		.execute();
}

const wins = ["Up at 0500, trained before the house woke up.", "Shipped the feature I'd been avoiding.", "Read 30 pages instead of scrolling.", "Kept my temper in a hard conversation."];
const losses = ["Snoozed twice. Lost the first hour.", "Skipped the deep work block for meetings.", "Phone in the bedroom again.", "Stayed up too late."];
const owns = ["I didn't set the alarm across the room. That's on me.", "I let my calendar run me. I own the schedule.", "I didn't prepare the gym bag the night before.", "I chose comfort over the mission."];
const adjusts = ["Alarm across the room, clothes laid out.", "Block 0800–0930 on the calendar as non-negotiable.", "Phone charges in the kitchen.", "Lights out at 2130."];
const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
const debriefs = dateRange(addDays(end, -40), addDays(end, -1))
	.filter(() => rand() < 0.75)
	.map((date, i) => ({
		user_id: USER,
		date,
		mission: pick(["Finish the quarterly plan", "Hit a new deadlift PR", "Write 1,000 words", "Be fully present at dinner"]),
		wins: pick(wins),
		losses: pick(losses),
		ownership: pick(owns),
		adjust: pick(adjusts),
		rating: Math.min(10, Math.max(3, Math.round(5 + i / 10 + (rand() - 0.5) * 3))),
		updated_at: new Date().toISOString(),
	}));
if (debriefs.length) await db.insertInto("debriefs").values(debriefs).execute();
await db.insertInto("debriefs").values({ user_id: USER, date: end, mission: "Close out the migration plan before noon", updated_at: new Date().toISOString() }).execute();

await db
	.insertInto("settings")
	.values([
		{ user_id: USER, key: "name", value: "Operator" },
		{ user_id: USER, key: "creed", value: "I am disciplined, I own every outcome, and I get 1% better every day." },
	])
	.execute();

console.log(`Seeded ${habits.length} habits, ${logs.length} logs, ${debriefs.length} debriefs into ${databasePath()}`);
await db.destroy();
