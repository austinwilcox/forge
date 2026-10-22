import { createFileRoute } from "@tanstack/react-router";
import { type LoginFlow, startLogin } from "#/server/oidc.server";
import { authMode, cookie, seal } from "#/server/session.server";

export const FLOW_COOKIE = "forge_oidc";
const FLOW_TTL_S = 600;

/** Starts the OIDC authorization-code + PKCE flow. */
export const Route = createFileRoute("/auth/login")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				if (authMode() !== "oidc")
					return Response.redirect(new URL("/", request.url), 302);
				const returnTo = new URL(request.url).searchParams.get("next") ?? "/";
				const { url, flow } = await startLogin(returnTo);
				return new Response(null, {
					status: 302,
					headers: {
						location: url.href,
						"set-cookie": cookie(
							FLOW_COOKIE,
							await seal({ ...flow } satisfies LoginFlow, FLOW_TTL_S * 1000),
							{
								maxAge: FLOW_TTL_S,
								path: "/auth",
							},
						),
					},
				});
			},
		},
	},
});
