<!-- PROJECT_OVERVIEW_BACKEND.md - Generated summary for backend developer -->
# Action-G — Backend Handoff Guide

This document is a concise but comprehensive reference for a backend developer who will onboard or maintain the SpendSwift project. It covers repository layout, backend services, API surface, environment configuration, common workflows, troubleshooting, and recommendations.

---

## Table of contents
- Project summary
- Repository layout (what to look at)
- Backend(s) in this repo
- Environment variables and secrets
- Local development: backend and frontend
- API overview (endpoints & flows)
- Authentication and RBAC
- Data and migrations
- Key files to inspect (backend)
- Build, deploy & CI notes
- Common issues and troubleshooting
- Recommendations and next steps

---

## Project summary

SpendSwift is a Purchase Request (PR) management system with a React + TypeScript frontend and a Laravel 12 (PHP) backend. It supports multi-role approvals, file uploads, JWT authentication, and role-based access control (RBAC). The frontend is located at the repository root (React app). A Laravel backend (Action-G-backend) is included in the repo for local development. The backend expects a MySQL database in development/production (see DB config below). PHP 8.2+ is recommended.

## Repository layout — important locations

Top-level (root of workspace)

- `package.json` — frontend scripts and dependencies (Vite, React, shadcn components, Tailwind)
- `src/` — frontend source (React + TS)
- `vite.config.ts` — Vite configuration for the frontend
- `postcss.config.js` / `postcss.config.cjs` — PostCSS & Tailwind setup
- `dist/` — built frontend output (after `npm run build`)
- `Action-G-backend/` — Laravel backend (this is the primary backend in repo)
- `backend/` — contains other backend pieces (see `backend/app/`)
- `public/` — static public assets for the frontend
- `README.md`, `API_INTEGRATION_GUIDE.md` — project and API docs
- `SpendSwift-API-Collection.json` & `SpendSwift-Complete-API-Collection.json` — Postman collections for API testing

Note: There are two backend directories: `Action-G-backend/` (Laravel app) and a smaller `backend/` directory used for other integrations. The Laravel app is the canonical API backend used by the frontend.

## Backend(s) in this repo

1) `Action-G-backend/` — Laravel application
   - Standard Laravel layout (`app/`, `routes/`, `config/`, `database/`, `public/`).
   - `artisan` available at repo root of that folder for migrations, serving, and other tasks.
   - `composer.json` and `vendor/` present — vendor dependencies checked in here.

2) `backend/` — smaller backend utilities folder (contains `app/Http/Providers` and may include integration endpoints or server stubs used during development). Inspect `backend/app/Http` for handlers used by the frontend in some environments.

## Environment variables (quick reference)

Frontend (in `.env` / `.env.example` at repo root)

- `VITE_API_URL` / `VITE_BASE_URL` — The frontend uses a Vite env var (prefixed `VITE_`) to point to the Laravel API, typically `http://127.0.0.1:8000/api`.
- `VITE_DEMO_MODE` — (true/false) toggles demo mode fallback logic.

Laravel Backend (`Action-G-backend/.env` and `.env.example`)

- `APP_NAME`, `APP_ENV`, `APP_KEY`, `APP_DEBUG`, `APP_URL`
- `DB_CONNECTION` (use `mysql`), `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` — the project uses MySQL as the primary database. Update these values to point at your local MySQL instance.
- `JWT_SECRET` or `JWT_KEY` — used by JWT auth package (tymon/jwt-auth or similar)
- Mail, queue and cache settings as typical in Laravel apps

Make sure `.env` values are configured before running artisan commands or the application. If you don't have a MySQL database yet, create one and grant a user privileges (example below).

## Local development — backend and frontend

Backend (Laravel)

