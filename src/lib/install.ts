import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * "Install app" support. Chrome/Edge/Android fire `beforeinstallprompt` when
 * the app is installable; we hold on to it so Settings can offer an Install
 * button. iOS has no prompt API — Safari users add it from the Share sheet.
 */
interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => {
	for (const l of listeners) l();
};

export function captureInstallPrompt() {
	window.addEventListener("beforeinstallprompt", (e) => {
		e.preventDefault();
		deferred = e as BeforeInstallPromptEvent;
		emit();
	});
	window.addEventListener("appinstalled", () => {
		deferred = null;
		emit();
	});
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export async function promptInstall() {
	if (!deferred) return;
	await deferred.prompt();
	await deferred.userChoice;
	deferred = null;
	emit();
}

export type InstallState =
	| "installed"
	| "promptable"
	| "ios"
	| "insecure"
	| "unsupported";

export function useInstallState(): InstallState | null {
	const canPrompt = useSyncExternalStore(
		subscribe,
		() => deferred !== null,
		() => false,
	);
	const [env, setEnv] = useState<{
		standalone: boolean;
		ios: boolean;
		secure: boolean;
	} | null>(null);
	useEffect(() => {
		const nav = navigator as Navigator & { standalone?: boolean };
		setEnv({
			standalone:
				window.matchMedia("(display-mode: standalone)").matches ||
				nav.standalone === true,
			ios:
				/iphone|ipad|ipod/i.test(navigator.userAgent) ||
				(navigator.maxTouchPoints > 1 &&
					/macintosh/i.test(navigator.userAgent)),
			secure: window.isSecureContext,
		});
	}, []);
	if (!env) return null; // not known until mounted in the browser
	if (env.standalone) return "installed";
	if (canPrompt) return "promptable";
	if (env.ios) return "ios";
	if (!env.secure) return "insecure";
	return "unsupported";
}
