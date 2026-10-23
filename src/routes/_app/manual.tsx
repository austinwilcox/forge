import { createFileRoute } from "@tanstack/react-router";
import { FIELD_MANUAL } from "#/lib/principles";

export const Route = createFileRoute("/_app/manual")({ component: ManualPage });

function ManualPage() {
	return (
		<div className="space-y-10">
			<header>
				<p className="eyebrow">Doctrine</p>
				<h1 className="headline mt-2 text-3xl sm:text-4xl">Field manual</h1>
				<p className="mt-2 max-w-2xl text-ink-2 text-sm">
					Forge is built on three bodies of work. Here's the doctrine in brief —
					and exactly where each idea lives in the app. Read the books; this is
					the pocket card, not the substitute.
				</p>
				<nav className="mt-4 flex flex-wrap gap-2">
					{FIELD_MANUAL.map((s) => (
						<a
							key={s.id}
							href={`#${s.id}`}
							className="chip px-2.5 py-1 text-xs hover:border-ember hover:text-ember"
						>
							{s.title}
						</a>
					))}
				</nav>
			</header>

			{FIELD_MANUAL.map((section, i) => (
				<section
					key={section.id}
					id={section.id}
					className="scroll-mt-20 space-y-4"
				>
					<div className="flex items-baseline gap-4">
						<span className="font-black font-mono text-4xl text-ember/70">
							0{i + 1}
						</span>
						<div>
							<h2 className="headline text-2xl">{section.title}</h2>
							<p className="text-muted text-xs">{section.source}</p>
						</div>
					</div>
					<p className="max-w-3xl font-serif text-ink text-lg leading-relaxed">
						{section.summary}
					</p>
					<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
						{section.tenets.map((t) => (
							<article key={t.title} className="card flex flex-col p-5">
								<h3 className="font-bold uppercase tracking-wider">
									{t.title}
								</h3>
								<p className="mt-2 flex-1 text-ink-2 text-sm leading-relaxed">
									{t.body}
								</p>
								<p className="mt-4 border-line border-t pt-3 text-xs">
									<span className="eyebrow mr-1.5 text-ember">In Forge</span>
									<span className="text-muted">{t.inApp}</span>
								</p>
							</article>
						))}
					</div>
				</section>
			))}
		</div>
	);
}
