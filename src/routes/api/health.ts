import { createFileRoute } from "@tanstack/react-router";
import { sql } from "kysely";
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
						version: process.env.APP_VERSION ?? "dev",
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
