import { describe, expect, it } from "vitest";
import { addDays } from "./dates";
import {
	buildStats,
	daySummary,
	type Habit,
	type HabitLog,
	indexLogs,
	logCredit,
	streakInfo,
} from "./habits";

const habit = (over: Partial<Habit> = {}): Habit => ({
	id: "h1",
	name: "Train",
	identity: null,
	pillar: "body",
	cueTime: null,
	cueLocation: null,
	stackAfter: null,
	twoMinute: null,
	kind: "check",
	target: 1,
	unit: null,
	schedule: [0, 1, 2, 3, 4, 5, 6],
	sortOrder: 0,
	startDate: "2026-01-01",
	archivedAt: null,
	...over,
});

const log = (
	date: string,
	value = 1,
	minimum = false,
	habitId = "h1",
): HabitLog => ({ habitId, date, value, minimum, note: null });

describe("logCredit", () => {
	it("gives full, half and proportional credit", () => {
		const h = habit({ kind: "count", target: 20 });
		expect(logCredit(h, log("2026-01-01", 20))).toBe(1);
		expect(logCredit(h, log("2026-01-01", 0, true))).toBe(0.5);
		expect(logCredit(h, log("2026-01-01", 10))).toBe(0.25);
		expect(logCredit(h, undefined)).toBe(0);
	});
});

describe("streakInfo", () => {
	const h = habit();
	it("counts consecutive days and doesn't break on an unlogged today", () => {
		const logs = [log("2026-01-01"), log("2026-01-02"), log("2026-01-03")];
		const s = streakInfo(h, indexLogs(logs), "2026-01-04");
		expect(s.current).toBe(3);
		expect(s.best).toBe(3);
		expect(s.missedLast).toBe(false);
	});

	it("flags never-miss-twice after one miss and resets the streak", () => {
		const logs = [log("2026-01-01"), log("2026-01-02")];
		const s = streakInfo(h, indexLogs(logs), "2026-01-04");
		expect(s.current).toBe(0);
		expect(s.best).toBe(2);
		expect(s.missedLast).toBe(true);
		expect(s.missedTwice).toBe(false);
	});

	it("flags two consecutive misses", () => {
		const s = streakInfo(h, indexLogs([log("2026-01-01")]), "2026-01-04");
		expect(s.missedTwice).toBe(true);
	});

	it("skips unscheduled days", () => {
		// 2026-01-03 is a Saturday, 2026-01-04 a Sunday.
		const weekdays = habit({ schedule: [1, 2, 3, 4, 5] });
		const logs = [log("2026-01-01"), log("2026-01-02"), log("2026-01-05")];
		expect(streakInfo(weekdays, indexLogs(logs), "2026-01-05").current).toBe(3);
	});

	it("counts the two-minute version as showing up", () => {
		const logs = [
			log("2026-01-01"),
			log("2026-01-02", 0, true),
			log("2026-01-03"),
		];
		expect(streakInfo(h, indexLogs(logs), "2026-01-03").current).toBe(3);
	});
});

describe("daySummary / buildStats", () => {
	it("ignores habits before their start date and after archive", () => {
		const habits = [
			habit(),
			habit({ id: "h2", startDate: "2026-01-05" }),
			habit({ id: "h3", archivedAt: "2026-01-02" }),
		];
		const s = daySummary(habits, indexLogs([log("2026-01-03")]), "2026-01-03");
		expect(s.scheduled).toBe(1);
		expect(s.rate).toBe(1);
	});

	it("compounds 1% on strong days and decays on weak days", () => {
		const end = "2026-01-10";
		const logs = Array.from({ length: 5 }, (_, i) =>
			log(addDays("2026-01-01", i)),
		);
		const stats = buildStats([habit()], logs, end, 10);
		const last = stats.compounding.at(-1);
		expect(last?.ideal).toBeCloseTo(1.01 ** 10);
		expect(last?.actual).toBeCloseTo(1.01 ** 5 * 0.99 ** 5);
		expect(stats.perfectDays).toBe(5);
		expect(stats.overall).toBeCloseTo(0.5);
	});
});
