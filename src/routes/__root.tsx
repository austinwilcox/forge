import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { lazy, Suspense, useEffect } from "react";
import { captureInstallPrompt } from "#/lib/install";
import { themeBootScript, useUi } from "#/stores/ui";
import appCss from "../styles.css?url";

interface RouterContext {
	queryClient: QueryClient;
}

const Devtools = import.meta.env.DEV
	? lazy(() => import("#/components/Devtools"))
	: () => null;

export const Route = createRootRouteWithContext<RouterContext>()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1, viewport-fit=cover",
			},
			{ name: "theme-color", content: "#0b0c0a" },
			// Installed on an iPhone home screen: full screen, dark status bar
			// drawn over the app (the header pads for the notch).
			{ name: "mobile-web-app-capable", content: "yes" },
			{ name: "apple-mobile-web-app-capable", content: "yes" },
			{ name: "apple-mobile-web-app-title", content: "Forge" },
			{
				name: "apple-mobile-web-app-status-bar-style",
				content: "black-translucent",
			},
			{
				name: "description",
				content: "Forge — a self-hosted discipline and habit tracker.",
			},
			{ title: "Forge · Discipline Tracker" },
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
			{ rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
			// Credentialed so it still loads behind an auth proxy (e.g. Cloudflare Access).
			{
				rel: "manifest",
				href: "/manifest.webmanifest",
				crossOrigin: "use-credentials",
			},
		],
		scripts: [{ children: themeBootScript }],
	}),
	shellComponent: RootDocument,
});

/**
 * Production only: lets the app open with no connection. Service workers need
 * a secure context — localhost or HTTPS (see README, "Offline use").
 */
function registerServiceWorker() {
	if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
	navigator.serviceWorker
		.register("/sw.js")
		.then(() => navigator.serviceWorker.ready)
		.then((reg) => reg.active?.postMessage("warm"))
		.catch(() => {
			// Not a secure context, or blocked: the app still works online.
		});
}

function ThemeSync() {
	const theme = useUi((s) => s.theme);
	useEffect(() => {
		useUi.persist.rehydrate();
		registerServiceWorker();
		captureInstallPrompt();
	}, []);
	useEffect(() => {
		document.documentElement.classList.toggle("light", theme === "light");
		// Browser chrome / Android status bar follows the app theme.
		document
			.querySelector('meta[name="theme-color"]')
			?.setAttribute("content", theme === "light" ? "#f2efe6" : "#0b0c0a");
	}, [theme]);
	return null;
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body>
				<ThemeSync />
				{children}
				<Suspense>
					<Devtools />
				</Suspense>
				<Scripts />
			</body>
		</html>
	);
}
