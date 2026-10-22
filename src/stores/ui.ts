import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { StatsRange } from "#/lib/schemas";

/**
 * Client-only UI preferences. Server data lives in TanStack Query; this store
 * only holds how the user likes to look at it.
 */
export type Theme = "dark" | "light";

interface UiState {
	theme: Theme;
	statsRange: StatsRange;
	/** Hide habits already completed on the Today screen. */
	hideCompleted: boolean;
	setTheme: (theme: Theme) => void;
	toggleTheme: () => void;
	setStatsRange: (range: StatsRange) => void;
	toggleHideCompleted: () => void;
}

export const UI_STORAGE_KEY = "forge-ui";

export const useUi = create<UiState>()(
	persist(
		(set) => ({
			theme: "dark",
			statsRange: 30,
			hideCompleted: false,
			setTheme: (theme) => set({ theme }),
			toggleTheme: () =>
				set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
			setStatsRange: (statsRange) => set({ statsRange }),
			toggleHideCompleted: () =>
				set((s) => ({ hideCompleted: !s.hideCompleted })),
		}),
		{
			name: UI_STORAGE_KEY,
			storage: createJSONStorage(() => localStorage),
			partialize: ({ theme, statsRange, hideCompleted }) => ({
				theme,
				statsRange,
				hideCompleted,
			}),
			skipHydration: true,
		},
	),
);

/** Runs before first paint (inlined in <head>) so the theme never flashes. */
export const themeBootScript = `try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(UI_STORAGE_KEY)})||"{}");if(s.state&&s.state.theme==="light")document.documentElement.classList.add("light")}catch(e){}`;
