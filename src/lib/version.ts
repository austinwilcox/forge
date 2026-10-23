declare const __APP_VERSION__: string;
declare const __APP_COMMIT__: string;

/** From package.json, e.g. `0.2.0`. */
export const APP_VERSION = __APP_VERSION__;
/** Short commit SHA of the build, empty outside CI. */
export const APP_COMMIT = __APP_COMMIT__;

/** Human label, e.g. `v0.2.0 · d1c6676` (no commit for local builds). */
export const VERSION_LABEL = [`v${APP_VERSION}`, APP_COMMIT]
	.filter(Boolean)
	.join(" · ");
