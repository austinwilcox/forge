import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { NetworkDevtoolsPanel } from "./NetworkDevtoolsPanel";

export default function Devtools() {
	return (
		<TanStackDevtools
			config={{ position: "bottom-right" }}
			plugins={[
				{ name: "Network", render: <NetworkDevtoolsPanel /> },
				{ name: "TanStack Router", render: <TanStackRouterDevtoolsPanel /> },
				{ name: "TanStack Query", render: <ReactQueryDevtoolsPanel /> },
			]}
		/>
	);
}
