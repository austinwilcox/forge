import { useSuspenseQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	notFound,
	useNavigate,
} from "@tanstack/react-router";
import { HabitForm } from "#/components/HabitForm";
import { Icon } from "#/components/Icon";
import { habitsQuery, useDeleteHabit, useUpdateHabit } from "#/lib/queries";
import { preload } from "#/lib/sync";

export const Route = createFileRoute("/_app/habits/$habitId")({
	loader: async ({ context, params }) => {
		await preload(context.queryClient, habitsQuery());
		const habits = context.queryClient.getQueryData(habitsQuery().queryKey);
		if (!habits?.some((h) => h.id === params.habitId)) throw notFound();
	},
	component: EditHabit,
});

function EditHabit() {
	const { habitId } = Route.useParams();
	const { data: habit } = useSuspenseQuery({
		...habitsQuery(),
		select: (habits) => habits.find((h) => h.id === habitId),
	});
	const update = useUpdateHabit();
	const remove = useDeleteHabit();
	const navigate = useNavigate();
	if (!habit) return <p className="text-muted">This habit no longer exists.</p>;

	return (
		<div className="mx-auto max-w-2xl space-y-6">
			<header>
				<Link to="/habits" className="eyebrow hover:text-ink">
					← Habits
				</Link>
				<h1 className="headline mt-2 text-3xl">{habit.name}</h1>
				<p className="mt-1 text-muted text-sm">
					Tracking since {habit.startDate}. Adjust the system, not the standard.
				</p>
			</header>
			<HabitForm
				key={habit.id}
				habit={habit}
				submitLabel="Save changes"
				onSubmit={async (value) => {
					await update.mutateAsync({ data: { id: habit.id, habit: value } });
					navigate({ to: "/habits" });
				}}
				footer={
					<button
						type="button"
						className="btn-danger"
						disabled={remove.isPending}
						onClick={async () => {
							if (
								!window.confirm(
									`Delete "${habit.name}" and all of its history? Archive keeps history.`,
								)
							)
								return;
							await remove.mutateAsync(habit.id);
							navigate({ to: "/habits" });
						}}
					>
						<Icon name="trash" size={14} /> Delete
					</button>
				}
			/>
		</div>
	);
}
