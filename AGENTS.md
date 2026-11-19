# AGENTS.md – Hinweise für AI-Agenten

## Projekt

`toktracker-web` ist ein **externes** Frontend für TT-INTELLIGENCE
(`protocatzk/toktracker`). Es besteht aus:

- `src/web` – Vue 3 + Vite + TypeScript SPA
- `src/server` – Fastify-BFF mit eigenem Login, Rollen und API-Key-Proxy

Das TokTracker-Backend wird **nicht verändert**. Der BFF hält den
`TIKTOK_API_KEY` (Header `X-API-Key`) und setzt die Rechte-Matrix durch.

## Wichtige Befehle

```bash
npm ci
npm run dev        # BFF auf :3000
npm run dev:web    # Vite auf :5173 (proxyt /api und /auth)
npm run check      # Typecheck + Vue-Typecheck + ESLint + Tests
npm run build      # Server + Web
npm start          # dist/server/index.js
```

Auf diesem VPS muss Node mit `LD_LIBRARY_PATH=/home/restreamer/.local/lib`
laufen, sonst fehlt `libatomic.so.1`.

## Deployment

Produktiv läuft die App unter **https://web.positronium.dev** hinter
`nginx-proxy` + `acme-companion` (Let's Encrypt):

```bash
docker compose up -d --build
docker compose ps
curl -fsS https://web.positronium.dev/health
```

- Externes Proxy-Netz: `toktrackerapp_toktracker_net`
- Container-interner Port: `3000`
- Lokaler Debug-Port: `127.0.0.1:3001`
- Domain/TLS/Produktions-Env: `docker-compose.override.yml`
- DNS: `web.positronium.dev A 62.171.160.32`

## Architektur

```
Browser → SPA (Vue) → BFF (Fastify, same-origin) → TokTracker API
                         │
                         ├─ lokale Benutzer (data/users.json)
                         ├─ Session-Cookie (HttpOnly, SameSite=Lax, signed)
                         └─ X-API-Key (nur serverseitig)
```

## Sicherheitsregeln

1. **Niemals** den TokTracker-API-Key an den Browser ausliefern.
2. Neue Proxy-Endpunkte brauchen eine Regel in
   `src/server/auth/permissions.ts` (`PROXY_RULES`). Unbekannte Pfade werden
   absichtlich mit 403 blockiert.
3. Schreibende Requests müssen die Origin-Prüfung in `src/server/index.ts`
   passieren.
4. Rollen/Capabilities spiegeln `shared/permissions.py` aus TokTracker.
5. `data/` enthält Benutzer und Session-Geheimnisse und ist nicht versioniert.

## Frontend-Konventionen

- Vue 3 `<script setup lang="ts">`, Composition API.
- API-Zugriffe über `src/web/src/api/client.ts`.
- Berechtigungen über `useAuthStore().can('...')`.
- Bestehende CSS-Klassen aus `src/web/src/styles/` wiederverwenden, damit die
  Optik zum TokTracker-Dashboard passt.
- Neue Seiten in `src/web/src/views/`, Navigation in
  `src/web/src/components/AppShell.vue` und `src/web/src/router/index.ts`.

## API-Parität

Die vollständige Endpunkt-/Modul-Matrix steht in `PROJECT_PLAN.md`. Beim
Implementieren eines Moduls immer die dort genannten TokTracker-Endpunkte
verwenden und die Proxy-Richtlinie ergänzen, falls ein Endpunkt fehlt.
