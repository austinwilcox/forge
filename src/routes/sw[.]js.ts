import { createHash } from "node:crypto";
import { readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createFileRoute } from "@tanstack/react-router";

/**
 * Service worker, generated per build so it can precache every hashed asset
 * (including route chunks never visited) and so each deploy gets a fresh cache.
 * Pages are network-first with a cached fallback; data never goes through the
 * SW (TanStack Query's own cache handles that).
 */
const SHELL = ["/", "/habits", "/debrief", "/progress", "/manual", "/settings"];
const STATIC = [
	"/favicon.svg",
	"/manifest.webmanifest",
	"/icons/icon.svg",
	"/icons/icon-192.png",
	"/icons/icon-512.png",
	"/icons/maskable-512.png",
	"/icons/apple-touch-icon.png",
];

function listAssets() {
	// .output/server/index.mjs -> .output/public/assets
	const dir = resolve(dirname(process.argv[1] ?? "."), "../public/assets");
	try {
		return readdirSync(dir, { recursive: true, withFileTypes: true })
			.filter((e) => e.isFile())
			.map(
				(e) =>
					`/assets/${join(e.parentPath.slice(dir.length), e.name).replace(/^\/+/, "")}`,
			);
	} catch {
		return []; // dev server: nothing built to precache
	}
}

let script: string | undefined;

function buildScript() {
	const assets = listAssets();
	const version = createHash("sha256")
		.update(assets.join("|"))
		.digest("hex")
		.slice(0, 12);
	return `// Forge service worker ${version}
const CACHE = "forge-${version}";
const ASSETS = ${JSON.stringify([...assets, ...STATIC])};
const SHELL = ${JSON.stringify(SHELL)};
const NAV_TIMEOUT_MS = 4000;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("forge-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Pages are cached by path only; ?date=… variants share one entry.
const pageKey = (url) => new URL(url).origin + new URL(url).pathname;

async function cachePage(cache, url, res) {
  // Never cache a redirect to /login under a real page's path.
  if (res.ok && !res.redirected && res.headers.get("content-type")?.includes("text/html")) {
    await cache.put(pageKey(url), res.clone());
  }
  return res;
}

// After sign-in, the page asks the worker to cache the main pages so they open offline.
self.addEventListener("message", (event) => {
  if (event.data !== "warm") return;
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(SHELL.map(async (path) => {
        const url = new URL(path, self.location.origin).href;
        if (await cache.match(pageKey(url))) return;
        try { await cachePage(cache, url, await fetch(url, { credentials: "same-origin" })); } catch {}
      })),
    ),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    if (url.pathname.startsWith("/auth/") || url.pathname.startsWith("/api/")) return;
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await Promise.race([
          fetch(req),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), NAV_TIMEOUT_MS)),
        ]);
        return await cachePage(cache, req.url, res);
      } catch {
        return (await cache.match(pageKey(req.url))) || (await cache.match(pageKey(self.location.origin + "/"))) || Response.error();
      }
    })());
    return;
  }

  if (url.pathname.startsWith("/assets/") || ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then(async (res) => {
      if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
      return res;
    })));
  }
});
`;
}

export const Route = createFileRoute("/sw.js")({
	server: {
		handlers: {
			GET: () => {
				script ??= buildScript();
				return new Response(script, {
					headers: {
						"content-type": "text/javascript; charset=utf-8",
						// Never let a CDN (e.g. Cloudflare) hold an old worker: devices
						// would keep running a stale build.
						"cache-control": "no-cache, no-store, must-revalidate",
						"cdn-cache-control": "no-store",
						"service-worker-allowed": "/",
					},
				});
			},
		},
	},
});
