import { addDays, dateRange, diffDays, type ISODate, weekday } from "./dates";
import type { Pillar } from "./schemas";

/** Domain types shared by the server functions and the UI. */

export interface Habit {
	id: string;
	name: string;
	identity: string | null;
	pillar: Pillar;
	cueTime: string | null;
	cueLocation: string | null;
	stackAfter: string | null;
	twoMinute: string | null;
	kind: "check" | "count";
	target: number;
	unit: string | null;
	schedule: number[];
	sortOrder: number;
	/** Local day the habit started counting. */
	startDate: ISODate;
	/** Local day the habit was archived; it no longer counts from then on. */
	archivedAt: ISODate | null;
}

export interface HabitLog {
	habitId: string;
	date: ISODate;
	value: number;
	minimum: boolean;
	note: string | null;
}

export type LogStatus = "done" | "minimum" | "partial" | "none";

export function logStatus(
	habit: Pick<Habit, "target">,
	log?: HabitLog,
): LogStatus {
	if (!log) return "none";
	if (log.minimum) return "minimum";
	if (log.value >= habit.target) return "done";
	if (log.value > 0) return "partial";
	return "none";
}

/**
 * Credit toward the daily score. Full reps earn full credit; the two-minute
 * version earns half — you showed up, which is what keeps the identity alive.
 */
export function logCredit(
	habit: Pick<Habit, "target">,
	log?: HabitLog,
): number {
	const status = logStatus(habit, log);
	if (status === "done") return 1;
	if (status === "minimum") return 0.5;
	if (status === "partial" && log) return 0.5 * (log.value / habit.target);
	return 0;
}

/** "Showing up" keeps the chain alive: anything logged counts. */
export function showedUp(habit: Pick<Habit, "target">, log?: HabitLog) {
	return logStatus(habit, log) !== "none";
}

export function isScheduled(habit: Habit, date: ISODate) {
	if (date < habit.startDate) return false;
	if (habit.archivedAt && date >= habit.archivedAt) return false;
	return habit.schedule.includes(weekday(date));
}

type LogIndex = Map<string, HabitLog>;
const key = (habitId: string, date: ISODate) => `${habitId}|${date}`;

export function indexLogs(logs: readonly HabitLog[]): LogIndex {
	return new Map(logs.map((l) => [key(l.habitId, l.date), l]));
}

export interface StreakInfo {
	current: number;
	best: number;
	/** The most recent scheduled day before `asOf` was missed. */
	missedLast: boolean;
	/** Two scheduled days in a row were missed. Never miss twice. */
	missedTwice: boolean;
}

export function streakInfo(
	habit: Habit,
	index: LogIndex,
	asOf: ISODate,
): StreakInfo {
	const shown = (d: ISODate) => showedUp(habit, index.get(key(habit.id, d)));

	// Current streak: walk back from asOf. Today doesn't break the chain until
	// it's over, so an unlogged `asOf` is skipped rather than counted as a miss.
	let current = 0;
	const floor = habit.startDate;
	for (let d = asOf; d >= floor; d = addDays(d, -1)) {
		if (!isScheduled(habit, d)) continue;
		if (shown(d)) current++;
		else if (d !== asOf) break;
	}

	let prevMissed = 0;
	for (
		let d = addDays(asOf, -1), seen = 0;
		d >= floor && seen < 2;
		d = addDays(d, -1)
	) {
		if (!isScheduled(habit, d)) continue;
		seen++;
		if (shown(d)) break;
		prevMissed++;
	}

	let best = 0;
	let run = 0;
	for (const d of dateRange(floor, asOf)) {
		if (!isScheduled(habit, d)) continue;
		if (shown(d)) {
			run++;
			best = Math.max(best, run);
		} else if (d !== asOf) {
			run = 0;
		}
	}

	return {
		current,
		best,
		missedLast: prevMissed >= 1,
		missedTwice: prevMissed >= 2,
	};
}

export interface DaySummary {
	date: ISODate;
	scheduled: number;
	credit: number;
	completed: number;
	rate: number;
}

export function daySummary(
	habits: readonly Habit[],
	index: LogIndex,
	date: ISODate,
): DaySummary {
	let scheduled = 0;
	let credit = 0;
	let completed = 0;
	for (const h of habits) {
		if (!isScheduled(h, date)) continue;
		scheduled++;
		const log = index.get(key(h.id, date));
		credit += logCredit(h, log);
		if (logStatus(h, log) === "done") completed++;
	}
	return {
		date,
		scheduled,
		credit,
		completed,
		rate: scheduled ? credit / scheduled : 0,
	};
}

