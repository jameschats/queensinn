# CLAUDE.md — Hotel Queen's Inn & KVR Mahal

Build guide. Full design: the "Website Design Document" (Claude Doc). Same conventions as DailyCalendarShop.

## Working rules
1. Ask, don't assume; flag low-risk assumptions explicitly.
2. Simplest solution first. 3. Don't touch unrelated code. 4. Flag uncertainty.

## Stack
| Layer | Tech |
|---|---|
| API | ASP.NET Core .NET 9 — `queensin.api` (vertical slices under `Features/`) |
| Web | Angular 21 (standalone, SSR) + Tailwind CSS 4 — `queensin.web` |
| DB | MySQL 8 `queensinn`, EF Core 9 + Pomelo, **hand-written entities**, SQL migrations are the source of truth |
| Auth | BCrypt + JWT (15 min) + rotating refresh tokens (14 days); Google sign-in for existing staff only |

## Commands
```bash
# Database (forward-only, idempotent)
for f in database/migrations/0*.sql; do mysql -u root -p queensinn < "$f"; done
# API  → http://localhost:5090/api/health
dotnet run --project queensin.api
# Web  → http://localhost:4200
cd queensin.web && npm install && npm start
# Production SSR build
cd queensin.web && npx ng build && node dist/queensin-web/server/server.mjs
```

## Conventions
- Responses: `ApiResponse<T>`; lists: `PagedResult<T>`; handled errors: `throw new AppException(msg, status)`.
- Permissions: `Common/Security/Perm.cs` ⇄ `core/models/auth.model.ts` ⇄ migration 003 — keep all three in sync.
- Admin endpoints live under `/api/admin/*` with `[Authorize(Policy = Perm.X)]`.
- Public GETs use `[OutputCache(PolicyName = "public")]`; admin saves call `EvictByTagAsync("public")`.
- No hard-coded brand colours: use `primary / accent / surface` and derived tokens (`deep, ink, muted, line, tint, gold-ink, gold-soft, on-primary`).
- Never change a public URL slug (SEO). New migrations get the next number; never edit an applied one.

## Guardrails
- Seeded Super Admin: `admin@queensinn.co.in` / `Admin:DefaultPassword` (forced change at first sign-in).
- Secrets (Jwt:Key, DB password, Google client id) via user-secrets or env vars in production.

## Status
- ✅ Stage 1 — design + HTML prototype
- ✅ Stage 2 — solution, full schema (001–009), staff auth/roles, site settings, theme engine, admin: login, change password, dashboard, theme, settings, staff users; public layout + all routes (SSR, SEO tags, 404)
- ⏭ Stage 3 — media pipeline (ImageSharp WebP), `qi-image`, hero images, design-system components
- Stage 4 — rooms + pages/content admin · Stage 5 — public pages · Stage 6 — enquiries + email · Stage 7 — SEO/perf · Stage 8 — go-live
