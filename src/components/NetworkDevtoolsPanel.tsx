import { useMutationState, useQueryClient } from "@tanstack/react-query";
import type { CSSProperties } from "react";
import { useSyncExternalStore } from "react";
import {
	isSimulatedOffline,
	probe,
	setSimulatedOffline,
	subscribeSimulated,
} from "#/lib/connectivity";
import { useOnline } from "#/lib/queries";

/**
 * Dev-only TanStack Devtools plugin: flip the network off to exercise the
 * offline path end to end. Unlike the Query devtools' own online toggle (which
 * only tells TanStack Query it's offline), this blocks every server call, so
 * failures, queueing, cached reads and replay all happen for real.
 */
export function NetworkDevtoolsPanel() {
	const online = useOnline();
	const simulated = useSyncExternalStore(
		subscribeSimulated,
		isSimulatedOffline,
		() => false,
	);
	const qc = useQueryClient();
	const queue = useMutationState({
		filters: { mutationKey: ["sync"], status: "pending" },
		select: (m) => ({
			id: m.mutationId,
			kind: String(m.options.mutationKey?.[1] ?? "?"),
			vars: m.state.variables as Record<string, unknown> | undefined,
			paused: m.state.isPaused,
			at: m.state.submittedAt,
		}),
	});

	const status = simulated
		? { label: "Offline (simulated)", color: "#d6a842" }
		: online
			? { label: "Online", color: "#8fae5d" }
			: { label: "Offline (server unreachable)", color: "#d0553f" };

	const discardQueue = () => {
		if (
			!window.confirm(
				`Discard ${queue.length} unsynced change(s)? They will never reach the server.`,
			)
		)
			return;
		const cache = qc.getMutationCache();
		for (const m of cache.getAll())
			if (m.options.mutationKey?.[0] === "sync" && m.state.status === "pending")
				cache.remove(m);
		void qc.invalidateQueries();
	};

	return (
		<div style={s.root}>
			<div style={s.row}>
				<span style={{ ...s.dot, background: status.color }} />
				<strong style={{ fontSize: 14 }}>{status.label}</strong>
			</div>

			<label style={s.toggleRow}>
				<input
					type="checkbox"
					checked={!simulated}
					onChange={(e) => setSimulatedOffline(!e.target.checked)}
					style={{ width: 16, height: 16 }}
				/>
				<span>
					<strong>Network</strong> — uncheck to go offline
				</span>
			</label>
			<p style={s.hint}>
				Every request to the Forge server fails as if the Wi-Fi dropped or the
				Pi went down. Check off habits, set the mission, reload the page — then
				turn the network back on and watch the queue drain. Persists across
				reloads in this tab.
			</p>

			<div style={s.row}>
				<button
					type="button"
					style={s.button}
					onClick={() => void probe()}
					disabled={simulated}
				>
					Probe server now
				</button>
				<button
					type="button"
					style={s.button}
					onClick={() => void qc.invalidateQueries()}
					disabled={!online}
				>
					Refetch all
				</button>
				<button
					type="button"
					style={{ ...s.button, ...s.danger }}
					onClick={discardQueue}
					disabled={!queue.length}
				>
					Discard queue
				</button>
			</div>

			<h4 style={s.h4}>Sync queue ({queue.length})</h4>
			{queue.length === 0 ? (
				<p style={s.hint}>
					Nothing waiting. Every change on this device has reached the server.
				</p>
			) : (
				<table style={s.table}>
					<thead>
						<tr>
							<th style={s.th}>#</th>
							<th style={s.th}>Write</th>
							<th style={s.th}>Payload</th>
							<th style={s.th}>Queued</th>
							<th style={s.th}>State</th>
						</tr>
					</thead>
					<tbody>
						{queue.map((m, i) => (
							<tr key={m.id}>
								<td style={s.td}>{i + 1}</td>
								<td style={s.td}>{m.kind}</td>
								<td
									style={{
										...s.td,
										fontFamily: "monospace",
										maxWidth: 420,
										wordBreak: "break-all",
									}}
								>
									{JSON.stringify(m.vars, (k, v) =>
										k === "updatedAt" ? undefined : v,
									)}
								</td>
								<td style={s.td}>
									{m.at ? new Date(m.at).toLocaleTimeString() : "—"}
								</td>
								<td style={s.td}>{m.paused ? "paused" : "sending"}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
}

const s = {
	root: {
		padding: 16,
		fontFamily: "system-ui, sans-serif",
		fontSize: 13,
		lineHeight: 1.5,
		color: "inherit",
	},
	row: {
		display: "flex",
		alignItems: "center",
		gap: 8,
		flexWrap: "wrap",
		marginBottom: 12,
	},
	toggleRow: {
		display: "flex",
		alignItems: "center",
		gap: 8,
		cursor: "pointer",
		fontSize: 14,
	},
	dot: { width: 10, height: 10, borderRadius: "50%", display: "inline-block" },
	hint: { opacity: 0.7, margin: "6px 0 14px", maxWidth: 640 },
	h4: {
		margin: "8px 0",
		fontSize: 13,
		textTransform: "uppercase",
		letterSpacing: 1,
	},
	button: {
		padding: "5px 10px",
		borderRadius: 6,
		border: "1px solid rgba(128,128,128,.4)",
		background: "rgba(128,128,128,.12)",
		color: "inherit",
		cursor: "pointer",
		font: "inherit",
	},
	danger: { borderColor: "rgba(208,85,63,.6)", color: "#d0553f" },
	table: { borderCollapse: "collapse", width: "100%" },
	th: {
		textAlign: "left",
		padding: "4px 8px",
		borderBottom: "1px solid rgba(128,128,128,.3)",
		fontWeight: 600,
	},
	td: {
		padding: "4px 8px",
		borderBottom: "1px solid rgba(128,128,128,.15)",
		verticalAlign: "top",
	},
} satisfies Record<string, CSSProperties>;
