# Projektplan – TokTracker-Web

## 1. Ziel

Ein eigenständiges, externes Frontend für TT-INTELLIGENCE, das funktional
alle Module des bestehenden Dashboards abbildet – ohne Änderungen am
TokTracker-Backend.

**Entscheidungen:**

- Eigener Login + eigene Rollen im BFF (`viewer`, `user`, `moderator`, `admin`)
- Keine Backend-Änderungen; Zugriff ausschließlich über den Admin-API-Key
- Vue 3 + Vite + TypeScript
- Volle funktionale Parität als Ziel

## 2. Architektur

```text
┌──────────────────────────────┐
│ Browser                      │
│ Vue 3 SPA (same-origin)      │
└──────────────┬───────────────┘
               │ /auth/*, /api/*
               ▼
┌──────────────────────────────┐
│ Fastify-BFF                  │
│ - lokale Benutzer + Rollen   │
│ - signiertes Session-Cookie  │
│ - Proxy-Richtlinien          │
│ - X-API-Key (serverseitig)   │
└──────────────┬───────────────┘
               │ HTTPS
               ▼
┌──────────────────────────────┐
│ TokTracker API               │
│ positronium.dev/track/api    │
└──────────────────────────────┘
```

### Warum kein direkter Browser-Zugriff?

1. Access Gate schützt auch `/api/public/*`.
2. Session-Cookie ist `HttpOnly` + `SameSite=Lax`.
3. Keine CORS-Header.
4. Der API-Key ist admin-equivalent.

## 3. Auth- und Rollenmodell

Lokale Benutzer liegen in `data/users.json` (nicht versioniert).

```text
Effektive Rechte = Rollenrechte + persönliche Grants − persönliche Denies
```

- Letzter aktiver Admin kann nicht gelöscht, deaktiviert oder herabgestuft
  werden.
- Passwortänderung und Rollenänderung erhöhen `sessionVersion` und invalidieren
  bestehende Sessions.
- Passwörter: `scrypt` (N=16384, r=8, p=1).
- Login-Rate-Limit und Origin-Prüfung für schreibende Requests.

> Hinweis: Die lokalen BFF-Benutzer sind **nicht** dieselben wie die
> TokTracker-Telegram-Whitelist. Die Telegram-Whitelist wird über die
> TokTracker-API verwaltet (Access-Modul), die BFF-Benutzer über `/users`.

## 4. Proxy-Richtlinien

Default-Deny. Jeder erlaubte Pfad braucht eine Regel in
`src/server/auth/permissions.ts`.

| Methode | Pfad | Benötigtes Recht |
|---|---|---|
| GET | `/api/public/*`, `/api/health` | öffentlich |
| GET | `/api/overview`, `/api/analytics`, `/api/site-analytics*` | `analytics.view` |
| GET | `/api/battles*` | `analytics.view` |
| GET | `/api/streamers/:id`, `/api/streamer-groups*` | `analytics.view` |
| POST/DELETE | `/api/streamers*`, `/api/streamer-groups*` | `streamers.manage` |
| POST | `/api/gifts` | `gifts.book` |
| GET | `/api/donor-radar*`, `/api/chat-logs` | `radar.view` |
| POST | `/api/donor-radar/.../crm`, `.../toggle-vip` | `crm.edit` |
| GET | `/api/chat-intelligence*` | `chatintel.view` |
| GET | `/api/chat-intelligence/export` | `chatintel.view` + `export.download` |
| GET | `/api/system/status`, `/api/system/health` | `system.view` |
| GET/POST | `/api/settings` | `settings.manage` |
| GET/POST/PUT/DELETE | `/api/telegram/users*` | `users.manage` |
| GET/POST | `/api/revenue/profiles*` | `settings.manage` |
| POST | `/api/revenue/assign` | `streamers.manage` |
| GET | `/api/export/*.csv` | `export.download` |
| POST | `/api/v1/telegram/send-report` | `reports.send` |
| POST | `/api/demo/*` | `system.manage` |

`/api/auth/*` und `/api/miniapp/*` werden nie proxyt.

## 5. Modul-Matrix

### 5.1 Admin-Dashboard (`/`)

| Feature | Endpunkte | Status |
|---|---|---|
| Übersicht/KPIs | `GET /api/overview?period=` | ✅ |
| Streamer-Liste/Detail | `GET /api/streamers/:id` | ✅ |
| Streamer anlegen/löschen | `POST/DELETE /api/streamers` | ✅ |
| Tracking/Refresh | `POST /api/streamers/:id/track`, `/refresh` | ✅ |
| Gruppen | `GET/POST/PUT/DELETE /api/streamer-groups` | ✅ |
| Gruppenmitglieder | `PUT /api/streamer-groups/:id/members` | ✅ |
| Worker-Diagnose | `GET /api/system/status` | ✅ |
| Analytics/Charts | `GET /api/analytics` | ✅ |
| Battles | `GET /api/battles`, `/stats`, `/:id` | ✅ |
| Gifts buchen | `POST /api/gifts` | ✅ |
| Telegram-Nutzer | `GET/POST/PUT/DELETE /api/telegram/users*` | ✅ |
| Einstellungen | `GET/POST /api/settings` | ✅ |
| System/Demo | `GET /api/system/health`, `POST /api/demo/*` | ✅ |
| Exporte | `GET /api/export/*.csv` | ✅ |
| Reports | `POST /api/v1/telegram/send-report` | ✅ |
| Revenue-Profile | `GET/POST /api/revenue/profiles*` | ✅ |

