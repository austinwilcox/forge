import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { assertNetwork, reportFailure } from "#/lib/connectivity";
import { providerName, userInfo } from "./oidc.server";
import {
	authMode,
	checkPassword,
	LOCAL_USER,
	newSession,
	SESSION_COOKIE,
	SESSION_MAX_AGE_DAYS,
	secureCookies,
	sessionUser,
	UID_COOKIE,
} from "./session.server";

/**
 * Attach to every data server function. The server half resolves which
 * tenant the request belongs to and hands it to the handler as
 * `context.userId`; the client half reports unreachable servers and expired
 * sessions so queued offline writes pause instead of failing.
 */
export const authMiddleware = createMiddleware({ type: "function" })
	.client(async ({ next }) => {
		try {
			assertNetwork();
			return await next();
		} catch (error) {
			reportFailure(error);
			throw error;
		}
	})
	.server(async ({ next }) => {
		const userId = await sessionUser(getCookie(SESSION_COOKIE));
		if (!userId) throw new Error("UNAUTHORIZED");
		return next({ context: { userId } });
	});

export const getAuthStatus = createServerFn({ method: "GET" }).handler(
	async () => {
		const mode = authMode();
		const userId = await sessionUser(getCookie(SESSION_COOKIE));
		const user = mode === "oidc" && userId ? await userInfo(userId) : null;
		return {
			mode,
			authed: Boolean(userId) && (mode !== "oidc" || Boolean(user)),
			user,
			provider: mode === "oidc" ? providerName() : null,
		};
	},
);

/** Passcode sign-in (single-tenant "password" mode). OIDC uses /auth/login. */
export const login = createServerFn({ method: "POST" })
	.validator(z.object({ password: z.string().min(1).max(200) }))
	.handler(async ({ data }) => {
		if (authMode() !== "password") return { ok: authMode() === "none" };
		if (!checkPassword(data.password)) {
			await new Promise((r) => setTimeout(r, 400));
			return { ok: false };
		}
		const options = {
			sameSite: "lax",
			secure: secureCookies(),
			path: "/",
			maxAge: SESSION_MAX_AGE_DAYS * 86_400,
		} as const;
		setCookie(SESSION_COOKIE, await newSession(LOCAL_USER), {
			...options,
			httpOnly: true,
		});
		setCookie(UID_COOKIE, LOCAL_USER, options);
		return { ok: true };
	});
