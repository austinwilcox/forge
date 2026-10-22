import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { HabitForm } from "#/components/HabitForm";
import { today } from "#/lib/dates";
import { useCreateHabit } from "#/lib/queries";

export const Route = createFileRoute("/_app/habits/new")({
	component: NewHabit,
});

function NewHabit() {
	const create = useCreateHabit();
	const navigate = useNavigate();
	return (
		<div className="mx-auto max-w-2xl space-y-6">
			<header>
				<Link to="/habits" className="eyebrow hover:text-ink">
					← Habits
				</Link>
				<h1 className="headline mt-2 text-3xl">Forge a habit</h1>
				<p className="mt-1 text-muted text-sm">
					Every action is a vote for the person you want to become.
				</p>
			</header>
			<HabitForm
				submitLabel="Commit"
				onSubmit={async (habit) => {
					await create.mutateAsync({ data: { habit, startDate: today() } });
					navigate({ to: "/" });
				}}
			/>
		</div>
	);
}
