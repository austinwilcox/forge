import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import {
	installConnectivity,
	isNetworkError,
	isUnauthorized,
} from "./lib/connectivity";
import { persistCache, registerSyncMutations, restoreCache } from "./lib/sync";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 15_000,
				// Unreachable server: don't hammer it; connectivity.ts probes and
				// refetches on reconnect. Cached data keeps rendering meanwhile.
				retry: (attempt, error) =>
					!isNetworkError(error) && !isUnauthorized(error) && attempt < 1,
			},
		},
	});
	registerSyncMutations(queryClient);

	if (typeof window !== "undefined") {
		installConnectivity();
		restoreCache(queryClient);
		persistCache(queryClient);
		void queryClient.resumePausedMutations();
	}

	const router = createTanStackRouter({
		routeTree,
		context: { queryClient },
		scrollRestoration: true,
		// Mobile scrolls #app-scroll, not the window (see _app.tsx).
		scrollToTopSelectors: ["#app-scroll"],
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
	});

	setupRouterSsrQueryIntegration({ router, queryClient });

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