export interface HabitStat {
	id: string;
	name: string;
	pillar: Pillar;
	rate: number;
	scheduled: number;
	current: number;
	best: number;
}

export interface Stats {
	start: ISODate;
	end: ISODate;
	series: (DaySummary & { avg7: number })[];
	habits: HabitStat[];
	weekdays: { day: string; rate: number }[];
	pillars: { pillar: Pillar; rate: number }[];
	compounding: { date: ISODate; actual: number; ideal: number }[];
	overall: number;
	perfectDays: number;
	totalReps: number;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Everything the Progress page needs, computed from raw rows so it is easy to
 * unit test and doesn't depend on SQL window functions.
 */
export function buildStats(
	habits: readonly Habit[],
	logs: readonly HabitLog[],
	end: ISODate,
	days: number,
): Stats {
	const index = indexLogs(logs);
	const start = addDays(end, -(days - 1));
	const range = dateRange(start, end);
	const summaries = range.map((d) => daySummary(habits, index, d));

	const series = summaries.map((s, i) => {
		const window = summaries
			.slice(Math.max(0, i - 6), i + 1)
			.filter((w) => w.scheduled);
		const avg7 = window.length
			? window.reduce((a, w) => a + w.rate, 0) / window.length
			: 0;
		return { ...s, avg7 };
	});

	const active = summaries.filter((s) => s.scheduled > 0);
	const overall = active.length
		? active.reduce((a, s) => a + s.credit, 0) /
			active.reduce((a, s) => a + s.scheduled, 0)
		: 0;

	const habitStats: HabitStat[] = habits
		.filter((h) => !h.archivedAt)
		.map((h) => {
			let scheduled = 0;
			let credit = 0;
			for (const d of range) {
				if (!isScheduled(h, d)) continue;
				scheduled++;
				credit += logCredit(h, index.get(key(h.id, d)));
			}
			const streak = streakInfo(h, index, end);
			return {
				id: h.id,
				name: h.name,
				pillar: h.pillar,
				rate: scheduled ? credit / scheduled : 0,
				scheduled,
				current: streak.current,
				best: streak.best,
			};
		});

	const weekdays = DAY_NAMES.map((day, i) => {
		const ds = active.filter((s) => weekday(s.date) === i);
		const sched = ds.reduce((a, s) => a + s.scheduled, 0);
		return {
			day,
			rate: sched ? ds.reduce((a, s) => a + s.credit, 0) / sched : 0,
		};
	});

	const pillarTotals = new Map<Pillar, { credit: number; scheduled: number }>();
	for (const h of habits) {
		const t = pillarTotals.get(h.pillar) ?? { credit: 0, scheduled: 0 };
		for (const d of range) {
			if (!isScheduled(h, d)) continue;
			t.scheduled++;
			t.credit += logCredit(h, index.get(key(h.id, d)));
		}
		pillarTotals.set(h.pillar, t);
	}
	const pillars = [...pillarTotals.entries()]
		.filter(([, t]) => t.scheduled > 0)
		.map(([pillar, t]) => ({ pillar, rate: t.credit / t.scheduled }));

	// Atomic Habits' 1% rule: a strong day compounds you up 1%, a weak day
	// decays you 1%, an average day holds. Plotted against the ideal curve.
	let actual = 1;
	let n = 0;
	const compounding = summaries.map((s) => {
		if (s.scheduled > 0) {
			n++;
			if (s.rate >= 0.8) actual *= 1.01;
			else if (s.rate < 0.5) actual *= 0.99;
		}
		return { date: s.date, actual, ideal: 1.01 ** n };
	});

	return {
		start,
		end,
		series,
		habits: habitStats.sort((a, b) => b.rate - a.rate),
		weekdays,
		pillars,
		compounding,
		overall,
		perfectDays: active.filter((s) => s.rate >= 0.999).length,
		totalReps: logs.filter(
			(l) => l.date >= start && l.date <= end && (l.value > 0 || l.minimum),
		).length,
	};
}

/** Heatmap cells for the last `weeks` weeks ending on `end`. */
export function heatmap(
	habits: readonly Habit[],
	logs: readonly HabitLog[],
	end: ISODate,
	weeks = 26,
) {
	const index = indexLogs(logs);
	// Align to a Sunday so columns are full weeks.
	const lastSunday = addDays(end, -weekday(end));
	const start = addDays(lastSunday, -(weeks - 1) * 7);
	return dateRange(start, end).map((d) => {
		const s = daySummary(habits, index, d);
		return {
			date: d,
			rate: s.scheduled ? s.rate : null,
			col: Math.floor(diffDays(d, start) / 7),
			row: weekday(d),
		};
	});
}
