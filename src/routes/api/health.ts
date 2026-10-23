import { createFileRoute } from "@tanstack/react-router";
import { sql } from "kysely";
import { APP_COMMIT, APP_VERSION } from "#/lib/version";
import { getDb } from "#/server/db/client";

/** Liveness/readiness probe for Docker, Podman and Kubernetes. */
export const Route = createFileRoute("/api/health")({
	server: {
		handlers: {
			GET: async () => {
				try {
					const db = await getDb();
					await sql`select 1`.execute(db);
					return Response.json({
						status: "ok",
						version: APP_VERSION,
						commit: APP_COMMIT || undefined,
					});
				} catch (err) {
					return Response.json(
						{ status: "error", error: String(err) },
						{ status: 503 },
					);
				}
			},
		},
	},
});