1. cd into `Action-G-backend/`
2. Install PHP dependencies: `composer install` (vendor dir exists in repo, but run composer to ensure native dependencies are correct)
3. Copy `.env.example` to `.env` and update config values
4. Generate app key: `php artisan key:generate`
5. Add JWT secret if required: `php artisan jwt:secret` (or set `JWT_SECRET` in `.env`)
6. Configure and create the MySQL database, then run migrations and optionally seeders:
   - Create database (example MySQL commands):
     ```sql
     CREATE DATABASE spendswift CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
     CREATE USER 'spend_user'@'localhost' IDENTIFIED BY 'your_password';
     GRANT ALL PRIVILEGES ON spendswift.* TO 'spend_user'@'localhost';
     FLUSH PRIVILEGES;
     ```
   - Set your `.env` values (example):
     ```env
     DB_CONNECTION=mysql
     DB_HOST=127.0.0.1
     DB_PORT=3306
     DB_DATABASE=spendswift
     DB_USERNAME=spend_user
     DB_PASSWORD=your_password
     ```
   - Run migrations and seeders:
     - `php artisan migrate` or `php artisan migrate --seed`
7. Run server for local testing:
   - `php artisan serve --host=127.0.0.1 --port=8000`

Frontend (React + Vite)

1. From project root (where `package.json` sits): `npm install`
2. Create `.env` from `.env.example` and set `VITE_API_URL` to backend API
3. Start dev server: `npm run dev`
4. Build for production: `npm run build` (generates `dist/`)

Notes: If you encounter `'vite' is not recognized`, run `npm install` first to ensure `node_modules/.bin/vite` exists. The repo already contains `vite` in `devDependencies`.

## API overview — important endpoints

The API surface follows RESTful conventions. The primary groups are:

- Authentication
  - `POST /api/auth/login` — login and receive JWT
  - `POST /api/auth/logout` — invalidate token
  - `POST /api/auth/refresh` — refresh token
  - `GET /api/auth/me` — get authenticated user

- Requests (Purchase Requests)
  - `GET /api/requests` — list requests (filtered by role/permissions)
  - `POST /api/requests` — create a request
  - `GET /api/requests/{id}` — show request
  - `PUT /api/requests/{id}` — update request
  - `POST /api/requests/{id}/submit` — submit for approval
  - `GET /api/requests/pending-approvals` — list pending approvals for the logged-in approver

- Approvals
  - `POST /api/approvals/{requestId}/approve`
  - `POST /api/approvals/{requestId}/reject`
  - `POST /api/approvals/{requestId}/transfer-funds`

- Admin
  - `GET /api/admin/users` — list users
  - `POST /api/admin/users` — create user
  - `PUT /api/admin/users/{id}` — update user
  - `POST /api/admin/users/{id}/toggle-status` — enable/disable user

Also review `Action-G-backend/routes/api.php` (or `routes/` in that backend) to see precise route definitions and middleware.

## Authentication and RBAC

- Authentication uses JWTs. The frontend stores the token (e.g., localStorage) and sends it as `Authorization: Bearer <token>` on subsequent requests.
- Backend enforces RBAC using roles: `USER`, `DIRECT_MANAGER`, `ACCOUNTANT`, `FINAL_MANAGER`, `ADMIN`.
- Middleware checks the role to allow/deny routes; some endpoints will return filtered results based on role.

## Data, migrations and seeders

- Database config uses MySQL for development/production (`DB_CONNECTION=mysql`). Ensure your MySQL instance is running and `.env` is configured as shown above.
- Migrations are in `Action-G-backend/database/migrations` and seeders in `Action-G-backend/database/seeders`.
- If you need to reset data during development:
  - `php artisan migrate:fresh --seed`

Notes on MySQL vs SQLite: the code and migrations assume a relational database with full SQL features. MySQL is the supported environment for this project; behavior can differ if you switch to SQLite (indexes, strict mode, JSON fields, etc.).

## Key backend files to inspect (high-value)

- `Action-G-backend/routes/api.php` — API endpoints and middleware
- `Action-G-backend/app/Http/Controllers/` — controllers for requests, approvals, auth, admin
- `Action-G-backend/app/Models/` — Eloquent models (User, Request, Approval, etc.)
- `Action-G-backend/app/Policies/` or `app/Providers/AuthServiceProvider.php` — authorization rules
- `Action-G-backend/config/auth.php` — authentication guards and providers
- `Action-G-backend/config/jwt.php` or `config/` files for your JWT package
- `Action-G-backend/database/migrations` — migrations for tables and schema
- `Action-G-backend/database/seeders` — demo users and sample data
- `Action-G-backend/.env.example` — template environment variables

### Controllers & Models quick map

