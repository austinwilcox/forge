import { useEffect, useState } from "react";
import { useOnline, usePendingWrites } from "#/lib/queries";

/**
 * Offline / syncing indicator. Rendered only after mount: the queue lives in
 * this device's storage, which the server-rendered HTML can't know about.
 */
export function SyncStatus({ compact = false }: { compact?: boolean }) {
	const online = useOnline();
	const pending = usePendingWrites();
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	if (!mounted || (online && pending === 0)) return null;

	const label = online
		? `Syncing ${pending} change${pending === 1 ? "" : "s"}…`
		: pending
			? `Offline · ${pending} change${pending === 1 ? "" : "s"} saved on this device`
			: "Offline · showing saved data";

	return (
		<output
			className={`flex items-center gap-2 rounded-md border px-2 py-1 text-[11px] ${
				online
					? "border-line text-ink-2"
					: "border-brass/40 bg-brass/10 text-brass"
			}`}
			title={
				online
					? "Sending changes to your Forge server"
					: "Changes are queued and will sync when the server is reachable"
			}
		>
			<span
				className={`size-1.5 shrink-0 rounded-full ${online ? "animate-pulse bg-ember" : "bg-brass"}`}
			/>
			{compact
				? online
					? `Syncing ${pending}`
					: `Offline${pending ? ` · ${pending}` : ""}`
				: label}
		</output>
	);
}
