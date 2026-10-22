import { createFileRoute } from "@tanstack/react-router";
import { logoutUrl } from "#/server/oidc.server";
import {
	authMode,
	cookie,
	SESSION_COOKIE,
	UID_COOKIE,
} from "#/server/session.server";

/** Clears the session; with OIDC also ends the provider session when supported. */
export const Route = createFileRoute("/auth/logout")({
	server: {
		handlers: {
			GET: async () => {
				const headers = new Headers();
				headers.append("set-cookie", cookie(SESSION_COOKIE, "", { maxAge: 0 }));
				headers.append(
					"set-cookie",
					cookie(UID_COOKIE, "", { maxAge: 0, httpOnly: false }),
				);
				headers.set(
					"location",
					(authMode() === "oidc" && (await logoutUrl())) || "/login",
				);
				return new Response(null, { status: 302, headers });
			},
		},
	},
});
