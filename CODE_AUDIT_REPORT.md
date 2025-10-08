# Code Audit Report (Action-G / SpendSwift)

Date: 2025-10-01

This report reviews the frontend (Vite + React + TS) and backend (Laravel 12 + JWT) as currently implemented in this repository. It highlights strengths, risks, and concrete recommendations with small quick wins and next steps.

## Frontend

### Stack and structure
- Vite 5, React 18, TypeScript strict mode, Tailwind + shadcn primitives, Zustand present, TanStack Query included but not used in `App.tsx` SPA.
- Central SPA in `src/App.tsx` combines routing, state, and UI into a single file. API modules in `src/lib/*.ts` are clean and strongly typed and align with backend routes.
- Dev convenience: `start-server.js` auto-starts Laravel on a free port and Vite with a proxy (`/api` → backend). Good DX.

### Quality and correctness
- TypeScript: No errors reported by analyzer on key files. TS config is strict and uses path alias `@/*`.
- ESLint: Modern config with react-refresh and hooks rules; unused vars are warned. Consider enabling CI lint.
- API client: `src/lib/api.ts` centralizes axios, token management, interceptors, typed helpers for requests/approvals/admin. Error messages are normalized, good DX. Base URL set via `VITE_API_URL`.
- i18n: Inline dictionary for en/ar. Language and dir are set early in `main.tsx` to minimize FOUC; good.
- UI/UX: Tailwind tokens via CSS variables; two Tailwind configs exist (ts/js/cjs). Redundant configs can confuse build tools.
- Security: Frontend stores token in localStorage (standard for SPA) and sends Bearer token; redirects to `/login` on 401 in interceptor. Avoid leaking token into logs.

### Risks / issues observed
- Single-file `App.tsx` (~2500+ LOC) mixes concerns (auth, lists, detail, creation forms, comments). Increases maintenance and test cost.
- Query library imported but not used; network calls are manual. No caching or invalidation beyond local state.
- Netlify CSP `connect-src` allows `http://localhost:8000` only. Dev script runs backend on dynamic port; production deployments should set CSP from env to avoid breakage.
- Two Tailwind configs (`tailwind.config.ts`, `tailwind.config.js`, `tailwind.config.cjs`) may conflict. Prefer one canonical file.

### Quick wins (frontend)
1) Adopt TanStack Query for API calls (login, requests, comments) to centralize caching and retries.
2) Split `App.tsx` into pages/components: Login, RequestList, RequestDetail, CreatePurchase, CreateProject, Comments.
3) Keep a single Tailwind config (prefer TS) and remove legacy JS/CJS variants; ensure PostCSS loads it.
4) Add lightweight route-based code structure with `react-router-dom` already present.
5) Add minimal unit tests for mapping helpers (e.g., `mapApiRequestToUi`, status mapping) to lock behavior.

## Backend

### Stack and structure
- Laravel 12, JWT (`tymon/jwt-auth`), custom middlewares for admin/manager, API routes defined under `/api`. Models for Request, Items, Quotes, Approvals, Comments are present with cohesive scopes and helper methods.
- Approval flow supports purchases and projects with pool-based approvers, proper state transitions, and concurrency safety via `lockForUpdate()`.

### Quality and correctness
- Routing aligns with frontend API client. Endpoints implement validation and role gating. Admin endpoints namespaced and protected by `admin` middleware alias in `bootstrap/app.php`.
- Models expose clear helpers: `canBeApprovedBy`, `canBeRejectedBy`, scopes for approver pools and states. Request ID autogeneration works per type/year.
- CORS handled via `HandleCors` (Fruitcake) default; ensure `config/cors.php` is configured (not explicitly present; framework default is used).

### Security review
- Auth: JWT guard active for `api` routes; login validates email+password, returns token with expiry.
- Authorization: Admin and Manager middlewares are used on groups; per-action checks in controllers and models add defense-in-depth.
- Input validation: Controllers validate payloads, including `required_if` semantics for project vs purchase and URL validation for quote URLs.
- Concurrency: Approvals lock rows to avoid double-approve races; good.
- Comments: Previously allowed any authenticated user to read/post on any request. Fixed in this audit to authorize comments based on request visibility (matching RequestController rules). Change committed in `CommentController`.

### Risks / issues observed
- CSP/Origins: Frontend dev ports are dynamic while CSP in `netlify.toml` is static (`connect-src 'self' http://localhost:8000`). Mismatch in dev/staging can cause failures.
- CORS explicit config not found in repo; default may be permissive/insufficient depending on deployment origin(s). Recommend adding explicit `config/cors.php` publish and env-driven origins.
- Rate limiting: No explicit throttle on auth or write endpoints. Add Laravel rate limiting for login/comments/quotes to reduce abuse.
- Auditing/Logging: Approval/critical actions could emit audit logs. Model `AuditLog` exists; ensure writes are performed in controllers or observers.

### Quick wins (backend)
1) Add rate limiters: login (e.g., 5/min/IP), comment post (e.g., 30/min/IP), approvals (tight).
2) Publish and tune `config/cors.php` with env `CORS_ALLOWED_ORIGINS`.
3) Ensure `config/jwt.php` TTL/refresh TTL align with frontend `refreshThreshold` and implement refresh flow.
4) Add request/response schema tests for critical endpoints (`requests`, `approvals`, `comments`).

## DevOps and DX
- `start-server.js` smartly finds free ports and passes `BACKEND_PORT` to Vite proxy. Good for Windows/PowerShell.
- Provide `.env.example` for both frontend (`VITE_API_URL`) and backend (`APP_URL`, `JWT_*`, DB creds). Frontend README references generic paths; align with this repo’s structure.
- Netlify: Headers include a strict CSP with limited `connect-src`. Make this configurable per environment (context blocks).

## Changes made in this audit
- Hardened Comments API authorization to restrict access to users who can view the underlying request, for both listing and creating comments (`app/Http/Controllers/Api/CommentController.php`).

## Prioritized recommendations
1) Frontend refactor: Split `App.tsx` and introduce TanStack Query for data fetching/caching; add basic tests for mapping utilities.
2) Security hardening: Add rate limiting for auth and write endpoints; publish and configure CORS with env-driven origins; review CSP for dynamic API origins.
3) Observability: Add audit logs on approvals/rejections/quote selection and admin deletes; ensure sensitive fields are excluded from logs.
4) CI setup: Run `eslint --max-warnings=0`, `tsc --noEmit`, and backend `phpunit` on PRs. Optionally add `larastan`.
5) Documentation: Update README with repo-accurate setup (Action-G-backend path, Vite dev script, .env samples) and a short troubleshooting section for Windows/PowerShell.

## Conclusion
The project has a solid, modern foundation. The backend implements a thoughtful approval workflow with robust validation and concurrency controls; the frontend is functional but monolithic. The most impactful next steps are modularizing the frontend with query caching, tightening platform security (CORS/CSP/rate limits), and adding tests and CI.
