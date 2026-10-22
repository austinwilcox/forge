/**
 * Calendar-day helpers. All "days" are plain YYYY-MM-DD strings in the user's
 * local time zone; arithmetic is done in UTC so DST never shifts a day.
 */

export type ISODate = string;

const pad = (n: number) => String(n).padStart(2, "0");

export function toISODate(d: Date): ISODate {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function today(): ISODate {
	return toISODate(new Date());
}

function parseUTC(date: ISODate) {
	const [y, m, d] = date.split("-").map(Number);
	return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(date: ISODate, days: number): ISODate {
	const d = parseUTC(date);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
}

export function weekday(date: ISODate): number {
	return parseUTC(date).getUTCDay();
}

export function diffDays(a: ISODate, b: ISODate): number {
	return Math.round(
		(parseUTC(a).getTime() - parseUTC(b).getTime()) / 86_400_000,
	);
}

/** Inclusive list of days from `start` to `end`. */
export function dateRange(start: ISODate, end: ISODate): ISODate[] {
	const out: ISODate[] = [];
	for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
	return out;
}

export const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatLong(date: ISODate) {
	return parseUTC(date).toLocaleDateString("en-US", {
		weekday: "long",
		month: "long",
		day: "numeric",
		timeZone: "UTC",
	});
}

export function formatShort(date: ISODate) {
	return parseUTC(date).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	});
}

export function dayOfYear(date: ISODate) {
	const d = parseUTC(date);
	return diffDays(date, `${d.getUTCFullYear()}-01-01`) + 1;
}
