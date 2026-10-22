# Forge — Discipline Tracker

A self-hosted habit tracker for building discipline, designed to run on a Raspberry Pi in your office.

It draws on three books:

- **Extreme Ownership / Discipline Equals Freedom** (Jocko Willink): a daily mission ("prioritize and execute"), an evening after-action debrief with an *Ownership* field, and "Good." as the answer to setbacks.
- **Discipline Is Destiny** (Ryan Holiday): habits grouped into pillars (Body, Mind, Character, Craft) that follow the book's exterior / interior / superior structure.
- **Atomic Habits** (James Clear): identity statements, implementation intentions (time + location), habit stacking, the two-minute rule, *never miss twice* warnings, and a 1%-better compounding chart.

## Features

| Screen | What it does |
| --- | --- |
| **Today** | Daily score ring, today's mission, a daily quote, and habits grouped by pillar. One-tap check-off, amount steppers, the two-minute fallback (half credit, keeps the streak alive), streaks, and *never miss twice* alerts. You can step back through previous days. |
| **Habits** | A habit editor built around the Four Laws: identity, cue, two-minute version, target and schedule. Also reorder, archive and delete. |
| **Debrief** | Daily after-action review: a 1–10 discipline rating, plus what went right, what went wrong, what I own, and what I'll adjust. Shows past debriefs. |
| **Progress** | Consistency KPIs, daily score with a 7-day average, your 1% compounding curve against the ideal, day-of-week weak spots, consistency per habit (also as a table), a 26-week heatmap, and your rating trend. |
| **Manual** | A pocket summary of each principle and where it shows up in the app. |
| **Settings** | Call sign, personal creed, day/night theme, JSON export, sign out. |

## Stack

- **TanStack Start** (React 19, SSR, server functions) with **TanStack Router** for file-based routing
- **TanStack Query**: the device's local copy of the data, persisted to `localStorage`, with an offline write queue (see [Offline use](#offline-use))
- **TanStack Form** + **Zod**: the same schemas validate forms and server-function inputs
- **TanStack Charts** (`@tanstack/charts`): SVG charts that render on the server
- **Zustand**: client-only UI preferences (theme, chart range, hide-completed)
- **Kysely** + **SQLite** (`better-sqlite3`): migrations live in code and run automatically at startup
- **openid-client**: OIDC sign-in (TanStack has no OIDC client)
- Tailwind CSS v4, Biome, Vitest

## Self-hosting

### Docker / Podman Compose (Raspberry Pi 4/5, 64-bit OS)

```sh
curl -O https://raw.githubusercontent.com/<you>/forge/main/docker-compose.yml
curl -o .env https://raw.githubusercontent.com/<you>/forge/main/.env.example
# edit .env: FORGE_IMAGE_OWNER, TZ, and optionally APP_URL + OIDC_* (see below)
docker compose up -d        # or: podman compose up -d
```

Open `http://<pi-hostname>:3000`. Your data lives in the `forge-data` volume as a single SQLite file at `/data/forge.db`.

### Kubernetes (k3s, etc.)

Edit the image, `APP_URL` and OIDC settings in `deploy/kubernetes/forge.yaml`, then:

```sh
kubectl apply -f deploy/kubernetes/forge.yaml
```

The manifest runs a single replica with the `Recreate` strategy, because SQLite only supports one writer.

### Sign-in and tenants

Forge picks a mode from the environment:

| Mode | When | Who can use it |
| --- | --- | --- |
| **Open** (default) | No `OIDC_*` and no `APP_PASSWORD` | One person, no sign-in. Fine on a trusted home network. |
| **Passcode** | `APP_PASSWORD` set | One person, behind a passcode. |
| **OIDC** | `OIDC_ISSUER` and `OIDC_CLIENT_ID` set | **Multi-tenant.** Everyone signs in with your identity provider, and each person gets their own habits, logs, debriefs and settings. |

To set up OIDC, register Forge with any OpenID Connect provider (Authentik, Authelia, Keycloak, Pocket ID, Zitadel, Google, Entra ID…):

- **Redirect URI:** `${APP_URL}/auth/callback`
- **Post-logout redirect:** `${APP_URL}/login`
- **Client type:** confidential (set `OIDC_CLIENT_SECRET`) or public (PKCE only, no secret)

