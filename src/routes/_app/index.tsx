import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { HabitCard } from "#/components/HabitCard";
import { Icon } from "#/components/Icon";
import { ScoreRing } from "#/components/ScoreRing";
import { addDays, formatLong, type ISODate, today } from "#/lib/dates";
import { daySummary, indexLogs, isScheduled, logStatus } from "#/lib/habits";
import { quoteFor } from "#/lib/principles";
import {
	dayQueries,
	useDay,
	useInstallStarter,
	useSaveDebrief,
} from "#/lib/queries";
import { isoDate, PILLAR_META, PILLARS } from "#/lib/schemas";
import { preload } from "#/lib/sync";
import { useUi } from "#/stores/ui";

export const Route = createFileRoute("/_app/")({
	validateSearch: z.object({ date: isoDate.optional() }),
	loaderDeps: ({ search }) => ({ date: search.date ?? today() }),
	loader: ({ context }) => preload(context.queryClient, ...dayQueries()),
	component: TodayPage,
});

function greeting(hour: number) {
	if (hour < 5) return "Up before the enemy";
	if (hour < 12) return "Get after it";
	if (hour < 18) return "Stay on the attack";
	return "Finish strong";
}

function TodayPage() {
	const { date } = Route.useLoaderDeps();
	const data = useDay(date);
	const hideCompleted = useUi((s) => s.hideCompleted);
	const toggleHideCompleted = useUi((s) => s.toggleHideCompleted);
	const realToday = today();
	const isToday = date === realToday;
	const quote = quoteFor(date);

	const active = data.habits.filter(
		(h) => !h.archivedAt || h.archivedAt > date,
	);
	const scheduled = active.filter((h) => isScheduled(h, date));
	const offDuty = active.filter(
		(h) => !isScheduled(h, date) && h.startDate <= date,
	);
	const logs = new Map(data.logs.map((l) => [l.habitId, l]));
	const summary = daySummary(active, indexLogs(data.logs), date);
	const remaining = scheduled.filter(
		(h) => logStatus(h, logs.get(h.id)) !== "done",
	).length;

	if (data.habits.length === 0) return <EmptyState />;

	return (
		<div className="space-y-8">
			<header className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p className="eyebrow">{formatLong(date)}</p>
					<h1 className="headline mt-2 text-3xl sm:text-4xl">
						{isToday
							? `${greeting(new Date().getHours())}${data.profile.name ? `, ${data.profile.name}` : ""}.`
							: "Past operation"}
					</h1>
					{data.profile.creed && (
						<p className="mt-2 max-w-xl font-serif text-ink-2 italic">
							“{data.profile.creed}”
						</p>
					)}
				</div>
				<div className="flex items-center gap-1">
					<Link
						to="/"
						search={{ date: addDays(date, -1) }}
						className="btn-ghost px-2.5"
						aria-label="Previous day"
					>
						<Icon name="chevronLeft" />
					</Link>
					{!isToday && (
						<Link to="/" search={{}} className="btn-ghost">
							Today
						</Link>
					)}
					<Link
						to="/"
						search={{ date: addDays(date, 1) }}
						disabled={isToday}
						className={`btn-ghost px-2.5 ${isToday ? "pointer-events-none opacity-40" : ""}`}
						aria-label="Next day"
					>
						<Icon name="chevronRight" />
					</Link>
				</div>
			</header>

			<section className="grid grid-cols-1 gap-4 md:grid-cols-[auto_1fr]">
				<div className="card flex items-center gap-6 p-5">
					<ScoreRing value={summary.rate} />
					<dl className="space-y-3 text-sm">
						<div>
							<dt className="eyebrow">Completed</dt>
							<dd className="font-bold font-mono text-xl tabular-nums">
								{summary.completed}
								<span className="text-muted">/{summary.scheduled}</span>
							</dd>
						</div>
						<div>
							<dt className="eyebrow">Remaining</dt>
							<dd
								className={`font-bold font-mono text-xl tabular-nums ${remaining ? "text-ember" : "text-olive"}`}
							>
								{remaining}
							</dd>
						</div>
					</dl>
				</div>
				<div className="card flex flex-col justify-between gap-4 p-5">
					<MissionInput date={date} initial={data.debrief?.mission ?? ""} />
					<figure className="border-ember border-l-2 pl-4">
						<blockquote className="font-serif text-ink text-lg leading-snug">
							{quote.text}
						</blockquote>
						<figcaption className="eyebrow mt-1.5 normal-case tracking-wider">
							— {quote.source}
						</figcaption>
					</figure>
				</div>
			</section>

			<section className="space-y-6">
				<div className="flex items-center justify-between">
					<h2 className="eyebrow">Today's orders</h2>
					<button
						type="button"
						onClick={toggleHideCompleted}
						className="flex items-center gap-1.5 text-muted text-xs hover:text-ink"
					>
						<Icon name={hideCompleted ? "eye" : "eyeOff"} size={14} />
						{hideCompleted ? "Show completed" : "Hide completed"}
					</button>
				</div>

				{scheduled.length === 0 && (
					<p className="card p-6 text-center text-muted">
						No habits scheduled. Rest is part of the plan — recover hard.
					</p>
				)}

				{PILLARS.map((pillar) => {
					const items = scheduled.filter(
						(h) =>
							h.pillar === pillar &&
							!(hideCompleted && logStatus(h, logs.get(h.id)) === "done"),
					);
					if (!items.length) return null;
					return (
						<div key={pillar} className="space-y-2.5">
							<div className="flex items-baseline gap-3">
								<h3 className="font-bold text-sm uppercase tracking-widest">
									{PILLAR_META[pillar].label}
								</h3>
								<p className="hidden text-muted text-xs sm:block">
									{PILLAR_META[pillar].blurb}
								</p>
							</div>
							<div className="grid grid-cols-1 gap-2.5">
								{items.map((h) => (
									<HabitCard
										key={h.id}
										habit={h}
										log={logs.get(h.id)}
										date={date}
										isToday={isToday}
									/>
								))}
							</div>
						</div>
					);
				})}

				{offDuty.length > 0 && (
					<details className="group">
						<summary className="eyebrow cursor-pointer list-none hover:text-ink">
							<span className="inline-block transition-transform group-open:rotate-90">
								›
							</span>{" "}
							Off-duty today ({offDuty.length})
						</summary>
						<ul className="mt-2 flex flex-wrap gap-2">
							{offDuty.map((h) => (
								<li key={h.id} className="chip">
									{h.name}
								</li>
							))}
						</ul>
					</details>
				)}
			</section>

			<Link
				to="/debrief"
				search={{ date }}
				className="card flex items-center justify-between gap-4 p-5 transition-colors hover:border-ember/60"
			>
				<div>
					<p className="eyebrow">After-action review</p>
					<p className="mt-1 font-semibold">
						{data.debrief?.ownership
							? "Debrief logged. Review or adjust."
							: "Debrief the day. What went right, what went wrong, what you own."}
					</p>
				</div>
				<Icon name="chevronRight" className="shrink-0 text-ember" />
			</Link>
		</div>
	);
}

