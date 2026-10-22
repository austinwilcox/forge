import { createFileRoute } from "@tanstack/react-router";
import { finishLogin, type LoginFlow } from "#/server/oidc.server";
import {
	cookie,
	newSession,
	readCookie,
	SESSION_COOKIE,
	SESSION_MAX_AGE_DAYS,
	UID_COOKIE,
	unseal,
} from "#/server/session.server";
import { FLOW_COOKIE } from "./login";

/** The provider redirects here with ?code&state. */
export const Route = createFileRoute("/auth/callback")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const flow = await unseal<LoginFlow>(
					readCookie(request.headers.get("cookie"), FLOW_COOKIE),
				);
				const headers = new Headers({
					"set-cookie": cookie(FLOW_COOKIE, "", { maxAge: 0, path: "/auth" }),
				});
				try {
					if (!flow)
						throw new Error(
							"Sign-in expired or was started in another browser. Try again.",
						);
					const userId = await finishLogin(new URL(request.url).search, flow);
					const maxAge = SESSION_MAX_AGE_DAYS * 86_400;
					headers.append(
						"set-cookie",
						cookie(SESSION_COOKIE, await newSession(userId), { maxAge }),
					);
					headers.append(
						"set-cookie",
						cookie(UID_COOKIE, userId, { maxAge, httpOnly: false }),
					);
					headers.set("location", flow.returnTo);
				} catch (err) {
					console.error("[auth] OIDC callback failed:", err);
					const message = err instanceof Error ? err.message : "Sign-in failed";
					headers.set(
						"location",
						`/login?error=${encodeURIComponent(message)}`,
					);
				}
				return new Response(null, { status: 302, headers });
			},
		},
	},
});
