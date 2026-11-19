# TokTracker-Web

Externes Web-Frontend für **TT-INTELLIGENCE / TokTracker** – als eigenständiges
Projekt, ohne Änderungen am TokTracker-Backend.

- **Frontend:** Vue 3 + Vite + TypeScript
- **BFF:** Fastify (Node.js) mit eigenem Login, Rollen und API-Key-Proxy
- **Upstream:** `https://positronium.dev/track/api`
- **Design:** an das bestehende TokTracker-Dashboard angelehnt

## Warum ein BFF?

Die TokTracker-API ist nicht für direkte Browser-Aufrufe von fremden Origins
geeignet:

- `ACCESS_GATE=whitelist` schützt auch `/api/public/*`.
- Das Session-Cookie ist `HttpOnly` und `SameSite=Lax`.
- Es gibt keine CORS-Header.
- Der API-Key (`X-API-Key`) hat **Admin-Rechte** und darf nie im Browser landen.

Der BFF löst das: Er läuft unter derselben Origin wie die SPA, hält den
API-Key serverseitig, setzt die Rechte-Matrix durch und proxyt nur freigegebene
Endpunkte.

```text
Browser ──► Vue-SPA ──► Fastify-BFF ──► TokTracker-API
                         │  X-API-Key
                         ├─ lokale Benutzer (data/users.json)
                         └─ signiertes Session-Cookie
```

## Quickstart

Voraussetzungen: Node.js ≥ 20.19, npm.

```bash
npm ci
cp .env.example .env
# TOKTRACKER_API_KEY setzen (aus der TokTracker-.env: TIKTOK_API_KEY)
# SESSION_SECRET mit `openssl rand -hex 32` setzen
npm run dev        # BFF auf http://localhost:3000
npm run dev:web    # Vite auf http://localhost:5173
```

Beim ersten Start wird ein lokaler Administrator angelegt:

- Benutzername: `ADMIN_USERNAME` (Default `admin`)
- Passwort: `ADMIN_PASSWORD`, falls gesetzt – sonst wird ein Einmal-Passwort
  generiert und im BFF-Log ausgegeben.

Danach unter `http://localhost:5173/login` anmelden.

> Auf diesem VPS muss Node mit `LD_LIBRARY_PATH=/home/restreamer/.local/lib`
> ausgeführt werden, sonst fehlt `libatomic.so.1`.

## Konfiguration

| Variable | Bedeutung |
|---|---|
| `APP_ORIGIN` | Erlaubte Origin(s) der SPA, kommagetrennt. Dev: `http://localhost:5173`. |
| `SESSION_SECRET` | Signiert das Session-Cookie. In Produktion Pflicht (≥ 32 Zeichen). |
| `COOKIE_SECURE` | `true` bei HTTPS. Wird sonst automatisch aus `APP_ORIGIN`/`NODE_ENV` abgeleitet. |
| `TOKTRACKER_API_BASE` | Basis-URL der TokTracker-API. |
| `TOKTRACKER_API_KEY` | Admin-API-Key aus TokTracker (`TIKTOK_API_KEY`). Nur serverseitig! |
| `DATA_DIR` | Verzeichnis für `users.json` und das generierte Session-Secret. |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Initialer lokaler Admin (nur beim ersten Start). |
| `LOGIN_RATE_MAX` / `LOGIN_RATE_WINDOW` | Rate-Limit für `/auth/login`. |

## Produktion

```bash
npm run build
NODE_ENV=production SESSION_SECRET=... TOKTRACKER_API_KEY=... \
  npm start
```

Oder mit Docker:

```bash
cp .env.example .env   # Werte setzen
docker compose up -d --build
```

Der Container lauscht intern auf Port `3000` und liefert die gebaute SPA aus
`dist/web` sowie die BFF-Routen aus.

## Deployment unter `web.positronium.dev`

Das Projekt läuft hinter dem bestehenden **nginx-proxy + acme-companion** auf
dem VPS. Die Domain zeigt auf `62.171.160.32`; das Let's-Encrypt-Zertifikat
wird automatisch ausgestellt und verlängert.

```text
Internet → nginx-proxy :443 → toktracker-web:3000 (Docker-Netz)
```

Relevante Dateien:

- `docker-compose.override.yml` – Domain, TLS, Proxy-Netz, Produktions-Env
- `docker-compose.yml` – interner Port `3000`, lokaler Debug-Port `3001`
  (nur `127.0.0.1`)
- externes Docker-Netz: `toktrackerapp_toktracker_net`

Aktivieren/aktualisieren:

```bash
docker compose up -d --build
docker compose ps
curl -fsS https://web.positronium.dev/health
```

Wichtige Werte in `.env`:

| Variable | Wert / Bedeutung |
|---|---|
| `TOKTRACKER_API_KEY` | Admin-API-Key aus TokTracker (`TIKTOK_API_KEY`) |
| `SESSION_SECRET` | ≥ 32 Zeichen; erzeugt signierte Cookies |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | initialer lokaler Admin |
| `WEB_PORT` | optionaler lokaler Debug-Port (Default `3001`) |

