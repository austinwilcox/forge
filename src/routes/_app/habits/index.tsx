import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Icon } from "#/components/Icon";
import { today, WEEKDAYS_SHORT } from "#/lib/dates";
import type { Habit } from "#/lib/habits";
import { habitsQuery, useReorderHabits, useSetArchived } from "#/lib/queries";
import { PILLAR_META } from "#/lib/schemas";
import { preload } from "#/lib/sync";

export const Route = createFileRoute("/_app/habits/")({
	loader: ({ context }) => preload(context.queryClient, habitsQuery()),
	component: HabitsPage,
});

function scheduleLabel(s: number[]) {
	if (s.length === 7) return "Daily";
	if (s.join() === "1,2,3,4,5") return "Weekdays";
	if (s.join() === "0,6") return "Weekends";
	return s.map((d) => WEEKDAYS_SHORT[d]).join(" ");
}

function HabitsPage() {
	const { data: habits } = useSuspenseQuery(habitsQuery());
	const reorder = useReorderHabits();
	const active = habits.filter((h) => !h.archivedAt);
	const archived = habits.filter((h) => h.archivedAt);

	const move = (index: number, dir: -1 | 1) => {
		const ids = active.map((h) => h.id);
		const j = index + dir;
		if (j < 0 || j >= ids.length) return;
		[ids[index], ids[j]] = [ids[j], ids[index]];
		reorder.mutate(ids);
	};

	return (
		<div className="space-y-8">
			<header className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p className="eyebrow">Your protocol</p>
					<h1 className="headline mt-2 text-3xl sm:text-4xl">Habits</h1>
					<p className="mt-2 max-w-xl text-ink-2 text-sm">
						You do not rise to the level of your goals; you fall to the level of
						your systems. Order them hardest-first — do the hard thing before
						the easy thing.
					</p>
				</div>
				<Link to="/habits/new" className="btn-primary">
					<Icon name="plus" size={16} /> New habit
				</Link>
			</header>

			{active.length === 0 ? (
				<p className="card p-8 text-center text-muted">
					No active habits.{" "}
					<Link to="/habits/new" className="text-ember underline">
						Forge one.
					</Link>
				</p>
			) : (
				<ol className="space-y-2">
					{active.map((h, i) => (
						<HabitRow
							key={h.id}
							habit={h}
							index={i}
							total={active.length}
							onMove={move}
						/>
					))}
				</ol>
			)}

			{archived.length > 0 && (
				<section>
					<h2 className="eyebrow mb-3">Archived</h2>
					<ul className="space-y-2">
						{archived.map((h) => (
							<HabitRow key={h.id} habit={h} />
						))}
					</ul>
				</section>
			)}
		</div>
	);
}

function HabitRow({
	habit,
	index,
	total,
	onMove,
}: {
	habit: Habit;
	index?: number;
	total?: number;
	onMove?: (i: number, d: -1 | 1) => void;
}) {
	const archive = useSetArchived();
	const isArchived = Boolean(habit.archivedAt);
	return (
		<li
			className={`card flex items-center gap-3 p-3 sm:p-4 ${isArchived ? "opacity-60" : ""}`}
		>
			{onMove && index !== undefined && total !== undefined && (
				<div className="flex flex-col">
					<button
						type="button"
						className="p-0.5 text-muted hover:text-ink disabled:opacity-20"
						disabled={index === 0}
						onClick={() => onMove(index, -1)}
						aria-label="Move up"
					>
						<Icon name="up" size={16} />
					</button>
					<button
						type="button"
						className="p-0.5 text-muted hover:text-ink disabled:opacity-20"
						disabled={index === total - 1}
						onClick={() => onMove(index, 1)}
						aria-label="Move down"
					>
						<Icon name="down" size={16} />
					</button>
				</div>
			)}
			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-2">
					<Link
						to="/habits/$habitId"
						params={{ habitId: habit.id }}
						className="font-semibold hover:underline"
					>
						{habit.name}
					</Link>
					<span className="chip uppercase tracking-wider">
						{PILLAR_META[habit.pillar].label}
					</span>
				</div>
				<p className="mt-0.5 truncate text-muted text-xs">
					{scheduleLabel(habit.schedule)}
					{habit.kind === "count" && ` · ${habit.target} ${habit.unit ?? ""}`}
					{habit.cueTime && ` · ${habit.cueTime}`}
					{habit.identity && (
						<span className="font-serif italic"> · {habit.identity}</span>
					)}
				</p>
			</div>
			<button
				type="button"
				className="btn-ghost px-2.5 py-1.5 text-xs"
				onClick={() =>
					archive.mutate({
						id: habit.id,
						archivedOn: isArchived ? null : today(),
					})
				}
				disabled={archive.isPending}
			>
				<Icon name="archive" size={14} />
				<span className="hidden sm:inline">
					{isArchived ? "Restore" : "Archive"}
				</span>
			</button>
			<Link
				to="/habits/$habitId"
				params={{ habitId: habit.id }}
				className="btn-ghost px-2.5 py-1.5 text-xs"
				aria-label={`Edit ${habit.name}`}
			>
				<Icon name="edit" size={14} />
			</Link>
		</li>
	);
}