### 5.2 Stats (`/stats`)

`GET /api/overview`, `GET /api/analytics`, `GET /api/battles/stats` – ✅

### 5.3 Access (`/access`)

`GET/POST/PUT/DELETE /api/telegram/users*`, `GET/POST /api/settings` – ✅  
Zusätzlich lokale BFF-Benutzer unter `/users`.

### 5.4 Donor Radar (`/donor-radar`)

`GET /api/donor-radar`, `/donors/:username`, `/whale-alerts`,
`/loyalty-and-overlap`, `GET /api/chat-logs`,
`POST /api/donor-radar/donors/:username/crm`,
`POST /api/donor-radar/donors/:username/toggle-vip` – ✅

### 5.5 Chat Intelligence (`/chat-intelligence`)

`GET /api/chat-intelligence/sessions`, `/analysis`, `/export`,
`GET /api/chat-logs` – ✅

### 5.6 Site Analytics (`/site-analytics`)

`GET /api/site-analytics`, `/api-calls` – ✅

### 5.7 Public Panel (`/public`)

`GET /api/public/overview`, `/streamers/:id`, `/battles`, `/battles/stats`,
`/analytics` – ✅  
Die Route ist im Frontend ohne Login erreichbar; der BFF erlaubt die
Public-Endpunkte ohne Session.

### 5.8 Telegram Mini-App

Nicht Bestandteil der ersten Parität: Legacy, eingefroren, eigene
`initData`-Authentifizierung. Optional als responsive PWA neu bauen.

## 6. Meilensteine

| Meilenstein | Inhalt |
|---|---|
| M0 – Fundament | ✅ Projekt, BFF, Auth, Rollen, Proxy, Dashboard-Übersicht |
| M1 – Streamer | ✅ Streamer-CRUD, Gruppen, Worker-Diagnose, Detailansicht |
| M2 – Analytics | ✅ Charts, Zeitverläufe, Battles, Gifts, Exporte |
| M3 – Access | ✅ Telegram-Whitelist, Rollen, lokale Benutzerverwaltung |
| M4 – Radar | ✅ Donor-Radar, Whale-Alerts, CRM, Chatlogs |
| M5 – Chat-Intel | ✅ Sessions, Analyse, Export |
| M6 – Site-Analytics | ✅ Traffic, API-Calls, Bot-Sessions |
| M7 – Public Panel | ✅ Öffentliche Ansicht + Stats |
| M8 – Härtung | ⏳ E2E-Tests, Security-Review, Docker/Deployment, Doku |

## 7. Teststrategie

- Unit-Tests: Passwort-Hashing, Rollen/Rechte, Proxy-Richtlinien.
- Integrationstests: Fastify `inject` für Login/Me/Logout/Nutzer-CRUD.
- Proxy-Tests mit gemocktem `fetch`: Pfad-Mapping, Header, 401/403/Timeout.
- Später: Playwright-E2E gegen eine Mock-API.
- `npm run check` vor jedem Commit.

## 8. Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| API-Key ist admin-equivalent | Nur serverseitig; Default-Deny im Proxy; Rechteprüfung im BFF |
| Rolle/Rechte weichen von TokTracker ab | Matrix 1:1 aus `shared/permissions.py` übernommen; Tests |
| Upstream-API ändert sich | Typen zentral, Fehler sichtbar, Tests mit Fixtures |
| Öffentliches Panel benötigt Gate-Ausnahme | BFF proxyt Public-Endpunkte mit Key; keine Backend-Änderung |
| Session-Cookie bei externer Domain | Same-origin-BFF, `SameSite=Lax`, `Secure` |
| Node/libatomic auf dem VPS | `LD_LIBRARY_PATH=/home/restreamer/.local/lib` dokumentiert |

## 9. Offene Punkte

- ✅ Ziel-Domain/Hosting: `https://web.positronium.dev` hinter nginx-proxy +
  acme-companion, Let's-Encrypt-Zertifikat aktiv.
- Ob das Public Panel wirklich ohne Login erreichbar sein soll.
- Ob die Telegram-Mini-App langfristig ersetzt werden soll.
- Ob später doch ein scoped API-Key/Token im TokTracker-Backend ergänzt wird.
- E2E-Tests und Deployment-Feinschliff (M8).