Das Override setzt zusätzlich:

```text
NODE_ENV=production
TRUST_PROXY=true
APP_ORIGIN=https://web.positronium.dev
COOKIE_SECURE=true
VIRTUAL_HOST=web.positronium.dev
VIRTUAL_PORT=3000
LETSENCRYPT_HOST=web.positronium.dev
LETSENCRYPT_EMAIL=admin@heliac.dev
```

HTTP wird automatisch auf HTTPS umgeleitet. Der Port `3000` bleibt intern;
nach außen ist nur `80/443` des nginx-proxy erreichbar.

## Rollen

Die lokalen BFF-Benutzer haben eine der Rollen `viewer`, `user`, `moderator`
oder `admin`. Die Capabilities spiegeln die TokTracker-Matrix:

| Rolle | Rechte |
|---|---|
| `viewer` | öffentliche Ansicht |
| `user` | + Spender-Radar & Chat-Intelligence |
| `moderator` | + Analytics, Exporte, Systemstatus |
| `admin` | alles inkl. Streamer-, Nutzer- und Systemverwaltung |

Die Rolle `admin` wird über den API-Key technisch immer alle Upstream-Rechte
haben. Der BFF verhindert jedoch, dass Nicht-Admins die entsprechenden
Endpunkte aufrufen.

## Status

- [x] Projektgerüst, BFF, Login, Rollen, Proxy
- [x] Dashboard-Übersicht (`/api/overview`)
- [x] Live-Übersicht (`/api/live`)
- [x] Streamer, Gruppen und Worker-Diagnose inkl. letzter Events
- [x] Analytics/Charts, Stats, Battles und Gifts
- [x] Reports (`/api/v1/reports/daily`, `/api/v1/streamers/{id}/report`)
- [x] Telegram-Whitelist, Settings, System und lokale Benutzer
- [x] Donor-Radar inkl. optionaler Loyalty-/Overlap-Analyse
- [x] Chat-Intelligence und Site-Analytics inkl. Bot-Sessions,
  Login-Challenges und Worker-Telemetrie
- [x] Public Panel inkl. Streamer-Detail-Modal
- [x] Exporte und Telegram-Report-Versand
- [ ] E2E-Tests und Deployment-Feinschliff

Die **Telegram Mini-App** ist bewusst nicht Teil der ersten Parität: Sie ist
Legacy, nutzt `initData`-Auth und würde ein separates WebApp-Projekt erfordern.

Die vollständige Modul-/Endpunkt-Matrix und Meilensteine stehen in
[`PROJECT_PLAN.md`](./PROJECT_PLAN.md).

## Sicherheit

- Der TokTracker-API-Key wird **nie** an den Browser gesendet.
- Session-Cookie: `HttpOnly`, `SameSite=Lax`, signiert, `Secure` bei HTTPS.
- Schreibende Requests werden zusätzlich per `Origin`-Header geprüft.
- Unbekannte Proxy-Pfade werden blockiert (Default-Deny).
- Login ist rate-limitiert.
- `data/` und `.env` sind nicht versioniert.

## UI/UX & Vue-3-Features

- **Vue 3.5** mit `<script setup>`, `defineModel`, `useTemplateRef`,
  `defineAsyncComponent`, `<Transition>`/`<TransitionGroup>`, `Teleport`,
  Suspense-fähigem Lazy-Loading und Route-basiertem Code-Splitting
- **@vueuse/core** für `useTransition`, `useEventListener` und reaktive
  Komfort-Helfer
- **Reka UI** (MIT) für accessible Dialoge, Dropdowns und Focus-Trap
- **Lucide** (ISC) als Icon-Set
- **Sonner** (MIT) für Toasts
- **ECharts** (Apache-2.0) + **vue-echarts** (MIT) für responsive,
  theme-fähige Charts
- Neues **Aurora-Industrial-Designsystem** mit fluiden Tokens, Glas-Panels,
  Light/Dark-Theme, View-Transitions und Mobile-Bottom-Navigation
- Command-Palette mit `Strg/⌘ + K`
- Boot-Screen, Top-Route-Progress und vollflächige Skeleton-Seiten für jedes Modul
- Skeleton-Platzhalter in Tabellen, Charts, Listen und Detail-Modals
- Responsive Shell: Desktop-Sidebar, Mobile-Drawer und Bottom-Nav
- Barrierefreiheit: Fokus-Ringe, `sr-only`-Labels, Tastatursteuerung,
  `prefers-reduced-motion`

## Lizenz & Attribution

MIT. Das visuelle Design-System und die lokalen Fonts sind aus
[`protocatzk/toktracker`](https://github.com/protocatzk/toktracker)
übernommen (MIT). Die verwendeten Drittanbieter-Bibliotheken und ihre
Lizenzen stehen in [`NOTICE`](./NOTICE).