- Controllers (high level)
  - `AuthController` — login, register, logout, refresh token, profile, change password
  - `RequestController` — CRUD for requests, submit, pending approvals, user requests
  - `ApprovalController` — approve, reject, transfer funds, approval history
  - `DashboardController` — stats, recent activity, admin overview, team reports
  - `UserController` — user management, toggle status, search & pagination

- Models (high level)
  - `User` — users, roles, relationships to Team and Department, JWTSubject implementation
  - `Request` — purchase and project requests, state machine helpers, relations to items, approvals, and quotes
  - `RequestItem` — line items for purchase requests
  - `RequestQuote` — request quotes/attachments
  - `Approval` — approval records with stage, decision, comment, and approver relation
  - `AuditLog` — recent activity and change tracking
  - `Team`, `Department`, `Budget` — organizational entities used for approver selection and reporting

### Common model behaviors

- `Request` auto-generates a human-friendly `request_id` during creation (prefixes: `PR` or `PROJ`).
- Requests have scopes like `forApprover`, `byType`, `byState`, and helper methods such as `canBeApprovedBy` and `getNextApprovalState`.
- `User` exposes helper methods like `isAdmin()` and `canApproveRequests()` used across controllers to gate actions.


## Build, deploy & CI notes

- Frontend build: `npm run build` outputs `dist/` folder. Serve `dist/` behind CDN/static host or integrate into Laravel public directory if you prefer a unified deploy.
- Backend deploy: Standard Laravel deploy patterns (Forge, Envoyer, Docker, etc.). Ensure environment variables (APP_KEY, JWT_SECRET, DB credentials) are set in production.
- Netlify / static hosting configuration: `netlify.toml` exists if you host the frontend separately.

## Common issues & troubleshooting

1. 'vite' not recognized (on Windows) — run `npm install` in the project root so `node_modules/.bin/vite` is available.
2. PostCSS plugin warning during build: "A PostCSS plugin did not pass the `from` option to `postcss.parse`" — usually a warning about plugin config; ensure `postcss.config.js` and plugin versions are compatible. This rarely blocks the build.
3. Large bundle size warning — Rollup warns when code chunks exceed 500 kB. Consider code-splitting dynamic imports or using `build.rollupOptions.output.manualChunks` in `vite.config.ts`.
4. JWT auth issues — ensure `JWT_SECRET` is set and that token refresh endpoints are implemented as expected.
5. CORS / API connection issues — verify backend is running on the configured port and CORS is allowed for the frontend origin.

## Recommendations & next steps

- Add or verify API documentation (OpenAPI/Swagger) for precise request/response schemas.
- Add a small `CONTRIBUTING.md` describing how backend devs should run Laravel migrations and seeders and how to point frontend to the dev API.
- Address PostCSS warnings by verifying `postcss.config.*` and plugin versions. Add a minimal CI step that runs `npm run build` to catch build warnings early.
- Add a bundle analysis step (`rollup-plugin-visualizer`) to a development build script to identify heavy modules.

---

If you'd like, I can:

- Generate a `CONTRIBUTING.md` with step-by-step backend setup commands.
- Add a simple `deploy/` script example for deploying the Laravel app + static frontend.
- Run `php artisan migrate --path=...` or open specific backend files and summarize controllers/models in more detail.

Tell me what extra depth you want (detailed controller map, DB schema summary, or a small CI workflow) and I'll add it.

## Frontend logic, perfect AI prompt, missing-UI handling, and Postman skeleton

Below is a precise frontend-focused logical overview for this project (terms and flows used by your UI team), a ready-to-use AI prompt you can run to analyze the UI and generate backend work, guidance to handle missing UI pieces and frontend-backend contract details, and a minimal Postman collection skeleton you can import and expand.

### 1) Frontend logic & flows (project terms)

Overview: The app supports two submission types: Purchase Request (PR) and Project. PRs require approvals and follow a multi-stage workflow. Projects are tracked items without formal approval stages — they are created and then monitored by manager/accountant.

- Actors / Roles
  - User: creates PRs or Projects. Can submit PRs and select quotes provided by the accountant.
  - Direct Manager: reviews SUBMITTED PRs and either approves or rejects them.
  - Accountant: after manager approval, adds "عروض الاسعار" (price quotes) to the PR, sends them to the user to choose; once the user picks a quote, the accountant processes payment (transfers funds).
  - Final Manager / Admin: final authority to approve or transfer funds for high-value requests; admin can manage users.

