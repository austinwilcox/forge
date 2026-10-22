import { randomUUID } from "node:crypto";
import * as oidc from "openid-client";
import { getDb } from "./db/client";
import { LOCAL_USER } from "./session.server";

/**
 * OpenID Connect relying party (authorization code + PKCE). Works with any
 * standards-compliant provider: Authentik, Authelia, Keycloak, Pocket ID,
 * Zitadel, Google, Entra ID, Auth0, ...
 */

const env = () => ({
	issuer: process.env.OIDC_ISSUER ?? "",
	clientId: process.env.OIDC_CLIENT_ID ?? "",
	clientSecret: process.env.OIDC_CLIENT_SECRET || undefined,
	scopes: process.env.OIDC_SCOPES || "openid profile email",
	appUrl: (process.env.APP_URL ?? "").replace(/\/+$/, ""),
	allowed: (process.env.OIDC_ALLOWED_EMAILS ?? "")
		.split(",")
		.map((s) => s.trim().toLowerCase())
		.filter(Boolean),
});

export const providerName = () =>
	process.env.OIDC_PROVIDER_NAME || "single sign-on";

export function appUrl() {
	const url = env().appUrl;
	if (!url)
		throw new Error(
			"APP_URL must be set (e.g. https://forge.example.com) when OIDC is enabled",
		);
	return url;
}

export const redirectUri = () => `${appUrl()}/auth/callback`;

let configPromise: Promise<oidc.Configuration> | undefined;

export function oidcConfig() {
	configPromise ??= (async () => {
		const { issuer, clientId, clientSecret } = env();
		const server = new URL(issuer);
		const auth = clientSecret
			? oidc.ClientSecretBasic(clientSecret)
			: oidc.None();
		// Plain-http issuers are only acceptable on a lab network / for testing.
		const options =
			server.protocol === "http:"
				? { execute: [oidc.allowInsecureRequests] }
				: undefined;
		return oidc.discovery(server, clientId, undefined, auth, options);
	})().catch((err) => {
		configPromise = undefined;
		throw err;
	});
	return configPromise;
}

export interface LoginFlow {
	verifier: string;
	state: string;
	nonce: string;
	returnTo: string;
}

export async function startLogin(returnTo: string) {
	const config = await oidcConfig();
	const flow: LoginFlow = {
		verifier: oidc.randomPKCECodeVerifier(),
		state: oidc.randomState(),
		nonce: oidc.randomNonce(),
		returnTo:
			returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/",
	};
	const url = oidc.buildAuthorizationUrl(config, {
		redirect_uri: redirectUri(),
		scope: env().scopes,
		code_challenge: await oidc.calculatePKCECodeChallenge(flow.verifier),
		code_challenge_method: "S256",
		state: flow.state,
		nonce: flow.nonce,
	});
	return { url, flow };
}

/** Exchanges the code, validates the ID token, and returns the local user id. */
export async function finishLogin(callbackSearch: string, flow: LoginFlow) {
	const config = await oidcConfig();
	// Rebuild the URL from APP_URL: behind a reverse proxy the request URL the
	// server sees is not the one the provider redirected the browser to.
	const tokens = await oidc.authorizationCodeGrant(
		config,
		new URL(`${redirectUri()}${callbackSearch}`),
		{
			pkceCodeVerifier: flow.verifier,
			expectedState: flow.state,
			expectedNonce: flow.nonce,
			idTokenExpected: true,
		},
	);
	const claims = tokens.claims();
	if (!claims) throw new Error("Provider returned no ID token");

	const email =
		typeof claims.email === "string" ? claims.email.toLowerCase() : null;
	const { allowed } = env();
	if (
		allowed.length &&
		!(
			email &&
			allowed.some((a) => (a.startsWith("@") ? email.endsWith(a) : email === a))
		)
	) {
		throw new Error("This account isn't allowed on this Forge");
	}
	const name =
		(typeof claims.name === "string" && claims.name) ||
		(typeof claims.preferred_username === "string" &&
			claims.preferred_username) ||
		null;
	return upsertUser(claims.iss, claims.sub, email, name);
}

async function upsertUser(
	issuer: string,
	subject: string,
	email: string | null,
	name: string | null,
) {
	const db = await getDb();
	const now = new Date().toISOString();
	return db.transaction().execute(async (trx) => {
		const existing = await trx
			.selectFrom("users")
			.select("id")
			.where("issuer", "=", issuer)
			.where("subject", "=", subject)
			.executeTakeFirst();
		if (existing) {
			await trx
				.updateTable("users")
				.set({ email, name, last_login_at: now })
				.where("id", "=", existing.id)
				.execute();
			return existing.id;
		}
		const id = randomUUID();
		const { count } = await trx
			.selectFrom("users")
			.select((eb) => eb.fn.countAll<number>().as("count"))
			.executeTakeFirstOrThrow();
		await trx
			.insertInto("users")
			.values({
				id,
				issuer,
				subject,
				email,
				name,
				created_at: now,
				last_login_at: now,
			})
			.execute();
		// Upgrading a single-tenant install: the first person to sign in inherits
		// the data that was created before OIDC was switched on.
		if (Number(count) === 0) {
			await trx
				.updateTable("habits")
				.set({ user_id: id })
				.where("user_id", "=", LOCAL_USER)
				.execute();
			await trx
				.updateTable("debriefs")
				.set({ user_id: id })
				.where("user_id", "=", LOCAL_USER)
				.execute();
			await trx
				.updateTable("settings")
				.set({ user_id: id })
				.where("user_id", "=", LOCAL_USER)
				.execute();
		}
		return id;
	});
}

export async function logoutUrl() {
	try {
		const config = await oidcConfig();
		if (!config.serverMetadata().end_session_endpoint) return null;
		return oidc.buildEndSessionUrl(config, {
			post_logout_redirect_uri: `${appUrl()}/login`,
			client_id: env().clientId,
		}).href;
	} catch {
		return null;
	}
}

export async function userInfo(id: string) {
	const db = await getDb();
	return (
		(await db
			.selectFrom("users")
			.select(["id", "email", "name"])
			.where("id", "=", id)
			.executeTakeFirst()) ?? null
	);
}
