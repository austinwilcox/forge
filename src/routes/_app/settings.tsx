import { useForm } from "@tanstack/react-form";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Icon } from "#/components/Icon";
import { InstallCard } from "#/components/InstallCard";
import {
	authQuery,
	profileQuery,
	usePendingWrites,
	useSaveProfile,
} from "#/lib/queries";
import { profileInput } from "#/lib/schemas";
import { clearCache, preload } from "#/lib/sync";
import { useUi } from "#/stores/ui";

export const Route = createFileRoute("/_app/settings")({
	loader: ({ context }) =>
		preload(context.queryClient, profileQuery(), authQuery()),
	component: SettingsPage,
});

function SettingsPage() {
	const { data: profile } = useSuspenseQuery(profileQuery());
	const { data: auth } = useSuspenseQuery(authQuery());
	const save = useSaveProfile();
	const [saved, setSaved] = useState(false);
	const theme = useUi((s) => s.theme);
	const setTheme = useUi((s) => s.setTheme);
	const qc = useQueryClient();
	const pending = usePendingWrites();

	const signOut = () => {
		if (
			pending &&
			!window.confirm(
				`${pending} change(s) haven't synced yet and will be lost. Sign out anyway?`,
			)
		)
			return;
		qc.getMutationCache().clear();
		qc.clear();
		clearCache();
		window.location.assign("/auth/logout");
	};

	const form = useForm({
		defaultValues: { name: profile.name ?? "", creed: profile.creed ?? "" },
		validators: { onChange: profileInput },
		onSubmit: async ({ value }) => {
			try {
				await save.mutateAsync({ data: value });
			} catch {
				return; // shown below via save.error
			}
			setSaved(true);
			setTimeout(() => setSaved(false), 2000);
		},
	});

	return (
		<div className="mx-auto max-w-2xl space-y-8">
			<header>
				<p className="eyebrow">Configuration</p>
				<h1 className="headline mt-2 text-3xl sm:text-4xl">Settings</h1>
			</header>

			<form
				className="card space-y-5 p-6"
				onSubmit={(e) => {
					e.preventDefault();
					form.handleSubmit();
				}}
			>
				<h2 className="font-bold uppercase tracking-wider">Profile</h2>
				<form.Field name="name">
					{(field) => (
						<div>
							<label htmlFor="name" className="label">
								Call sign
							</label>
							<input
								id="name"
								className="field"
								placeholder="Your name"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
						</div>
					)}
				</form.Field>
				<form.Field name="creed">
					{(field) => (
						<div>
							<label htmlFor="creed" className="label">
								Personal creed
							</label>
							<textarea
								id="creed"
								rows={3}
								className="field font-serif italic"
								placeholder="I am a disciplined father, athlete and craftsman who owns every outcome."
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
							<p className="mt-1.5 text-muted text-xs">
								Shown on Today. Decide the type of person you want to be.
							</p>
						</div>
					)}
				</form.Field>
				<div className="flex items-center justify-end gap-3">
					{saved && <span className="text-olive text-xs">Saved.</span>}
					{save.error && (
						<span className="text-blood text-xs">{save.error.message}</span>
					)}
					<button
						type="submit"
						className="btn-primary"
						disabled={save.isPending}
					>
						Save
					</button>
				</div>
			</form>

			<InstallCard />

			<section className="card space-y-4 p-6">
				<h2 className="font-bold uppercase tracking-wider">Appearance</h2>
				<div className="inline-flex rounded-lg border border-line bg-surface-2 p-1">
					{(["dark", "light"] as const).map((t) => (
						<button
							key={t}
							type="button"
							onClick={() => setTheme(t)}
							className={`flex items-center gap-2 rounded-md px-4 py-1.5 font-medium text-sm ${theme === t ? "bg-ember text-ember-ink" : "text-ink-2"}`}
						>
							<Icon name={t === "dark" ? "moon" : "sun"} size={14} />
							{t === "dark" ? "Night" : "Day"}
						</button>
					))}
				</div>
			</section>

			<section className="card space-y-4 p-6">
				<h2 className="font-bold uppercase tracking-wider">Data</h2>
				<p className="text-muted text-sm">
					Your data lives in a single SQLite file on your own hardware. Export a
					JSON backup any time.
				</p>
				<a href="/api/export" className="btn-ghost" download>
					<Icon name="download" size={16} /> Export JSON
				</a>
			</section>

			{auth.mode !== "none" && (
				<section className="card space-y-4 p-6">
					<h2 className="font-bold uppercase tracking-wider">Account</h2>
					{auth.user && (
						<p className="text-ink-2 text-sm">
							Signed in as{" "}
							<b className="text-ink">{auth.user.name ?? auth.user.email}</b>
							{auth.user.name && auth.user.email && (
								<span className="text-muted"> · {auth.user.email}</span>
							)}
							{auth.provider && (
								<span className="text-muted"> via {auth.provider}</span>
							)}
						</p>
					)}
					<button type="button" className="btn-ghost" onClick={signOut}>
						<Icon name="logout" size={16} /> Sign out
					</button>
				</section>
			)}
		</div>
	);
}
