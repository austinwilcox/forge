import type { SVGProps } from "react";

/**
 * Tiny inline icon set (24px grid, stroke-based) so the app has zero runtime
 * icon dependencies and works fully offline on a Pi.
 */
const paths = {
	today: (
		<path d="M12 3v2m0 14v2M5.6 5.6l1.4 1.4m10 10 1.4 1.4M3 12h2m14 0h2M5.6 18.4 7 17M17 7l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
	),
	habits: <path d="M4 6h16M4 12h16M4 18h10" />,
	debrief: (
		<path d="M7 4h10a2 2 0 0 1 2 2v14l-4-2-3 2-3-2-4 2V6a2 2 0 0 1 2-2Zm2 5h6m-6 4h4" />
	),
	progress: <path d="M4 20V10m6 10V4m6 16v-7m6 7H2" />,
	manual: (
		<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Zm0 14a2 2 0 0 1 2-2h13" />
	),
	settings: (
		<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-4l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z" />
	),
	check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
	plus: <path d="M12 5v14M5 12h14" />,
	minus: <path d="M5 12h14" />,
	flame: (
		<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 1.6 1 2.5 2 3-.5-3 0-6 1-8.5Z" />
	),
	clock: <path d="M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
	pin: (
		<path d="M12 21s-6-5.5-6-11a6 6 0 1 1 12 0c0 5.5-6 11-6 11Zm0-9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
	),
	link: (
		<path d="M9 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3M13 4h7v7m0-7-9 9" />
	),
	stack: <path d="m4 9 8-5 8 5-8 5-8-5Zm0 6 8 5 8-5" />,
	bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
	chevronLeft: <path d="m15 18-6-6 6-6" />,
	chevronRight: <path d="m9 18 6-6-6-6" />,
	up: <path d="m6 15 6-6 6 6" />,
	down: <path d="m6 9 6 6 6-6" />,
	edit: <path d="M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4" />,
	archive: <path d="M3 5h18v4H3V5Zm2 4v10h14V9M10 13h4" />,
	trash: <path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
	sun: (
		<path d="M12 4V2m0 20v-2m8-8h2M2 12h2m13.7-5.7 1.4-1.4M4.9 19.1l1.4-1.4m0-11.4L4.9 4.9m14.2 14.2-1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
	),
	moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />,
	alert: (
		<path d="M12 9v4m0 4h.01M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
	),
	eye: (
		<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
	),
	eyeOff: (
		<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.9M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2" />
	),
	download: <path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v3h16v-3" />,
	logout: <path d="M15 4h4v16h-4M10 8l-4 4 4 4m-4-4h11" />,
	target: (
		<path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
	),
} as const;

export type IconName = keyof typeof paths;

export function Icon({
	name,
	size = 18,
	...rest
}: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.8}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			{...rest}
		>
			{paths[name]}
		</svg>
	);
}
