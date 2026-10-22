import {
	onlineManager,
	type QueryKey,
	queryOptions,
	useMutation,
	useMutationState,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { useMemo, useSyncExternalStore } from "react";
import { getAuthStatus } from "#/server/auth";
import {
	createHabit,
	deleteHabit,
	getProfile,
	installStarterProtocol,
	listDebriefs,
	listHabits,
	listLogs,
	reorderHabits,
	saveProfile,
	setHabitArchived,
	updateHabit,
} from "#/server/functions";
import { addDays, type ISODate, today } from "./dates";
import {
	buildStats,
	type Habit,
	heatmap,
	indexLogs,
	type StreakInfo,
	streakInfo,
} from "./habits";
import type { DebriefInput, LogInput, StatsRange } from "./schemas";
import { SYNC_KEYS } from "./sync";

/** How much history each device keeps locally: a year of stats plus margin. */
const HISTORY_DAYS = 400;
/** Pick up changes made on other devices. */
const POLL_MS = 60_000;

// ── Queries: the device's local copy ────────────────────────────────────────

export const authQuery = () =>
	queryOptions({
		queryKey: ["auth"],
		queryFn: () => getAuthStatus(),
		staleTime: 60_000,
	});

export const habitsQuery = () =>
	queryOptions({
		queryKey: ["habits"],
		queryFn: () => listHabits({ data: { includeArchived: true } }),
		refetchInterval: POLL_MS,
	});

export const logsQuery = () =>
	queryOptions({
		queryKey: ["logs"],
		queryFn: () =>
			listLogs({ data: { since: addDays(today(), -HISTORY_DAYS) } }),
		refetchInterval: POLL_MS,
	});

export const debriefsQuery = () =>
	queryOptions({
		queryKey: ["debriefs"],
		queryFn: () =>
			listDebriefs({ data: { since: addDays(today(), -HISTORY_DAYS) } }),
		refetchInterval: POLL_MS,
	});

export const profileQuery = () =>
	queryOptions({ queryKey: ["profile"], queryFn: () => getProfile() });

/** Everything Today, Debrief and Progress derive from. */
export const dayQueries = () =>
	[habitsQuery(), logsQuery(), debriefsQuery(), profileQuery()] as const;

// ── Derived views (computed on the device, so they work offline) ────────────

export type DayHabit = Habit & { streak: StreakInfo };

export function useDay(date: ISODate) {
	const { data: habits } = useSuspenseQuery(habitsQuery());
	const { data: logs } = useSuspenseQuery(logsQuery());
	const { data: debriefs } = useSuspenseQuery(debriefsQuery());
	const { data: profile } = useSuspenseQuery(profileQuery());
	return useMemo(() => {
		const index = indexLogs(logs);
		return {
			date,
			index,
			habits: habits.map(
				(h): DayHabit => ({ ...h, streak: streakInfo(h, index, date) }),
			),
			logs: logs.filter((l) => l.date === date),
			debrief: debriefs.find((d) => d.date === date) ?? null,
			debriefs,
			profile,
		};
	}, [date, habits, logs, debriefs, profile]);
}

export function useStats(range: StatsRange) {
	const { data: habits } = useSuspenseQuery(habitsQuery());
	const { data: logs } = useSuspenseQuery(logsQuery());
	const { data: debriefs } = useSuspenseQuery(debriefsQuery());
	return useMemo(() => {
		const end = today();
		const start = addDays(end, -(range - 1));
		return {
			...buildStats(habits, logs, end, range),
			heatmap: heatmap(habits, logs, end),
			ratings: debriefs
				.filter((d) => d.rating != null && d.date >= start && d.date <= end)
				.map((d) => ({ date: d.date, rating: d.rating ?? 0 }))
				.sort((a, b) => a.date.localeCompare(b.date)),
		};
	}, [habits, logs, debriefs, range]);
}

// ── Offline-capable writes (queued while offline, replayed in order) ────────

export function useLogHabit() {
	const m = useMutation<unknown, Error, LogInput>({
		mutationKey: SYNC_KEYS.setLog,
	});
	return (vars: Omit<LogInput, "updatedAt">) =>
		m.mutate({ ...vars, updatedAt: new Date().toISOString() });
}

export function useSaveDebrief() {
	const m = useMutation<unknown, Error, DebriefInput>({
		mutationKey: SYNC_KEYS.saveDebrief,
	});
	return (vars: Omit<DebriefInput, "updatedAt">) =>
		m.mutate({ ...vars, updatedAt: new Date().toISOString() });
}

// ── Online-only writes (fail fast with a clear message when offline) ────────

export const OFFLINE_EDIT_MESSAGE =
	"You're offline. Changing habits needs a connection to your Forge server.";

function useOnlineMutation<TVars, TData>(
	mutationFn: (vars: TVars) => Promise<TData>,
	invalidate: QueryKey = ["habits"],
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (vars: TVars) => {
			if (!onlineManager.isOnline())
				return Promise.reject(new Error(OFFLINE_EDIT_MESSAGE));
			return mutationFn(vars);
		},
		networkMode: "always",
		retry: false,
		onSuccess: () => qc.invalidateQueries({ queryKey: invalidate }),
	});
}

export const useCreateHabit = () => useOnlineMutation(createHabit);
export const useUpdateHabit = () => useOnlineMutation(updateHabit);
export const useSetArchived = () =>
	useOnlineMutation((vars: { id: string; archivedOn: ISODate | null }) =>
		setHabitArchived({ data: vars }),
	);
export const useDeleteHabit = () =>
	useOnlineMutation((id: string) => deleteHabit({ data: { id } }));
export const useReorderHabits = () =>
	useOnlineMutation((ids: string[]) => reorderHabits({ data: { ids } }));
export const useInstallStarter = () =>
	useOnlineMutation((startDate: ISODate) =>
		installStarterProtocol({ data: { startDate } }),
	);

export const useSaveProfile = () => useOnlineMutation(saveProfile, ["profile"]);

// ── Sync status ─────────────────────────────────────────────────────────────

export function useOnline() {
	return useSyncExternalStore(
		(cb) => onlineManager.subscribe(cb),
		() => onlineManager.isOnline(),
		() => true,
	);
}

/** Writes made on this device that the server hasn't confirmed yet. */
export function usePendingWrites() {
	return useMutationState({
		filters: { mutationKey: ["sync"], status: "pending" },
	}).length;
}