- PR lifecycle (frontend events and UI states)
  1. DRAFT — User creates PR, saves as draft. UI: editable form with items, costs, attachments.
  2. SUBMITTED — User submits PR. UI: read-only summary with status badge, show current approver.
 3. DM_APPROVED — Direct Manager approved. Accountant notified. UI: shows approval history, allow accountant to add quotes.
 4. ACCT_APPROVED — Accountant approved after quote chosen (or accountant marks as approved). UI: shows quote chosen and payout status.
 5. FINAL_APPROVED — Final manager approved (if applicable).
 6. FUNDS_TRANSFERRED — Accountant (or admin) marks funds as transferred; show payout reference.

- Project flow (no approvals)
  - User creates project record with details and optional items. UI: project details page and a tracking timeline.
  - Manager & Accountant can view and update project status, budgets, and add notes. No formal approve/reject.

- Quote flow (عروض الاسعار)
  - After DM_APPROVED, Accountant adds 1..N quotes to the PR. Each quote includes vendor, price, delivery estimate, attachments.
  - Accountant triggers an action: "send quotes to user" which notifies the user (frontend: a modal or notification link).
  - User reviews quotes and selects one (POST /api/requests/{id}/select-quote). The selection triggers accountant actions (payment preparation).

### 2) Perfect AI prompt (ready to use)

Use this prompt to analyze the frontend UI codebase and produce a mapping to backend endpoints, missing UI components, Postman collection, and a backend task list.

Prompt (copy-paste):

"I am building a 'vibe coding' backend for a PHP Laravel + TypeScript React project (SpendSwift). Analyze the frontend in `src/` and the existing backend in `Action-G-backend/`. Produce:

1) A detailed API contract (endpoints, methods, request/response JSON schemas) for the PR system and Projects, including the quote workflow (`عروض الاسعار`) and selection flow. Include authentication headers and error formats.
2) A prioritized list of missing or incomplete frontend UI elements required to fully support the backend flows, with exact file paths (where to add components/pages) and suggested React component props + TypeScript interfaces.
3) Postman collection (JSON) with example requests for all endpoints and example responses (happy path + 2 common error responses per endpoint).
4) A migration plan of backend tasks (controllers, routes, models, validators) to cover gaps, with one-line acceptance criteria and estimated priority (P0/P1/P2).
5) A frontend-backend integration checklist (CORS, env vars, token storage & refresh, error handling, toast UX, optimistic updates) and code snippets for axios interceptors (TypeScript) to handle token refresh + retries.

Requirements: Be precise — include JSON schemas for request bodies and responses, TypeScript interfaces for all data models used by the frontend, and example Postman request bodies. Use English, but include Arabic labels where domain-specific terms exist, e.g., `عروض الاسعار` for quotes. Handle missing UI by proposing minimal wireframe components and fallback UX.

Return result as a markdown document and a Postman collection JSON file. Do not modify backend source files — only propose changes and provide code snippets." 

### 3) Handling missing UI & ambiguous UX

When the frontend lacks required UI or the data contract is ambiguous, follow this approach:

1. Create a small, isolated React page/component for the missing feature (e.g., `src/pages/RequestQuotes.tsx`) using shadcn UI primitives. Keep business logic separate from UI by using `src/lib/requestsApi.ts` methods and `src/stores/prStore.ts` for state.
2. Use feature flags or `VITE_DEMO_MODE=true` to toggle mock behavior while the backend is developed.
3. Design each component with a clear TypeScript interface. Example: Quote interface:

```ts
interface Quote {
  id: string;
  request_id: string;
  vendor: string;
  price: number;
  currency: string;
  delivery_days?: number;
  attachments?: string[]; // URLs
}
```

4. For missing pages, add minimal routes in `src/pages` and wire them in `src/App.tsx` so reviewers can quickly navigate to the UI during integration testing.

### 4) Frontend-backend contract checklist (minimal)

- Base URL: `VITE_API_URL` -> `http://127.0.0.1:8000/api` (default)
- Auth: JWT in `Authorization: Bearer <token>` header. Provide `POST /api/auth/refresh` to renew tokens. Axios interceptor must refresh and retry once on 401.
- Error format: follow existing project format — { success: false, error: { code, message, details? } }
- Pagination: endpoints return `meta.pagination` with page, limit, total.
- Timestamps: use ISO 8601 strings from backend (frontend should parse with date-fns).

