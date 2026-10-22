import { defineConfig } from "vitest/config";

// Unit tests cover pure domain logic only; keep the Start/Nitro plugins out.
export default defineConfig({
	resolve: { tsconfigPaths: true },
	test: { include: ["src/**/*.test.ts"], environment: "node" },
});
