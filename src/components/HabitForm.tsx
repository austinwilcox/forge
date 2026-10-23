import { useForm } from "@tanstack/react-form";
import { type ReactNode, useState } from "react";
import { WEEKDAYS_SHORT } from "#/lib/dates";
import type { Habit } from "#/lib/habits";
import {
	type HabitInput,
	habitInput,
	PILLAR_META,
	PILLARS,
} from "#/lib/schemas";

type FormValues = {
	name: string;
	identity: string;
	pillar: HabitInput["pillar"];
	cueTime: string;
	cueLocation: string;
	stackAfter: string;
	twoMinute: string;
	kind: HabitInput["kind"];
	target: number;
	unit: string;
	schedule: number[];
};

function toFormValues(h?: Habit): FormValues {
	return {
		name: h?.name ?? "",
		identity: h?.identity ?? "",
		pillar: h?.pillar ?? "body",
		cueTime: h?.cueTime ?? "",
		cueLocation: h?.cueLocation ?? "",
		stackAfter: h?.stackAfter ?? "",
		twoMinute: h?.twoMinute ?? "",
		kind: h?.kind ?? "check",
		target: h?.target ?? 1,
		unit: h?.unit ?? "",
		schedule: h?.schedule ?? [0, 1, 2, 3, 4, 5, 6],
	};
}

interface Props {
	habit?: Habit;
	submitLabel: string;
	onSubmit: (value: HabitInput) => Promise<unknown>;
	footer?: ReactNode;
}

/**
 * The editor walks through the Four Laws of Behavior Change so every habit is
 * designed, not just named.
 */