Axios interceptor snippet (TypeScript) — include this in `src/lib/api.ts`:

```ts
// ...existing code...
// axios instance with refresh flow (pseudocode)
axiosInstance.interceptors.response.use(
  res => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      // attempt token refresh
      const refreshRes = await authApi.refreshToken();
      if (refreshRes?.data?.token) {
        auth.setToken(refreshRes.data.token);
        original.headers['Authorization'] = `Bearer ${refreshRes.data.token}`;
        return axiosInstance(original);
      }
    }
    return Promise.reject(err);
  }
);
```

### 5) Minimal Postman collection skeleton

Save this JSON as `postman/SpendSwift-PR-Project-Collection.json` or import it into Postman and expand.

```json
{
  "info": {
    "name": "SpendSwift PR & Projects",
    "_postman_id": "0000-0000-0000-0000",
    "description": "Minimal collection for PR, quotes (عروض الاسعار), approvals and projects",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Auth - Login",
      "request": {
        "method": "POST",
        "header": [{"key":"Content-Type","value":"application/json"}],
        "url": {"raw":"{{baseUrl}}/auth/login","host":["{{baseUrl}}"],"path":["auth","login"]},
        "body": {"mode":"raw","raw":"{ \"email\": \"admin@spendswift.com\", \"password\": \"password123\" }"}
      }
    },
    {
      "name": "Requests - Create PR",
      "request": {
        "method": "POST",
        "header": [{"key":"Content-Type","value":"application/json"},{"key":"Authorization","value":"Bearer {{token}}"}],
        "url": {"raw":"{{baseUrl}}/requests","host":["{{baseUrl}}"],"path":["requests"]},
        "body": {"mode":"raw","raw":"{ \"type\": \"purchase\", \"title\": \"Buy laptop\", \"description\": \"For dev work\", \"category\": \"Hardware\", \"desired_cost\": 1200, \"currency\": \"USD\", \"needed_by_date\": \"2025-12-01\", \"items\": [{ \"name\": \"Laptop\", \"quantity\": 1, \"unit_price\": 1200 }] }"}
      }
    },
    {
      "name": "Requests - Add Quote (عروض الاسعار)",
      "request": {
        "method": "POST",
        "header": [{"key":"Content-Type","value":"application/json"},{"key":"Authorization","value":"Bearer {{token}}"}],
        "url": {"raw":"{{baseUrl}}/requests/{{requestId}}/quotes","host":["{{baseUrl}}"],"path":["requests","{{requestId}}","quotes"]},
        "body": {"mode":"raw","raw":"{ \"vendor\": \"Vendor A\", \"price\": 1150, \"currency\": \"USD\", \"delivery_days\": 7 }"}
      }
    },
    {
      "name": "Requests - Select Quote",
      "request": {
        "method": "POST",
        "header": [{"key":"Content-Type","value":"application/json"},{"key":"Authorization","value":"Bearer {{token}}"}],
        "url": {"raw":"{{baseUrl}}/requests/{{requestId}}/select-quote","host":["{{baseUrl}}"],"path":["requests","{{requestId}}","select-quote"]},
        "body": {"mode":"raw","raw":"{ \"quote_id\": \"{{quoteId}}\" }"}
      }
    },
    {
      "name": "Approvals - Approve",
      "request": {
        "method": "POST",
        "header": [{"key":"Content-Type","value":"application/json"},{"key":"Authorization","value":"Bearer {{token}}"}],
        "url": {"raw":"{{baseUrl}}/approvals/{{requestId}}/approve","host":["{{baseUrl}}"],"path":["approvals","{{requestId}}","approve"]},
        "body": {"mode":"raw","raw":"{ \"comment\": \"Approved\" }"}
      }
    }
  ]
}
```

---

If you want, I will now:

- Run a quick scan of `src/` to list missing UI pages/components that match the flows above and produce a single PR with skeleton components (no styling) so the backend can be tested end-to-end.
- Or generate the Postman collection file under `postman/` in the repo and commit it.

Tell me which of those to do next.

