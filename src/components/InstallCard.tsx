import { promptInstall, useInstallState } from "#/lib/install";
import { Icon } from "./Icon";

/** Settings card: install Forge to the home screen / dock. */
export function InstallCard() {
	const state = useInstallState();
	if (!state) return null;

	return (
		<section className="card space-y-3 p-6">
			<h2 className="font-bold uppercase tracking-wider">Install app</h2>
			{state === "installed" && (
				<p className="text-olive text-sm">
					Installed. You're running Forge as an app.
				</p>
			)}
			{state === "promptable" && (
				<>
					<p className="text-muted text-sm">
						Add Forge to your home screen or dock. It opens full screen like a
						native app and works offline.
					</p>
					<button
						type="button"
						className="btn-primary"
						onClick={() => void promptInstall()}
					>
						<Icon name="download" size={16} /> Install Forge
					</button>
				</>
			)}
			{state === "ios" && (
				<ol className="list-decimal space-y-1 pl-5 text-ink-2 text-sm">
					<li>
						Open this page in <b>Safari</b>.
					</li>
					<li>
						Tap <b>Share</b> (the square with the arrow), then{" "}
						<b>Add to Home Screen</b>.
					</li>
					<li>
						Open Forge from your home screen. It runs full screen and works
						offline.
					</li>
				</ol>
			)}
			{state === "insecure" && (
				<p className="text-muted text-sm">
					Installing needs HTTPS. You're on plain{" "}
					<code className="font-mono">http://</code>, so browsers won't offer to
					install, and the app can't open offline. Serve Forge over HTTPS (for
					example <code className="font-mono">tailscale serve 3000</code>), then
					come back here.
				</p>
			)}
			{state === "unsupported" && (
				<p className="text-muted text-sm">
					Use your browser's menu: <b>Install app</b> or{" "}
					<b>Add to Home Screen</b>. If neither appears, try Chrome, Edge or
					Safari.
				</p>
			)}
		</section>
	);
}
