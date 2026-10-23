import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
	CompoundingChart,
	HabitConsistencyChart,
	RatingChart,
	ScoreTrendChart,
	WeekdayChart,
} from "#/components/charts";
import { formatShort, WEEKDAYS_SHORT } from "#/lib/dates";
import { dayQueries, useStats } from "#/lib/queries";
import { PILLAR_META, type StatsRange } from "#/lib/schemas";
import { preload } from "#/lib/sync";
import { useUi } from "#/stores/ui";

export const Route = createFileRoute("/_app/progress")({
	// Stats are computed on the device from the local copy, so they work offline.
	loader: ({ context }) => preload(context.queryClient, ...dayQueries()),
	component: ProgressPage,
});

const RANGES: { value: StatsRange; label: string }[] = [
	{ value: 30, label: "30 days" },
	{ value: 90, label: "90 days" },
	{ value: 365, label: "1 year" },
];

const pct = (v: number) => `${Math.round(v * 100)}%`;

function ProgressPage() {
	const range = useUi((s) => s.statsRange);
	const setRange = useUi((s) => s.setStatsRange);
	const stats = useStats(range);

	return (
		<div className="space-y-8">
			<header className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p className="eyebrow">Scoreboard</p>
					<h1 className="headline mt-2 text-3xl sm:text-4xl">Progress</h1>
					<p className="mt-2 max-w-xl text-ink-2 text-sm">
						The scoreboard doesn't lie. Small wins, repeated, compound into the
						person you're becoming.
					</p>
				</div>
				<fieldset className="inline-flex rounded-lg border border-line bg-surface p-1">
					<legend className="sr-only">Date range</legend>
					{RANGES.map((r) => (
						<button
							key={r.value}
							type="button"
							aria-pressed={range === r.value}
							onClick={() => setRange(r.value)}
							className={`rounded-md px-3 py-1.5 font-medium text-sm ${range === r.value ? "bg-ember text-ember-ink" : "text-ink-2 hover:text-ink"}`}
						>
							{r.label}
						</button>
					))}
				</fieldset>
			</header>

			{stats.habits.length === 0 ? (
				<p className="card p-8 text-center text-muted">
					Nothing to measure yet.{" "}
					<Link to="/habits/new" className="text-ember underline">
						Create a habit
					</Link>{" "}
					and log a few days.
				</p>
			) : (
				<div className="space-y-6">
					<section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
						<Kpi
							label="Consistency"
							value={pct(stats.overall)}
							note={`over ${range} days`}
						/>
						<Kpi
							label="Perfect days"
							value={String(stats.perfectDays)}
							note="every rep done"
						/>
						<Kpi
							label="Longest active streak"
							value={String(Math.max(0, ...stats.habits.map((h) => h.current)))}
							note={
								stats.habits.slice().sort((a, b) => b.current - a.current)[0]
									?.name ?? ""
							}
						/>
						<Kpi
							label="Compounding"
							value={`${(stats.compounding.at(-1)?.actual ?? 1).toFixed(2)}×`}
							note={`ideal ${(stats.compounding.at(-1)?.ideal ?? 1).toFixed(2)}×`}
						/>
					</section>

					<Panel
						title="Daily score"
						subtitle="Shaded: each day's score. Line: 7-day average. Dashed: 80% — a won day."
					>
						<ScoreTrendChart series={stats.series} />
					</Panel>

					<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
						<Panel
							title="1% better"
							subtitle="Strong days (≥80%) compound you up 1%; weak days (<50%) decay you 1%."
							legend={
								<div className="flex gap-4 text-ink-2 text-xs">
									<LegendSwatch color="var(--ember)" label="You" />
									<LegendSwatch
										color="var(--muted)"
										label="1% every day"
										dashed
									/>
								</div>
							}
						>
							<CompoundingChart data={stats.compounding} />
						</Panel>
						<Panel
							title="Day of week"
							subtitle="Where is the weak link in your week?"
						>
							<WeekdayChart weekdays={stats.weekdays} />
						</Panel>
					</div>

					<Panel
						title="Consistency by habit"
						subtitle="Full rep = 100%, two-minute version = 50%."
					>
						<HabitConsistencyChart habits={stats.habits} />
						<details className="mt-4">
							<summary className="eyebrow cursor-pointer hover:text-ink">
								View as table
							</summary>
							<table className="mt-3 w-full text-left text-sm">
								<thead className="text-muted text-xs uppercase">
									<tr>
										<th className="py-2 font-medium">Habit</th>
										<th className="hidden font-medium sm:table-cell">Pillar</th>
										<th className="text-right font-medium">Consistency</th>
										<th className="text-right font-medium">Streak</th>
										<th className="text-right font-medium">Best</th>
									</tr>
								</thead>
								<tbody className="font-mono tabular-nums">
									{stats.habits.map((h) => (
										<tr key={h.id} className="border-line border-t">
											<td className="py-2 font-sans wrap-anywhere">{h.name}</td>
											<td className="hidden font-sans text-muted sm:table-cell">
												{PILLAR_META[h.pillar].label}
											</td>
											<td className="text-right">{pct(h.rate)}</td>
											<td className="text-right">{h.current}</td>
											<td className="text-right">{h.best}</td>
										</tr>
									))}
								</tbody>
							</table>
						</details>
					</Panel>

					<Panel
						title="Six months of reps"
						subtitle="Don't break the chain. Darker = stronger day."
					>
						<Heatmap cells={stats.heatmap} />
					</Panel>

					{stats.ratings.length > 1 && (
						<Panel
							title="Discipline rating"
							subtitle="Your own 1–10 rating from evening debriefs."
						>
							<RatingChart ratings={stats.ratings} />
						</Panel>
					)}
				</div>
			)}
		</div>
	);
}

