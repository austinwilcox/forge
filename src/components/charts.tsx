import { areaY, barX, barY, defineChart, lineY, ruleY } from "@tanstack/charts";
import { crosshair } from "@tanstack/charts/crosshair";
import { Chart } from "@tanstack/charts/react";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { scalePoint } from "@tanstack/charts/scales/point";
import { tooltip } from "@tanstack/charts/tooltip";
import { useMemo } from "react";
import { formatShort } from "#/lib/dates";
import type { Stats } from "#/lib/habits";

/**
 * Chart conventions: one hue (ember) for data, neutral ink for reference
 * lines, recessive grids, percent axes fixed to 0–100% so days are comparable.
 */
const pct = (v: number) => `${Math.round(v * 100)}%`;
const EMBER = "var(--ember)";
const REFERENCE = "var(--muted)";

export function ScoreTrendChart({ series }: { series: Stats["series"] }) {
	const definition = useMemo(
		() =>
			defineChart({
				marks: [
					areaY(series, {
						x: "date",
						y: "rate",
						fill: EMBER,
						fillOpacity: 0.16,
					}),
					ruleY([0.8], {
						stroke: REFERENCE,
						strokeDasharray: "4 4",
						strokeWidth: 1,
					}),
					lineY(series, {
						x: "date",
						y: "avg7",
						stroke: EMBER,
						strokeWidth: 2,
					}),
					crosshair({ x: true, y: false }),
				],
				scales: {
					x: {
						scale: () => scalePoint<string>().padding(0.1),
						axis: { ticks: { format: formatShort, size: 0 }, line: false },
					},
					y: {
						scale: scaleLinear().domain([0, 1]),
						grid: { strokeOpacity: 0.12 },
						axis: { ticks: { format: pct, count: 5, size: 0 }, line: false },
					},
				},
				focus: "nearest-x",
				maxFocusDistance: Number.POSITIVE_INFINITY,
				tooltip: {
					use: tooltip,
					format: (p) =>
						`${formatShort(p.datum.date)}\nScore ${pct(p.datum.rate)} · 7-day ${pct(p.datum.avg7)}\n${p.datum.completed}/${p.datum.scheduled} complete`,
				},
				svgAnimation: true,
			}),
		[series],
	);
	return (
		<Chart
			definition={definition}
			height={260}
			ariaLabel="Daily discipline score with 7-day average"
		/>
	);
}

export function CompoundingChart({ data }: { data: Stats["compounding"] }) {
	const definition = useMemo(
		() =>
			defineChart({
				marks: [
					ruleY([1], { stroke: REFERENCE, strokeOpacity: 0.4, strokeWidth: 1 }),
					lineY(data, {
						x: "date",
						y: "ideal",
						stroke: REFERENCE,
						strokeWidth: 1.5,
						strokeDasharray: "5 4",
					}),
					lineY(data, {
						x: "date",
						y: "actual",
						stroke: EMBER,
						strokeWidth: 2.5,
					}),
					crosshair({ x: true, y: false }),
				],
				scales: {
					x: {
						scale: () => scalePoint<string>().padding(0.1),
						axis: { ticks: { format: formatShort, size: 0 }, line: false },
					},
					y: {
						scale: scaleLinear,
						nice: true,
						grid: { strokeOpacity: 0.12 },
						axis: {
							ticks: { format: (v: number) => `${v.toFixed(2)}×`, size: 0 },
							line: false,
						},
					},
				},
				focus: "nearest-x",
				maxFocusDistance: Number.POSITIVE_INFINITY,
				tooltip: {
					use: tooltip,
					format: (p) =>
						`${formatShort(p.datum.date)}\nYou ${p.datum.actual.toFixed(3)}× · Ideal ${p.datum.ideal.toFixed(3)}×`,
				},
			}),
		[data],
	);
	return (
		<Chart
			definition={definition}
			height={240}
			ariaLabel="Compounding index: actual versus 1% better every day"
		/>
	);
}

export function HabitConsistencyChart({ habits }: { habits: Stats["habits"] }) {
	const definition = useMemo(
		() =>
			defineChart({
				marks: [
					barX(habits, {
						x: "rate",
						y: "name",
						fill: EMBER,
						radius: 4,
						maxThickness: 18,
					}),
				],
				scales: {
					x: {
						scale: scaleLinear().domain([0, 1]),
						grid: { strokeOpacity: 0.12 },
						axis: { ticks: { format: pct, count: 5, size: 0 }, line: false },
					},
					y: {
						scale: () => scaleBand<string>().padding(0.25),
						axis: { ticks: { size: 0 }, line: false },
					},
				},
				tooltip: {
					use: tooltip,
					format: (p) =>
						`${p.datum.name}\n${pct(p.datum.rate)} consistency · streak ${p.datum.current} (best ${p.datum.best})`,
				},
				svgAnimation: true,
			}),
		[habits],
	);
	return (
		<Chart
			definition={definition}
			height={Math.max(120, habits.length * 38 + 40)}
			ariaLabel="Consistency by habit"
		/>
	);
}

export function WeekdayChart({ weekdays }: { weekdays: Stats["weekdays"] }) {
	const definition = useMemo(
		() =>
			defineChart({
				marks: [
					barY(weekdays, {
						x: "day",
						y: "rate",
						fill: EMBER,
						radius: 4,
						maxThickness: 36,
					}),
				],
				scales: {
					x: {
						scale: () => scaleBand<string>().padding(0.3),
						axis: { ticks: { size: 0 }, line: false },
					},
					y: {
						scale: scaleLinear().domain([0, 1]),
						grid: { strokeOpacity: 0.12 },
						axis: { ticks: { format: pct, count: 3, size: 0 }, line: false },
					},
				},
				tooltip: {
					use: tooltip,
					format: (p) => `${p.datum.day}: ${pct(p.datum.rate)}`,
				},
				svgAnimation: true,
			}),
		[weekdays],
	);
	return (
		<Chart
			definition={definition}
			height={200}
			ariaLabel="Average score by day of week"
		/>
	);
}

export function RatingChart({
	ratings,
}: {
	ratings: { date: string; rating: number }[];
}) {
	const definition = useMemo(
		() =>
			defineChart({
				marks: [
					lineY(ratings, {
						x: "date",
						y: "rating",
						stroke: EMBER,
						strokeWidth: 2,
						points: true,
					}),
				],
				scales: {
					x: {
						scale: () => scalePoint<string>().padding(0.2),
						axis: { ticks: { format: formatShort, size: 0 }, line: false },
					},
					y: {
						scale: scaleLinear().domain([0, 10]),
						grid: { strokeOpacity: 0.12 },
						axis: { ticks: { count: 3, size: 0 }, line: false },
					},
				},
				tooltip: {
					use: tooltip,
					format: (p) => `${formatShort(p.datum.date)}: ${p.datum.rating}/10`,
				},
			}),
		[ratings],
	);
	return (
		<Chart
			definition={definition}
			height={200}
			ariaLabel="Self-rated discipline from debriefs"
		/>
	);
}