export function HabitForm({ habit, submitLabel, onSubmit, footer }: Props) {
	const [submitError, setSubmitError] = useState<string | null>(null);
	const form = useForm({
		defaultValues: toFormValues(habit),
		validators: { onSubmit: habitInput },
		onSubmit: async ({ value }) => {
			setSubmitError(null);
			try {
				await onSubmit(value);
			} catch (err) {
				setSubmitError(
					err instanceof Error ? err.message : "Couldn't save the habit",
				);
			}
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			className="space-y-6"
		>
			<Section
				n="0"
				title="Identity"
				hint="Decide who you are. Then prove it with small wins."
			>
				<form.Field name="name">
					{(field) => (
						<div>
							<label className="label" htmlFor={field.name}>
								Habit
							</label>
							<input
								id={field.name}
								className="field text-base"
								placeholder="e.g. Train, Read, Wake at 0500"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
							<Errors errors={field.state.meta.errors} />
						</div>
					)}
				</form.Field>
				<form.Field name="identity">
					{(field) => (
						<div>
							<label className="label" htmlFor={field.name}>
								I am someone who…
							</label>
							<input
								id={field.name}
								className="field font-serif italic"
								placeholder="I am an athlete. / I never miss a workout."
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
						</div>
					)}
				</form.Field>
				<form.Field name="pillar">
					{(field) => (
						<fieldset>
							<legend className="label">Pillar</legend>
							<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
								{PILLARS.map((p) => (
									<button
										key={p}
										type="button"
										onClick={() => field.handleChange(p)}
										className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
											field.state.value === p
												? "border-ember bg-ember-soft text-ember"
												: "border-line bg-surface-2 text-ink-2 hover:border-muted"
										}`}
									>
										<span className="font-semibold">
											{PILLAR_META[p].label}
										</span>
									</button>
								))}
							</div>
						</fieldset>
					)}
				</form.Field>
			</Section>

			<Section
				n="1"
				title="Make it obvious"
				hint="Implementation intention: I will [habit] at [time] in [location]. Stack it on something you already do."
			>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<form.Field name="cueTime">
						{(field) => (
							<div>
								<label className="label" htmlFor={field.name}>
									Time
								</label>
								<input
									id={field.name}
									type="time"
									className="field"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							</div>
						)}
					</form.Field>
					<form.Field name="cueLocation">
						{(field) => (
							<div>
								<label className="label" htmlFor={field.name}>
									Location
								</label>
								<input
									id={field.name}
									className="field"
									placeholder="Garage gym"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							</div>
						)}
					</form.Field>
				</div>
				<form.Field name="stackAfter">
					{(field) => (
						<div>
							<label className="label" htmlFor={field.name}>
								Habit stack — after I…
							</label>
							<input
								id={field.name}
								className="field"
								placeholder="pour my morning coffee"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
						</div>
					)}
				</form.Field>
			</Section>

			<Section
				n="2"
				title="Make it easy"
				hint="The two-minute rule: the smallest version that still counts as showing up. On bad days, do this."
			>
				<form.Field name="twoMinute">
					{(field) => (
						<div>
							<label className="label" htmlFor={field.name}>
								Two-minute version
							</label>
							<input
								id={field.name}
								className="field"
								placeholder="Put on running shoes and step outside"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
						</div>
					)}
				</form.Field>
			</Section>

			<Section
				n="3"
				title="Make it satisfying"
				hint="Define what done means and when you're on duty. Then track it — never miss twice."
			>
				<form.Field name="kind">
					{(field) => (
						<fieldset>
							<legend className="label">Measure</legend>
							<div className="inline-flex rounded-lg border border-line bg-surface-2 p-1">
								{(["check", "count"] as const).map((k) => (
									<button
										key={k}
										type="button"
										onClick={() => {
											field.handleChange(k);
											if (k === "check") form.setFieldValue("target", 1);
										}}
										className={`rounded-md px-4 py-1.5 font-medium text-sm ${field.state.value === k ? "bg-ember text-ember-ink" : "text-ink-2"}`}
									>
										{k === "check" ? "Done / not done" : "Amount"}
									</button>
								))}
							</div>
						</fieldset>
					)}
				</form.Field>
				<form.Subscribe selector={(s) => s.values.kind}>
					{(kind) =>
						kind === "count" && (
							<div className="grid grid-cols-2 gap-4">
								<form.Field name="target">
									{(field) => (
										<div>
											<label className="label" htmlFor={field.name}>
												Daily target
											</label>
											<input
												id={field.name}
												type="number"
												min={1}
												className="field font-mono"
												value={field.state.value}
												onChange={(e) =>
													field.handleChange(Number(e.target.value))
												}
											/>
											<Errors errors={field.state.meta.errors} />
										</div>
									)}
								</form.Field>
								<form.Field name="unit">
									{(field) => (
										<div>
											<label className="label" htmlFor={field.name}>
												Unit
											</label>
											<input
												id={field.name}
												className="field"
												placeholder="pages, min, reps"
												value={field.state.value}
												onChange={(e) => field.handleChange(e.target.value)}
											/>
										</div>
									)}
								</form.Field>
							</div>
						)
					}
				</form.Subscribe>
				<form.Field name="schedule">
					{(field) => (
						<fieldset>
							<legend className="label">On duty</legend>
							<div className="flex flex-wrap gap-1.5">
								{WEEKDAYS_SHORT.map((d, i) => {
									const on = field.state.value.includes(i);
									return (
										<button
											key={d}
											type="button"
											aria-pressed={on}
											onClick={() =>
												field.handleChange(
													on
														? field.state.value.filter((x) => x !== i)
														: [...field.state.value, i].sort(),
												)
											}
											className={`w-12 rounded-lg border py-2 font-mono text-xs uppercase ${
												on
													? "border-ember bg-ember-soft text-ember"
													: "border-line bg-surface-2 text-muted"
											}`}
										>
											{d}
										</button>
									);
								})}
								<button
									type="button"
									className="ml-2 text-muted text-xs hover:text-ink"
									onClick={() => field.handleChange([0, 1, 2, 3, 4, 5, 6])}
								>
									Every day
								</button>
								<button
									type="button"
									className="text-muted text-xs hover:text-ink"
									onClick={() => field.handleChange([1, 2, 3, 4, 5])}
								>
									Weekdays
								</button>
							</div>
							<Errors errors={field.state.meta.errors} />
						</fieldset>
					)}
				</form.Field>
			</Section>

			{submitError && (
				<p className="rounded-lg bg-blood-soft px-3 py-2 text-blood text-sm">
					{submitError}
				</p>
			)}
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex gap-2">{footer}</div>
				<form.Subscribe
					selector={(s) => [s.canSubmit, s.isSubmitting] as const}
				>
					{([canSubmit, isSubmitting]) => (
						<button
							type="submit"
							className="btn-primary"
							disabled={!canSubmit || isSubmitting}
						>
							{isSubmitting ? "Saving…" : submitLabel}
						</button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}

function Section({
	n,
	title,
	hint,
	children,
}: {
	n: string;
	title: string;
	hint: string;
	children: ReactNode;
}) {
	return (
		<section className="card space-y-4 p-5 sm:p-6">
			<header className="flex gap-3">
				<span className="font-black font-mono text-ember">{n}</span>
				<div>
					<h2 className="font-bold uppercase tracking-wider">{title}</h2>
					<p className="text-muted text-sm">{hint}</p>
				</div>
			</header>
			{children}
		</section>
	);
}

function Errors({ errors }: { errors: unknown[] }) {
	const messages = errors
		.map((e) =>
			typeof e === "string"
				? e
				: e && typeof e === "object" && "message" in e
					? String(e.message)
					: null,
		)
		.filter(Boolean);
	if (!messages.length) return null;
	return <p className="mt-1.5 text-blood text-xs">{messages.join(", ")}</p>;
}