function Kpi({
	label,
	value,
	note,
}: {
	label: string;
	value: string;
	note: string;
}) {
	return (
		<div className="card p-4">
			<div className="eyebrow text-[10px]">{label}</div>
			<div className="mt-1.5 font-black font-mono text-3xl tabular-nums">
				{value}
			</div>
			<div className="mt-0.5 truncate text-muted text-xs">{note}</div>
		</div>
	);
}

function Panel({
	title,
	subtitle,
	legend,
	children,
}: {
	title: string;
	subtitle: string;
	legend?: ReactNode;
	children: ReactNode;
}) {
	return (
		<section className="card p-5 text-ink-2">
			<header className="mb-4 flex flex-wrap items-start justify-between gap-2">
				<div>
					<h2 className="font-bold text-ink uppercase tracking-wider">
						{title}
					</h2>
					<p className="text-muted text-xs">{subtitle}</p>
				</div>
				{legend}
			</header>
			{children}
		</section>
	);
}

function LegendSwatch({
	color,
	label,
	dashed = false,
}: {
	color: string;
	label: string;
	dashed?: boolean;
}) {
	return (
		<span className="flex items-center gap-1.5">
			<svg width="18" height="4" aria-hidden="true">
				<line
					x1="0"
					y1="2"
					x2="18"
					y2="2"
					stroke={color}
					strokeWidth="2.5"
					strokeDasharray={dashed ? "4 3" : undefined}
				/>
			</svg>
			{label}
		</span>
	);
}

/** Sequential single-hue scale: surface → ember in five steps. */
function heatColor(rate: number | null) {
	if (rate === null) return "transparent";
	if (rate === 0) return "var(--surface-3)";
	const step = Math.min(4, Math.floor(rate * 4.999));
	const mix = [25, 45, 65, 85, 100][step];
	return `color-mix(in oklab, var(--ember) ${mix}%, var(--surface-3))`;
}

function Heatmap({
	cells,
}: {
	cells: { date: string; rate: number | null; col: number; row: number }[];
}) {
	const cols = Math.max(...cells.map((c) => c.col)) + 1;
	return (
		<div className="overflow-x-auto">
			<div className="flex gap-2">
				<div className="grid grid-rows-7 gap-[3px] pt-px font-mono text-[9px] text-muted">
					{WEEKDAYS_SHORT.map((d, i) => (
						<span key={d} className="h-3 leading-3">
							{i % 2 ? d : ""}
						</span>
					))}
				</div>
				<div
					className="grid grid-flow-col grid-rows-7 gap-[3px]"
					style={{ gridTemplateColumns: `repeat(${cols}, 12px)` }}
					role="img"
					aria-label="Daily score heatmap for the last 26 weeks"
				>
					{cells.map((c) => (
						<div
							key={c.date}
							title={`${formatShort(c.date)}: ${c.rate === null ? "off duty" : pct(c.rate)}`}
							className="size-3 rounded-[3px] border border-line/40"
							style={{
								gridColumn: c.col + 1,
								gridRow: c.row + 1,
								background: heatColor(c.rate),
							}}
						/>
					))}
				</div>
			</div>
			<div className="mt-3 flex items-center gap-1.5 font-mono text-[10px] text-muted">
				Less
				{[0, 0.2, 0.45, 0.7, 1].map((r) => (
					<span
						key={r}
						className="size-3 rounded-[3px]"
						style={{ background: heatColor(r) }}
					/>
				))}
				More
			</div>
		</div>
	);
}