Things to know:

- **Existing data:** turning OIDC on for an existing single-user install gives all of the existing data to the **first person who signs in**.
- **Restricting access:** `OIDC_ALLOWED_EMAILS` (for example `me@example.com,@family.org`) limits who may sign in, on top of whatever your provider allows.
- **Privacy:** every query is scoped to the signed-in user, and each user's offline cache is stored separately on a shared device.

### Offline use

Forge is offline-first. Each device keeps its own copy of your recent history: a year of logs, plus debriefs, habits and profile. Today, Debrief and Progress are calculated from that copy on the device itself. If your phone loses signal or the Pi goes down:

- **The app still opens.** A service worker caches the app's pages and code.
- **Changes are queued.** Check-offs, the mission and the debrief are saved on the device and marked as waiting to sync.
- **Sync is automatic.** When the server is reachable again, the queue replays in order. The app checks every 60 seconds for changes made on your other devices.
- **Conflicts resolve by newest edit.** Each change carries the time it was made. The newest wins per habit and day, and per field for debriefs. That means a stale offline "done" can't overwrite a later "undo" made on another device, and a mission set on your phone at 0600 can't wipe out the debrief you typed on your laptop that evening.
- **Habit editing needs a connection.** Creating, editing, reordering and archiving habits work only when connected.

> **Offline needs HTTPS.** Browsers only allow service workers on `https://` or `localhost`. Over plain `http://<pi-ip>:3000` the app still works and still queues changes made while the server is unreachable. But a page *reload* with no connection won't open, because there's no service worker. Put Forge behind HTTPS to fix this: Caddy, Traefik, Tailscale (`tailscale serve 3000`), or a Cloudflare tunnel all work.

### Install on your phone (PWA)

Forge is an installable web app. It opens full screen with its own icon, has long-press shortcuts to Today, Debrief and Progress, and works offline.

- **Android, or Chrome/Edge on desktop:** go to **Settings → Install app → Install Forge**, or use the browser menu's **Install app**.
- **iPhone/iPad:** open Forge in Safari, tap **Share → Add to Home Screen**.

Installing requires **HTTPS**, the same requirement as offline use (see above). Over plain `http://<pi-ip>` you only get a bookmark-style shortcut that won't open offline.

### Behind a Cloudflare Tunnel

Forge works behind an existing `cloudflared`, for example one running under systemd on the same host. Point the tunnel's ingress at the published port:

```yaml
# /etc/cloudflared/config.yml
ingress:
  - hostname: forge.example.com
    service: http://localhost:3000
  - service: http_status:404
```

In `.env`:

```sh
APP_URL=https://forge.example.com   # must match the public hostname
FORGE_BIND=127.0.0.1                # reachable only through the tunnel, not the LAN
# and sign-in: OIDC_* (multi-tenant) or APP_PASSWORD
```

Things to get right on the Cloudflare side:

- **Turn on sign-in in Forge.** Once the tunnel is up, Forge is on the public internet. With no sign-in configured, the server logs a warning at startup.
- **Turn off Rocket Loader and Email Address Obfuscation** for the hostname, under Speed → Optimization and Scrape Shield. Both rewrite the HTML, which breaks React's hydration.
- **Leave caching at its defaults.** Hashed `/assets/*` can be cached at the edge indefinitely. `/sw.js` is served `no-store`, so devices always pick up new builds.
- **Avoid putting Cloudflare Access in front of the whole app.** When an Access session expires, background sync requests get redirected to Cloudflare's login page, so the app thinks it's offline until you reload. Use Forge's OIDC sign-in instead. Cloudflare Access can itself be the OIDC provider (Zero Trust → Access → Applications → SaaS → OIDC). If you do keep Access in front, add a **Bypass** policy for `/sw.js`, `/manifest.webmanifest`, `/icons/*` and `/api/health`.

### Configuration

