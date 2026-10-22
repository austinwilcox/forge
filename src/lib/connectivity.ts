import { onlineManager } from "@tanstack/react-query";

/**
 * "Online" means the Forge server answers, not just that the device has a
 * network. A phone in airplane mode and a Pi that's powered off look the same
 * to the app: TanStack Query pauses queries and queues mutations until a health
 * probe succeeds, then resumes everything on its own.
 */

let serverReachable = true;
let probeTimer: ReturnType<typeof setTimeout> | undefined;
let probeDelay = 2_000;
let probing = false;

const browserOnline = () =>
	typeof navigator === "undefined" || navigator.onLine;

// ── Simulated offline (devtools "Network" panel) ────────────────────────────
// Blocks every server call at the same choke point a real outage hits, so the
// whole offline path — queueing, cached reads, replay — runs for real. Kept in
// sessionStorage so a reload while "offline" stays offline (per tab).
const SIM_KEY = "forge-simulate-offline";
let simulated = false;
const simListeners = new Set<() => void>();

export const isSimulatedOffline = () => simulated;

export function subscribeSimulated(listener: () => void) {
	simListeners.add(listener);
	return () => {
		simListeners.delete(listener);
	};
}

export function setSimulatedOffline(on: boolean) {
	simulated = on;
	try {
		if (on) sessionStorage.setItem(SIM_KEY, "1");
		else sessionStorage.removeItem(SIM_KEY);
	} catch {
		// Storage blocked: the switch still works until reload.
	}
	for (const l of simListeners) l();
	if (on) publish();
	else void probe();
}

/** Called before every server-function request. */
export function assertNetwork() {
	if (simulated) throw new TypeError("Failed to fetch (simulated offline)");
}

function publish() {
	onlineManager.setOnline(!simulated && browserOnline() && serverReachable);
}

function scheduleProbe() {
	clearTimeout(probeTimer);
	probeTimer = setTimeout(probe, probeDelay);
	probeDelay = Math.min(probeDelay * 2, 30_000);
}

export async function probe() {
	if (probing || simulated || !browserOnline()) return;
	probing = true;
	try {
		const res = await fetch("/api/health", { cache: "no-store" });
		if (!res.ok) throw new Error(`health ${res.status}`);
		serverReachable = true;
		probeDelay = 2_000;
		clearTimeout(probeTimer);
	} catch {
		serverReachable = false;
		scheduleProbe();
	} finally {
		probing = false;
		publish();
	}
}

/** Fetch failed, a proxy answered 5xx, or the request never left the device. */
export function isNetworkError(error: unknown) {
	if (error instanceof TypeError) return true;
	const message = error instanceof Error ? error.message : String(error);
	return /failed to fetch|networkerror|load failed|network request failed|fetch failed|\b50[234]\b/i.test(
		message,
	);
}

export const isUnauthorized = (error: unknown) =>
	error instanceof Error && error.message === "UNAUTHORIZED";

let signingIn = false;

/** Called by the server-function client middleware on every failed call. */
export function reportFailure(error: unknown) {
	if (isUnauthorized(error)) {
		// Session expired (or revoked). Pause the queue — it's persisted and
		// replays after sign-in — and send the user to sign in.
		if (signingIn) return;
		signingIn = true;
		onlineManager.setOnline(false);
		const next = encodeURIComponent(
			window.location.pathname + window.location.search,
		);
		setTimeout(() => window.location.assign(`/login?next=${next}`), 50);
		return;
	}
	if (!isNetworkError(error) || !serverReachable) return;
	serverReachable = false;
	publish();
	probeDelay = 2_000;
	scheduleProbe();
}

export function installConnectivity() {
	onlineManager.setEventListener((setOnline) => {
		const onOnline = () => void probe();
		const onOffline = () => setOnline(false);
		const onVisible = () =>
			document.visibilityState === "visible" &&
			!serverReachable &&
			void probe();
		window.addEventListener("online", onOnline);
		window.addEventListener("offline", onOffline);
		document.addEventListener("visibilitychange", onVisible);
		try {
			simulated = sessionStorage.getItem(SIM_KEY) === "1";
		} catch {
			simulated = false;
		}
		setOnline(!simulated && browserOnline());
		return () => {
			window.removeEventListener("online", onOnline);
			window.removeEventListener("offline", onOffline);
			document.removeEventListener("visibilitychange", onVisible);
		};
	});
}
