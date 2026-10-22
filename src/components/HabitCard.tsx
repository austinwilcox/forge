import { Link } from "@tanstack/react-router";
import type { ISODate } from "#/lib/dates";
import { type HabitLog, logStatus } from "#/lib/habits";
import { type DayHabit, useLogHabit } from "#/lib/queries";
import { Icon } from "./Icon";

interface Props {
	habit: DayHabit;
	log: HabitLog | undefined;
	date: ISODate;
	isToday: boolean;
}

export function HabitCard({ habit, log, date, isToday }: Props) {
	const logHabit = useLogHabit();
	const status = logStatus(habit, log);
	const value = log?.value ?? 0;
	const done = status === "done";
	const { streak } = habit;
	const showWarning = status === "none" && streak.missedLast;

	const write = (next: number, minimum = false) =>
		logHabit({
			habitId: habit.id,
			date,
			value: Math.max(0, next),
			minimum,
		});

	const toggle = () =>
		done || status === "minimum" ? write(0) : write(habit.target);
	const step = habit.target >= 20 ? 5 : 1;

	return (
		<div
			className={[
				"card group relative flex gap-4 p-4 transition-colors",
				done ? "border-olive/40 bg-olive-soft" : "",
				status === "minimum" ? "border-brass/40" : "",
				showWarning ? "border-blood/50" : "",
			].join(" ")}
		>
			<button
				type="button"
				onClick={toggle}
				aria-pressed={done}
				aria-label={done ? `Undo ${habit.name}` : `Complete ${habit.name}`}
				className={[
					"grid size-12 shrink-0 place-items-center rounded-xl border-2 transition-all active:scale-95",
					done
						? "border-olive bg-olive text-bg"
						: status === "minimum"
							? "border-brass bg-brass/15 text-brass"
							: "border-line bg-surface-2 text-transparent hover:border-ember hover:text-ember/50",
				].join(" ")}
			>
				{status === "minimum" ? (
					<span className="animate-stamp font-black font-mono text-[11px]">
						2:00
					</span>
				) : (
					<Icon
						name="check"
						size={26}
						strokeWidth={3}
						className={done ? "animate-stamp" : ""}
					/>
				)}
			</button>

			<div className="min-w-0 flex-1">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<Link
							to="/habits/$habitId"
							params={{ habitId: habit.id }}
							className={`block truncate font-semibold hover:underline ${done ? "text-ink-2 line-through decoration-olive/60" : ""}`}
						>
							{habit.name}
						</Link>
						{habit.identity && (
							<p className="truncate font-serif text-muted text-sm italic">
								{habit.identity}
							</p>
						)}
					</div>
					<Streak current={streak.current} best={streak.best} />
				</div>

				{(habit.cueTime || habit.cueLocation || habit.stackAfter) && (
					<div className="mt-2 flex flex-wrap gap-1.5">
						{habit.cueTime && (
							<span className="chip">
								<Icon name="clock" size={11} />
								{habit.cueTime}
							</span>
						)}
						{habit.cueLocation && (
							<span className="chip">
								<Icon name="pin" size={11} />
								{habit.cueLocation}
							</span>
						)}
						{habit.stackAfter && (
							<span className="chip">
								<Icon name="stack" size={11} />
								After {habit.stackAfter}
							</span>
						)}
					</div>
				)}

				{habit.kind === "count" && (
					<div className="mt-3 flex items-center gap-3">
						<div className="flex items-center rounded-lg border border-line bg-surface-2">
							<button
								type="button"
								className="p-2 text-ink-2 hover:text-ink"
								onClick={() => write(value - step)}
								aria-label="Decrease"
							>
								<Icon name="minus" size={14} />
							</button>
							<input
								type="number"
								inputMode="numeric"
								min={0}
								value={value}
								onChange={(e) => write(Number(e.target.value) || 0)}
								className="w-14 bg-transparent text-center font-mono text-sm tabular-nums focus:outline-none"
								aria-label={`${habit.name} amount`}
							/>
							<button
								type="button"
								className="p-2 text-ink-2 hover:text-ink"
								onClick={() => write(value + step)}
								aria-label="Increase"
							>
								<Icon name="plus" size={14} />
							</button>
						</div>
						<div className="flex-1">
							<div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
								<div
									className={`h-full rounded-full transition-all duration-500 ${done ? "bg-olive" : "bg-ember"}`}
									style={{
										width: `${Math.min(100, (value / habit.target) * 100)}%`,
									}}
								/>
							</div>
							<div className="mt-1 font-mono text-[11px] text-muted tabular-nums">
								{value} / {habit.target} {habit.unit}
							</div>
						</div>
					</div>
				)}

				{showWarning && (
					<p className="mt-3 flex items-start gap-2 rounded-lg bg-blood-soft px-3 py-2 text-blood text-xs">
						<Icon name="alert" size={14} className="mt-px shrink-0" />
						{streak.missedTwice ? (
							<span>
								<b>Missed twice.</b> Good — now you know. Reset the chain
								{isToday ? " today" : ""}.
							</span>
						) : (
							<span>
								<b>Never miss twice.</b> You missed last time. Don't let it
								become a pattern.
							</span>
						)}
					</p>
				)}

				{habit.twoMinute && status === "none" && (
					<button
						type="button"
						onClick={() => write(0, true)}
						className="mt-3 flex items-start gap-1.5 text-left text-muted text-xs hover:text-brass"
					>
						<Icon name="bolt" size={12} className="mt-px shrink-0" />
						<span>
							Rough day? Do the 2-minute version:{" "}
							<span className="text-ink-2">{habit.twoMinute}</span>
						</span>
					</button>
				)}
			</div>
		</div>
	);
}

function Streak({ current, best }: { current: number; best: number }) {
	return (
		<div className="shrink-0 text-right" title={`Best streak: ${best}`}>
			<div
				className={`flex items-center justify-end gap-1 font-bold font-mono tabular-nums ${current > 0 ? "text-ember" : "text-muted"}`}
			>
				<Icon name="flame" size={14} />
				{current}
			</div>
			<div className="font-mono text-[10px] text-muted">best {best}</div>
		</div>
	);
}