| Variable | Default | Notes |
| --- | --- | --- |
| `TZ` | container default (UTC) | Set this to your time zone so "today" rolls over at your midnight. |
| `APP_URL` | *(empty)* | The public URL, e.g. `https://forge.example.com`. Required for OIDC. When it's `https`, cookies are marked secure. |
| `OIDC_ISSUER` | *(empty)* | Your provider's issuer URL. Setting this and `OIDC_CLIENT_ID` turns on OIDC multi-tenant mode. |
| `OIDC_CLIENT_ID` | *(empty)* | |
| `OIDC_CLIENT_SECRET` | *(empty)* | Leave empty for a public PKCE client. |
| `OIDC_PROVIDER_NAME` | `single sign-on` | Button label: "Sign in with …". |
| `OIDC_SCOPES` | `openid profile email` | |
| `OIDC_ALLOWED_EMAILS` | *(empty)* | Optional allowlist of emails and `@domains`. |
| `APP_PASSWORD` | *(empty)* | Single-user passcode. Ignored when OIDC is configured. |
| `SESSION_SECRET` | generated | Key for signing session cookies. By default a random one is generated and stored in the database. |
| `COOKIE_SECURE` | from `APP_URL` | Forces secure cookies on or off. |
| `DATABASE_PATH` | `/data/forge.db` | Location of the SQLite file. |
| `PORT` | `3000` | Port inside the container. |
| `FORGE_PORT` / `FORGE_BIND` | `3000` / `0.0.0.0` | Compose only: the host port, and the interface it listens on. Use `127.0.0.1` behind a local tunnel or proxy. |

Health endpoint: `GET /api/health`. Backup: **Settings → Export JSON** (or `GET /api/export`, which exports only the signed-in user's data), or copy the volume.

### Container images

`.github/workflows/release.yml` builds multi-arch images (`linux/amd64`, `linux/arm64`) and pushes them to GHCR:

- every push to `main` → `ghcr.io/<owner>/forge:edge` and `:sha-xxxxxxx`
- tag `v1.2.3` → `:1.2.3`, `:1.2`, `:1`, `:latest`

The app is built once on the runner's native architecture. `better-sqlite3` ships prebuilt binaries for every platform, so the arm64 image is assembled without any emulated compiling. 32-bit Raspberry Pi OS (`armv7`) is not supported; use the 64-bit OS.

`.github/workflows/ci.yml` runs lint, typecheck, tests and the build on every PR.

## Development

```sh
pnpm install
pnpm db:seed-demo     # optional: 90 days of realistic demo history
pnpm dev              # http://localhost:3000
```

| Script | |
| --- | --- |
| `pnpm dev` | Dev server with TanStack devtools |
| `pnpm build && pnpm start` | Production build (Nitro, Node server) |
| `pnpm test` | Vitest: streak, scoring and stats engine |
| `pnpm typecheck` / `pnpm check` | TypeScript / Biome |
| `pnpm db:seed-demo [--force] [--user=<id>]` | Seed demo data (`--force` wipes that user's data first) |
| `docker build -t forge .` | Local image |

### Testing offline in development

Open the TanStack devtools (the floating button in the bottom-right) and go to the **Network** tab:

- **Network switch:** uncheck it and every request to the server fails, exactly as it would if the Wi-Fi dropped or the Pi went down. The setting survives reloads in that tab.
- **Sync queue:** the panel lists the changes waiting to sync, and you can probe the server or discard the queue.

To test reloading offline from the service worker, use a production build (`pnpm build && pnpm start`) and Chrome DevTools → Network → Offline.

### Layout

```
src/
  routes/            file-based routes (_app = authed shell; api/* = health, export)
  server/            server functions, auth (session, OIDC), conflict rules, Kysely db + migrations
  lib/               shared domain: dates, zod schemas, streak/stats engine, doctrine content,
                     query options, offline sync (sync.ts) and connectivity detection
  stores/ui.ts       zustand UI preferences
  components/        HabitCard, HabitForm, charts, icons
scripts/seed-demo.ts
deploy/kubernetes/
```

### Scoring rules

- A **full rep** earns 1 credit. The **two-minute version** earns 0.5. A **partial amount** earns 0.5 × its share of the target.
- A **streak** counts scheduled days on which you showed up (any log counts). Today doesn't break a streak until the day is over.
- **Never miss twice:** if you missed the previous scheduled day, the habit is flagged. Two misses in a row is called out explicitly.
- **Compounding:** each day scoring 80% or more multiplies your index by 1.01. Each day under 50% multiplies it by 0.99. The chart plots this against 1.01ⁿ.
