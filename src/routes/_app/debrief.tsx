import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Icon } from "#/components/Icon";
import { addDays, formatLong, formatShort, today } from "#/lib/dates";
import { daySummary, indexLogs } from "#/lib/habits";
import { dayQueries, useDay, useOnline, useSaveDebrief } from "#/lib/queries";
import { isoDate } from "#/lib/schemas";
import { preload } from "#/lib/sync";
import type { Debrief } from "#/server/repo";

export const Route = createFileRoute("/_app/debrief")({
	validateSearch: z.object({ date: isoDate.optional() }),
	loaderDeps: ({ search }) => ({ date: search.date ?? today() }),
	loader: ({ context }) => preload(context.queryClient, ...dayQueries()),
	component: DebriefPage,
});

const PROMPTS = [
	{
		name: "wins",
		title: "What went right?",
		hint: "Name the wins. Understand why they worked so you can repeat them.",
	},
	{
		name: "losses",
		title: "What went wrong?",
		hint: "Facts, not feelings. Good — every failure is information.",
	},
	{
		name: "ownership",
		title: "What do I own?",
		hint: "No excuses, no blame. Extreme ownership: what could I have done differently?",
	},
	{
		name: "adjust",
		title: "What will I do differently?",
		hint: "One concrete adjustment for tomorrow. Make it obvious, make it easy.",
	},
] as const;

function DebriefPage() {
	const { date } = Route.useLoaderDeps();
	const day = useDay(date);
	const history = day.debriefs.slice(0, 30);
	const isToday = date === today();
	const summary = daySummary(day.habits, indexLogs(day.logs), date);

	return (
		<div className="grid gap-8 lg:grid-cols-[1fr_260px]">
			<div className="space-y-6">
				<header className="flex flex-wrap items-end justify-between gap-4">
					<div>
						<p className="eyebrow">After-action review · {formatLong(date)}</p>
						<h1 className="headline mt-2 text-3xl sm:text-4xl">Debrief</h1>
						<p className="mt-2 max-w-xl text-ink-2 text-sm">
							Check the ego at the door. Look at the day like a commander
							reviewing an operation.
						</p>
					</div>
					<div className="flex items-center gap-1">
						<Link
							to="/debrief"
							search={{ date: addDays(date, -1) }}
							className="btn-ghost px-2.5"
							aria-label="Previous day"
						>
							<Icon name="chevronLeft" />
						</Link>
						<Link
							to="/debrief"
							search={{ date: addDays(date, 1) }}
							className={`btn-ghost px-2.5 ${isToday ? "pointer-events-none opacity-40" : ""}`}
							aria-label="Next day"
						>
							<Icon name="chevronRight" />
						</Link>
					</div>
				</header>

				<div className="grid grid-cols-3 gap-3">
					<Stat
						label="Score"
						value={`${Math.round(summary.rate * 100)}`}
						accent={summary.rate >= 0.8 ? "text-olive" : "text-ember"}
					/>
					<Stat
						label="Completed"
						value={`${summary.completed}/${summary.scheduled}`}
					/>
					<Stat label="Mission" value={day.debrief?.mission ? "Set" : "—"} />
				</div>
				{day.debrief?.mission && (
					<p className="card border-ember border-l-4 px-5 py-3 text-sm">
						<span className="eyebrow mr-2">Mission</span>
						{day.debrief.mission}
					</p>
				)}

				<DebriefForm key={date} date={date} initial={day.debrief} />
			</div>

			<aside className="space-y-3">
				<h2 className="eyebrow">Recent debriefs</h2>
				{!history?.length && (
					<p className="text-muted text-sm">
						None yet. Tonight is a good night to start.
					</p>
				)}
				<ul className="space-y-1.5">
					{history?.map((d) => (
						<li key={d.date}>
							<Link
								to="/debrief"
								search={{ date: d.date }}
								className={`card block px-3 py-2 text-sm hover:border-ember/60 ${d.date === date ? "border-ember/60" : ""}`}
							>
								<div className="flex items-center justify-between">
									<span className="font-semibold">{formatShort(d.date)}</span>
									{d.rating != null && (
										<span className="font-mono text-ember text-xs">
											{d.rating}/10
										</span>
									)}
								</div>
								{d.ownership && (
									<p className="mt-0.5 truncate text-muted text-xs">
										{d.ownership}
									</p>
								)}
							</Link>
						</li>
					))}
				</ul>
			</aside>
		</div>
	);
}