function MissionInput({ date, initial }: { date: ISODate; initial: string }) {
	const [value, setValue] = useState(initial);
	const save = useSaveDebrief();
	useEffect(() => setValue(initial), [initial]);

	return (
		<div>
			<label htmlFor="mission" className="eyebrow flex items-center gap-1.5">
				<Icon name="target" size={12} /> Mission · prioritize and execute
			</label>
			<input
				id="mission"
				className="mt-2 w-full border-line border-b bg-transparent pb-1.5 font-semibold text-lg placeholder:font-normal placeholder:text-muted/60 focus:border-ember focus:outline-none"
				placeholder="The one thing that must happen today…"
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onBlur={() => value !== initial && save({ date, mission: value })}
				onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
				maxLength={280}
			/>
		</div>
	);
}

function EmptyState() {
	const install = useInstallStarter();
	return (
		<div className="mx-auto max-w-2xl space-y-8 py-10 text-center">
			<p className="eyebrow">Day zero</p>
			<h1 className="headline text-4xl sm:text-5xl">
				No excuses. No habits yet.
			</h1>
			<p className="mx-auto max-w-lg text-ink-2">
				Every action is a vote for the person you're becoming. Build your own
				protocol, or deploy a proven starter set — wake early, train, read, deep
				work, temperance, and a nightly debrief — and adjust from there.
			</p>
			<div className="flex flex-wrap justify-center gap-3">
				<button
					type="button"
					className="btn-primary"
					onClick={() => install.mutate(today())}
					disabled={install.isPending}
				>
					<Icon name="bolt" size={16} />
					{install.isPending ? "Deploying…" : "Deploy starter protocol"}
				</button>
				<Link to="/habits/new" className="btn-ghost">
					<Icon name="plus" size={16} /> Build my own
				</Link>
			</div>
			{install.error && (
				<p className="text-blood text-sm">{install.error.message}</p>
			)}
		</div>
	);
}
