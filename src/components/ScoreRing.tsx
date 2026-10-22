/** Circular daily score. Fills ember, turns olive when the day is won. */
export function ScoreRing({
	value,
	size = 132,
}: {
	value: number;
	size?: number;
}) {
	const stroke = 10;
	const r = (size - stroke) / 2;
	const c = 2 * Math.PI * r;
	const pct = Math.max(0, Math.min(1, value));
	const won = pct >= 0.999;
	return (
		<div
			className="relative grid place-items-center"
			style={{ width: size, height: size }}
		>
			<svg width={size} height={size} className="-rotate-90" aria-hidden="true">
				<circle
					cx={size / 2}
					cy={size / 2}
					r={r}
					fill="none"
					stroke="var(--surface-3)"
					strokeWidth={stroke}
				/>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={r}
					fill="none"
					stroke={won ? "var(--olive)" : "var(--ember)"}
					strokeWidth={stroke}
					strokeLinecap="round"
					strokeDasharray={c}
					strokeDashoffset={c * (1 - pct)}
					style={{
						transition:
							"stroke-dashoffset 500ms cubic-bezier(.2,.8,.2,1), stroke 300ms",
					}}
				/>
			</svg>
			<div className="absolute text-center">
				<div className="font-black font-mono text-3xl tabular-nums">
					{Math.round(pct * 100)}
				</div>
				<div className="eyebrow -mt-0.5 text-[9px]">
					{won ? "Day won" : "Score"}
				</div>
			</div>
		</div>
	);
}