function Stat({
	label,
	value,
	accent = "",
}: {
	label: string;
	value: string;
	accent?: string;
}) {
	return (
		<div className="card px-4 py-3">
			<div className="eyebrow text-[10px]">{label}</div>
			<div
				className={`mt-1 font-bold font-mono text-xl tabular-nums ${accent}`}
			>
				{value}
			</div>
		</div>
	);
}

type Initial = Debrief | null;

function DebriefForm({ date, initial }: { date: string; initial: Initial }) {
	const save = useSaveDebrief();
	const [savedAt, setSavedAt] = useState<Date | null>(null);
	const online = useOnline();
	const form = useForm({
		defaultValues: {
			rating: initial?.rating ?? null,
			wins: initial?.wins ?? "",
			losses: initial?.losses ?? "",
			ownership: initial?.ownership ?? "",
			adjust: initial?.adjust ?? "",
		} as {
			rating: number | null;
			wins: string;
			losses: string;
			ownership: string;
			adjust: string;
		},
		onSubmit: async ({ value }) => {
			// Fire and forget: queued on this device if the server is unreachable.
			save({ date, ...value });
			setSavedAt(new Date());
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			className="space-y-4"
		>
			<form.Field name="rating">
				{(field) => (
					<fieldset className="card p-5">
						<legend className="sr-only">Discipline rating</legend>
						<div className="mb-3 flex items-baseline justify-between">
							<h2 className="font-bold uppercase tracking-wider">
								Discipline rating
							</h2>
							<span className="text-muted text-xs">
								Be honest. Nobody else sees this.
							</span>
						</div>
						<div className="grid grid-cols-10 gap-1">
							{Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
								<button
									key={n}
									type="button"
									aria-pressed={field.state.value === n}
									onClick={() =>
										field.handleChange(field.state.value === n ? null : n)
									}
									className={`rounded-md border py-2 font-bold font-mono text-sm transition-colors ${
										field.state.value != null && n <= field.state.value
											? "border-ember bg-ember text-ember-ink"
											: "border-line bg-surface-2 text-muted hover:border-muted"
									}`}
								>
									{n}
								</button>
							))}
						</div>
					</fieldset>
				)}
			</form.Field>

			{PROMPTS.map((p) => (
				<form.Field key={p.name} name={p.name}>
					{(field) => (
						<div className="card p-5">
							<label
								htmlFor={`debrief-${p.name}`}
								className="font-bold uppercase tracking-wider"
							>
								{p.title}
							</label>
							<p className="mb-3 text-muted text-sm">{p.hint}</p>
							<textarea
								id={`debrief-${p.name}`}
								rows={3}
								className="field resize-y leading-relaxed"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
							{p.name === "losses" && field.state.value.trim().length > 0 && (
								<p className="mt-2 font-black text-ember text-sm uppercase tracking-widest">
									Good.
								</p>
							)}
						</div>
					)}
				</form.Field>
			))}

			<div className="flex items-center justify-end gap-3">
				{savedAt && (
					<span className="text-muted text-xs">
						{online
							? "Logged"
							: "Saved on this device — syncs when back online"}{" "}
						{savedAt.toLocaleTimeString()}
					</span>
				)}
				<form.Subscribe selector={(s) => s.isSubmitting}>
					{(submitting) => (
						<button type="submit" className="btn-primary" disabled={submitting}>
							{submitting ? "Logging…" : "Log debrief"}
						</button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}
