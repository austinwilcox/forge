import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
} from "@tanstack/react-router";
import { Icon, type IconName } from "#/components/Icon";
import { Logo } from "#/components/Logo";
import { SyncStatus } from "#/components/SyncStatus";
import { authQuery } from "#/lib/queries";
import { OfflineUncachedError, preload } from "#/lib/sync";
import { useUi } from "#/stores/ui";

export const Route = createFileRoute("/_app")({
	beforeLoad: async ({ context, location }) => {
		// Offline, the last known session is trusted: the device already holds
		// this user's data, and the server re-checks every write when it syncs.
		await preload(context.queryClient, authQuery());
		const auth = context.queryClient.getQueryData(authQuery().queryKey);
		if (auth && !auth.authed)
			throw redirect({ to: "/login", search: { next: location.href } });
	},
	component: AppShell,
	errorComponent: ({ error, reset }) => (
		<div className="grid min-h-dvh place-items-center px-4">
			<div className="card max-w-md space-y-4 p-8 text-center">
				<p className="eyebrow">
					{error instanceof OfflineUncachedError
						? "Offline"
						: "Something broke"}
				</p>
				<p className="text-ink-2">
					{error instanceof Error ? error.message : String(error)}
				</p>
				<button type="button" className="btn-primary" onClick={reset}>
					Try again
				</button>
			</div>
		</div>
	),
});

const NAV: { to: string; label: string; icon: IconName }[] = [
	{ to: "/", label: "Today", icon: "today" },
	{ to: "/habits", label: "Habits", icon: "habits" },
	{ to: "/debrief", label: "Debrief", icon: "debrief" },
	{ to: "/progress", label: "Progress", icon: "progress" },
	{ to: "/manual", label: "Manual", icon: "manual" },
	{ to: "/settings", label: "Settings", icon: "settings" },
];

function AppShell() {
	const theme = useUi((s) => s.theme);
	const toggleTheme = useUi((s) => s.toggleTheme);

	return (
		<div className="grain min-h-dvh lg:grid lg:grid-cols-[232px_1fr]">
			<aside className="sticky top-0 hidden h-dvh flex-col border-line border-r bg-surface/60 px-4 py-6 lg:flex">
				<Link to="/" className="mb-10 px-2">
					<Logo />
				</Link>
				<nav className="flex flex-col gap-1">
					{NAV.map((item) => (
						<Link
							key={item.to}
							to={item.to}
							activeOptions={{ exact: item.to === "/" }}
							className="group flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-ink-2 text-sm transition-colors hover:bg-surface-2 hover:text-ink data-[status=active]:bg-ember-soft data-[status=active]:text-ember"
						>
							<Icon name={item.icon} />
							{item.label}
						</Link>
					))}
				</nav>
				<div className="mt-auto space-y-4 px-2">
					<SyncStatus />
					<button
						type="button"
						onClick={toggleTheme}
						className="flex items-center gap-2 text-muted text-xs hover:text-ink"
					>
						<Icon name={theme === "dark" ? "sun" : "moon"} size={14} />
						{theme === "dark" ? "Day mode" : "Night mode"}
					</button>
					<p className="font-mono text-[10px] text-muted uppercase leading-relaxed tracking-widest">
						Discipline
						<br />
						equals freedom.
					</p>
				</div>
			</aside>

			<header className="sticky top-0 z-20 flex items-center justify-between border-line border-b bg-bg/85 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 backdrop-blur lg:hidden">
				<Link to="/">
					<Logo compact />
				</Link>
				<div className="flex items-center gap-1">
					<SyncStatus compact />
					<button
						type="button"
						onClick={toggleTheme}
						className="p-2 text-muted"
						aria-label="Toggle theme"
					>
						<Icon name={theme === "dark" ? "sun" : "moon"} />
					</button>
				</div>
			</header>

			<main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16">
				<Outlet />
			</main>

			<nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-6 border-line border-t bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
				{NAV.map((item) => (
					<Link
						key={item.to}
						to={item.to}
						activeOptions={{ exact: item.to === "/" }}
						className="flex flex-col items-center gap-1 py-2.5 text-[10px] text-muted data-[status=active]:text-ember"
					>
						<Icon name={item.icon} size={20} />
						{item.label}
					</Link>
				))}
			</nav>
		</div>
	);
}
