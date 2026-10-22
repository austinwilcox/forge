import {
	type PersistedClient,
	type PersistedQueryClientSaveOptions,
	persistQueryClientSave,
	persistQueryClientSubscribe,
} from "@tanstack/query-persist-client-core";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import {
	type EnsureQueryDataOptions,
	hydrate,
	onlineManager,
	type QueryClient,
	type QueryKey,
} from "@tanstack/react-query";
import { saveDebrief, setLog } from "#/server/functions";
import type { Debrief } from "#/server/repo";
import { isNetworkError, isUnauthorized } from "./connectivity";
import type { HabitLog } from "./habits";
import type { DebriefInput, LogInput } from "./schemas";

/**
 * Offline-first plumbing, built on TanStack Query:
 *
 * - Daily writes (check-offs, mission, debrief) are registered as mutation
 *   defaults, so a queued write can be replayed after a reload: the queue is
 *   persisted, and its function is looked up again by key.
 * - Writes share one scope, so they replay in the order they were made.
 * - Network failures retry forever; while the server is unreachable the
 *   retryer pauses (see connectivity.ts), app errors fail immediately.
 * - The query cache is mirrored to localStorage and restored synchronously at
 *   startup, so loaders see last-known data before anything renders.
 */

export const SYNC_KEYS = {
	setLog: ["sync", "setLog"],
	saveDebrief: ["sync", "saveDebrief"],
} as const;

const retry = (_attempt: number, error: unknown) =>
	isNetworkError(error) || isUnauthorized(error);
const retryDelay = (attempt: number) => Math.min(1_000 * 2 ** attempt, 30_000);

/** Refetch once the queue has drained, to pick up other devices' changes. */
function settle(qc: QueryClient, queryKey: QueryKey) {
	if (qc.isMutating({ mutationKey: ["sync"] }) <= 1)
		return qc.invalidateQueries({ queryKey });
}

export function registerSyncMutations(qc: QueryClient) {
	qc.setMutationDefaults(SYNC_KEYS.setLog, {
		mutationFn: (vars: LogInput) => setLog({ data: vars }),
		scope: { id: "sync" },
		retry,
		retryDelay,
		onMutate: async (vars: LogInput) => {
			await qc.cancelQueries({ queryKey: ["logs"] });
			qc.setQueryData<HabitLog[]>(["logs"], (old = []) => [
				...old.filter(
					(l) => !(l.habitId === vars.habitId && l.date === vars.date),
				),
				{
					habitId: vars.habitId,
					date: vars.date,
					value: vars.value,
					minimum: vars.minimum ?? false,
					note: vars.note ?? null,
				},
			]);
		},
		// Rejected by the server (not a network problem): resync to its truth.
		onError: () => qc.invalidateQueries({ queryKey: ["logs"] }),
		onSettled: () => settle(qc, ["logs"]),
	});

	qc.setMutationDefaults(SYNC_KEYS.saveDebrief, {
		mutationFn: (vars: DebriefInput) => saveDebrief({ data: vars }),
		scope: { id: "sync" },
		retry,
		retryDelay,
		onMutate: async ({ updatedAt, ...vars }: DebriefInput) => {
			await qc.cancelQueries({ queryKey: ["debriefs"] });
			const patch = Object.fromEntries(
				Object.entries(vars)
					.map(([k, v]) => [
						k,
						typeof v === "string" && v.trim() === "" ? null : v,
					])
					.filter(([, v]) => v !== undefined),
			) as Partial<Debrief>;
			qc.setQueryData<Debrief[]>(["debriefs"], (old = []) => {
				const current = old.find((d) => d.date === vars.date);
				const blank = {
					mission: null,
					wins: null,
					losses: null,
					ownership: null,
					adjust: null,
					rating: null,
				};
				const next = {
					...blank,
					...current,
					...patch,
					date: vars.date,
					updatedAt,
				} as Debrief;
				return [next, ...old.filter((d) => d.date !== vars.date)].sort((a, b) =>
					b.date.localeCompare(a.date),
				);
			});
		},
		onError: () => qc.invalidateQueries({ queryKey: ["debriefs"] }),
		onSettled: () => settle(qc, ["debriefs"]),
	});
}

// ── Persistence ─────────────────────────────────────────────────────────────

/**
 * One cache per signed-in user, so a shared device never shows one tenant's
 * data (or replays their queue) under another's session. The uid cookie is
 * set at sign-in; single-tenant installs are always "local".
 */
function cacheKey() {
	const uid =
		document.cookie.match(/(?:^|;\s*)forge_uid=([^;]+)/)?.[1] ?? "local";
	return `forge-cache:${decodeURIComponent(uid)}`;
}
/** Bump when the shape of cached data changes between releases. */
const BUSTER = "forge-sync-1";
const MAX_AGE = 30 * 86_400_000;
const PERSISTED_QUERIES = new Set([
	"auth",
	"habits",
	"logs",
	"debriefs",
	"profile",
]);

/** Synchronous so the first render and route loaders already see the cache. */
export function restoreCache(qc: QueryClient) {
	try {
		const raw = localStorage.getItem(cacheKey());
		if (!raw) return;
		const saved = JSON.parse(raw) as PersistedClient;
		if (saved.buster !== BUSTER || Date.now() - saved.timestamp > MAX_AGE) {
			localStorage.removeItem(cacheKey());
			return;
		}
		// A write that was in flight when the page closed is replayed like any
		// other queued write.
		for (const m of saved.clientState.mutations) m.state.isPaused = true;
		hydrate(qc, saved.clientState);
	} catch {
		localStorage.removeItem(cacheKey());
	}
}

export function persistCache(qc: QueryClient) {
	const options: PersistedQueryClientSaveOptions = {
		queryClient: qc,
		persister: createSyncStoragePersister({
			storage: window.localStorage,
			key: cacheKey(),
			throttleTime: 250,
		}),
		buster: BUSTER,
		dehydrateOptions: {
			shouldDehydrateQuery: (q) =>
				q.state.status === "success" &&
				PERSISTED_QUERIES.has(String(q.queryKey[0])),
			shouldDehydrateMutation: (m) => m.state.status === "pending",
		},
	};
	persistQueryClientSubscribe(options);
	// The throttled save might not run before the tab is closed.
	window.addEventListener(
		"pagehide",
		() => void persistQueryClientSave(options),
	);
}

export function clearCache() {
	try {
		localStorage.removeItem(cacheKey());
	} catch {
		// Storage unavailable: nothing was persisted either.
	}
}

// ── Loaders ─────────────────────────────────────────────────────────────────

export class OfflineUncachedError extends Error {
	constructor() {
		super(
			"This page hasn't been loaded on this device yet, and the server can't be reached.",
		);
	}
}

/**
 * Route loader helper: cached data renders immediately (and refreshes in the
 * background when stale); only data never seen on this device needs the server.
 */
// biome-ignore lint/suspicious/noExplicitAny: a heterogeneous list of query options; each keeps its own types at the call site
type AnyQueryOptions = EnsureQueryDataOptions<any, any, any, any>;

export async function preload(qc: QueryClient, ...queries: AnyQueryOptions[]) {
	await Promise.all(
		queries.map(async (options) => {
			if (qc.getQueryData(options.queryKey) !== undefined) {
				void qc.prefetchQuery(options);
				return;
			}
			if (typeof window !== "undefined" && !onlineManager.isOnline())
				throw new OfflineUncachedError();
			await qc.ensureQueryData(options);
		}),
	);
}
