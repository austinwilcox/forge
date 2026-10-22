import {
	createHash,
	createHmac,
	randomBytes,
	timingSafeEqual,
} from "node:crypto";
import { getDb } from "./db/client";

/**
 * Who is making this request. Server-only: never import from client code.
 *
 * Modes, picked from the environment:
 *   oidc      OIDC_ISSUER + OIDC_CLIENT_ID set. Sign-in required, one tenant
 *             per identity (multi-tenant).
 *   password  APP_PASSWORD set. Single tenant behind a passcode.
 *   none      Single tenant, no sign-in (a Pi on a trusted LAN).
 */
export type AuthMode = "oidc" | "password" | "none";

export const SESSION_COOKIE = "forge_session";
/** Readable by the page (not a secret): namespaces the device's offline cache. */
export const UID_COOKIE = "forge_uid";
export const SESSION_MAX_AGE_DAYS = 30;
/** Owner of all data on single-tenant installs. */
export const LOCAL_USER = "local";

let warnedOpen = false;

export function authMode(): AuthMode {
	if (process.env.OIDC_ISSUER && process.env.OIDC_CLIENT_ID) return "oidc";
	if (process.env.APP_PASSWORD) return "password";
	// A public https URL (Cloudflare Tunnel, reverse proxy) with no sign-in
	// means anyone with the link can read and change the data.
	if (!warnedOpen && process.env.APP_URL?.startsWith("https://")) {
		warnedOpen = true;
		console.warn(
			`[auth] WARNING: ${process.env.APP_URL} is served with no sign-in. Anyone with the URL can use this Forge. Set OIDC_* or APP_PASSWORD.`,
		);
	}
	return "none";
}

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

function safeEqual(a: string, b: string) {
	const ab = Buffer.from(a);
	const bb = Buffer.from(b);
	return ab.length === bb.length && timingSafeEqual(ab, bb);
}

let instanceSecret: Promise<string> | undefined;

/** SESSION_SECRET, or a random secret generated once and kept in the database. */
function baseSecret() {
	instanceSecret ??= (async () => {
		if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
		const db = await getDb();
		await db
			.insertInto("instance")
			.values({
				key: "session_secret",
				value: randomBytes(32).toString("base64url"),
			})
			.onConflict((oc) => oc.column("key").doNothing())
			.execute();
		const row = await db
			.selectFrom("instance")
			.select("value")
			.where("key", "=", "session_secret")
			.executeTakeFirstOrThrow();
		return row.value;
	})().catch((err) => {
		instanceSecret = undefined;
		throw err;
	});
	return instanceSecret;
}

async function sign(payload: string) {
	// Changing APP_PASSWORD signs everyone out.
	const key =
		authMode() === "password"
			? `${await baseSecret()}:${sha256(process.env.APP_PASSWORD ?? "")}`
			: await baseSecret();
	return createHmac("sha256", key).update(payload).digest("base64url");
}

/** Tamper-proof (not encrypted) cookie value with an expiry. */
export async function seal(data: Record<string, unknown>, maxAgeMs: number) {
	const payload = Buffer.from(
		JSON.stringify({ ...data, exp: Date.now() + maxAgeMs }),
	).toString("base64url");
	return `${payload}.${await sign(payload)}`;
}

export async function unseal<T>(value: string | undefined): Promise<T | null> {
	if (!value) return null;
	const [payload, sig] = value.split(".");
	if (!payload || !sig || !safeEqual(sig, await sign(payload))) return null;
	try {
		const data = JSON.parse(Buffer.from(payload, "base64url").toString());
		return typeof data.exp === "number" && data.exp > Date.now()
			? (data as T)
			: null;
	} catch {
		return null;
	}
}

export const newSession = (uid: string) =>
	seal({ uid }, SESSION_MAX_AGE_DAYS * 86_400_000);

/** The user this request acts as, or null when sign-in is required. */
export async function sessionUser(
	cookie: string | undefined,
): Promise<string | null> {
	const mode = authMode();
	if (mode === "none") return LOCAL_USER;
	const session = await unseal<{ uid: string }>(cookie);
	if (!session) return null;
	return mode === "password" ? LOCAL_USER : session.uid;
}

/** Hash both sides so the comparison is constant-time regardless of length. */
export function checkPassword(given: string) {
	return (
		authMode() === "password" &&
		safeEqual(sha256(given), sha256(process.env.APP_PASSWORD ?? ""))
	);
}

/** Plain Set-Cookie serialization for server routes that build their own Response. */
export function cookie(
	name: string,
	value: string,
	opts: { maxAge?: number; httpOnly?: boolean; path?: string } = {},
) {
	const parts = [
		`${name}=${value}`,
		`Path=${opts.path ?? "/"}`,
		"SameSite=Lax",
	];
	if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
	if (opts.httpOnly !== false) parts.push("HttpOnly");
	if (secureCookies()) parts.push("Secure");
	return parts.join("; ");
}

export function secureCookies() {
	if (process.env.COOKIE_SECURE) return process.env.COOKIE_SECURE === "true";
	return (process.env.APP_URL ?? "").startsWith("https://");
}

export function readCookie(header: string | null, name: string) {
	for (const part of header?.split(";") ?? []) {
		const [k, ...v] = part.trim().split("=");
		if (k === name) return v.join("=");
	}
	return undefined;
}
