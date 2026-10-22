/** Anvil-and-spark wordmark. */
export function Logo({ compact = false }: { compact?: boolean }) {
	return (
		<span className="flex items-center gap-2.5">
			<svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
				<rect width="32" height="32" rx="7" fill="var(--ember)" />
				<path
					d="M4 13L24.5 12.5V15.6H20.6Q18.8 16 18.4 18.8L21.2 20.6V22.6H11.2V20.6L14 18.8Q13.8 16 11.9 15.6H9.4Q6.9 15.3 4 13Z"
					fill="var(--ember-ink)"
				/>
				<path
					d="M22.6 9.6 23.6 7.4M25.2 10.4 27 8.8M26.4 12.1 28.6 11.6"
					stroke="var(--ember-ink)"
					strokeWidth="1.3"
					fill="none"
					strokeLinecap="round"
				/>
			</svg>
			<span className="leading-none">
				<span className="block font-black text-ink text-lg uppercase tracking-[0.2em]">
					Forge
				</span>
				{!compact && (
					<span className="eyebrow mt-1 block text-[9px]">
						Discipline tracker
					</span>
				)}
			</span>
		</span>
	);
}
