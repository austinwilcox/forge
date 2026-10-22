import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "#/server/db/client";
import {
	readCookie,
	SESSION_COOKIE,
	sessionUser,
} from "#/server/session.server";

/** JSON backup of the signed-in user's data. */
export const Route = createFileRoute("/api/export")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const userId = await sessionUser(
					readCookie(request.headers.get("cookie"), SESSION_COOKIE),
				);
				if (!userId) return new Response("Unauthorized", { status: 401 });
				const db = await getDb();
				const habits = await db
					.selectFrom("habits")
					.selectAll()
					.where("user_id", "=", userId)
					.execute();
				const [habit_logs, debriefs, settings] = await Promise.all([
					habits.length
						? db
								.selectFrom("habit_logs")
								.selectAll()
								.where(
									"habit_id",
									"in",
									habits.map((h) => h.id),
								)
								.execute()
						: [],
					db
						.selectFrom("debriefs")
						.selectAll()
						.where("user_id", "=", userId)
						.execute(),
					db
						.selectFrom("settings")
						.selectAll()
						.where("user_id", "=", userId)
						.execute(),
				]);
				const body = JSON.stringify(
					{
						exportedAt: new Date().toISOString(),
						version: 2,
						habits,
						habit_logs,
						debriefs,
						settings,
					},
					null,
					2,
				);
				const stamp = new Date().toISOString().slice(0, 10);
				return new Response(body, {
					headers: {
						"content-type": "application/json",
						"content-disposition": `attachment; filename="forge-backup-${stamp}.json"`,
					},
				});
			},
		},
	},
});
