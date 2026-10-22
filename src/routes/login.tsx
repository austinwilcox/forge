import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Icon } from "#/components/Icon";
import { Logo } from "#/components/Logo";
import { authQuery } from "#/lib/queries";
import { login } from "#/server/auth";

const safeNext = (next?: string) =>
	next?.startsWith("/") && !next.startsWith("//") ? next : "/";

export const Route = createFileRoute("/login")({
	validateSearch: z.object({
		next: z.string().optional(),
		error: z.string().optional(),
	}),
	beforeLoad: async ({ context, search }) => {
		const auth = await context.queryClient.fetchQuery({
			...authQuery(),
			staleTime: 0,
		});
		if (auth.mode === "none" || auth.authed)
			throw redirect({ href: safeNext(search.next) });
		return { auth };
	},
	component: Login,
});

function Login() {
	const { auth } = Route.useRouteContext();
	const search = Route.useSearch();
	const next = safeNext(search.next);

	return (
		<div className="grain grid min-h-dvh place-items-center px-4">
			<div className="card w-full max-w-sm space-y-6 p-8">
				<Logo />
				<div>
					<h1 className="headline text-2xl">Report in</h1>
					<p className="mt-1 text-muted text-sm">
						{auth.mode === "oidc"
							? "Sign in to reach your own protocol and history."
							: "Enter the passcode for this Forge."}
					</p>
				</div>
				{search.error && (
					<p className="rounded-lg bg-blood-soft px-3 py-2 text-blood text-sm">
						{search.error}
					</p>
				)}
				{auth.mode === "oidc" ? (
					<a
						href={`/auth/login?next=${encodeURIComponent(next)}`}
						className="btn-primary w-full"
					>
						<Icon name="logout" size={16} className="rotate-180" />
						Sign in with {auth.provider}
					</a>
				) : (
					<PasscodeForm next={next} />
				)}
			</div>
		</div>
	);
}

function PasscodeForm({ next }: { next: string }) {
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	const qc = useQueryClient();

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		setPending(true);
		setError(null);
		const res = await login({ data: { password } });
		setPending(false);
		if (!res.ok) return setError("Wrong passcode. Own it and try again.");
		await qc.invalidateQueries({ queryKey: ["auth"] });
		// Full load so the offline cache and queue for this session are restored.
		window.location.assign(next);
	}

	return (
		<form onSubmit={submit} className="space-y-6">
			<div>
				<label htmlFor="password" className="label">
					Passcode
				</label>
				<input
					id="password"
					type="password"
					autoComplete="current-password"
					className="field"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					// biome-ignore lint/a11y/noAutofocus: single-field login screen
					autoFocus
				/>
				{error && <p className="mt-2 text-blood text-sm">{error}</p>}
			</div>
			<button
				type="submit"
				className="btn-primary w-full"
				disabled={pending || !password}
			>
				{pending ? "Checking…" : "Get after it"}
			</button>
		</form>
	);
}
