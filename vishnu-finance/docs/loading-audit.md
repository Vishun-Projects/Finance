# Loading & Data-Fetching Audit (App Router)

Date: 2025-11-09  
Scope: `src/app`

## Summary

- 17 of 18 route `page.tsx` files in `(app)` and `(auth)` segments are client components (`'use client'`) that fetch data in `useEffect` (or via client contexts that do the same).  
- Only the `admin/page.tsx` route is an RSC today; everything else streams from the browser.  
- Route-level fallbacks exist inconsistently: 6 `loading.tsx` files (dashboard, expenses, income, goals, deadlines, `(app)/loading`) share no common skeleton. Many pages rely on ad-hoc inline spinners.  
- Authentication relies on a client `AuthProvider` that calls `/api/auth/me` on mount, causing cascading spinners and double-fetching on every protected page.

## Route Inventory

| Route | Component type | Current loading/data-fetching | Notes |
| --- | --- | --- | --- |
| `/` | Client (`useAuth`, `useEffect` redirect) | Waits for client auth check; shows spinner; redirects via router | Server could issue redirect via `redirect()` after reading cookie |
| `(app)/layout` | RSC wrapping client `ProtectedRoute` | `ProtectedRoute` waits on client auth context | Replace with server `requireUser()` and stream `Navigation` via RSC; move ProtectedRoute to client island if needed |
| `(app)/dashboard` | Client wrapper -> `components/simple-dashboard` | `simple-dashboard` does `fetch('/api/...')` in `useEffect` with localStorage cache | Needs server loader to hydrate initial data; split into server data loader + client island for interactions |
| `(app)/deadlines` | Client wrapper -> `DeadlinesManagement` | Component performs client fetches | Same pattern; introduce server loader |
| `(app)/education` | Client page with dynamic course fetch (client) | `EducationLanding` fetches via `useEffect` | Convert to server fetch, add ISR for catalog |
| `(app)/expenses` | Client redirect via `router.replace` | Should use server `redirect('/transactions?type=EXPENSE')` |
| `(app)/financial-health` | Client page using `FinancialHealthHub` (client data fetch) | Provide server data and streaming skeleton |
| `(app)/goals` | Client wrapper -> `GoalsManagement` | Client fetching and local state | Needs server loader |
| `(app)/income` | Client redirect via `router.replace` | Replace with server redirect |
| `(app)/learn/[courseId]` | Client page `LearningPage` | Uses `useEffect` for course/module fetch | Needs server data loader with ISR |
| `(app)/manage-transactions` | Client page `TransactionIngestionWorkbench` | Client fetch + websockets | Split: server fetch initial ingestion jobs; keep realtime island client-side |
| `(app)/profile` | Client `ProfileSettingsSection` | Loads profile data via `useAuth` + API | Server loader for profile detail with `cache: 'no-store'` |
| `(app)/settings` | Client mega-component | Fetches documents, notifications, preferences on client | Break into server-provided props + Suspense islands per tab |
| `(app)/transactions` | Client `Suspense` + `TransactionUnifiedManagement` | Management component fetches via client hooks | Stream initial dataset via server loader |
| `(app)/wishlist` | Client page `WishlistExperience` | Client fetch to `/api/wishlist` | Add server loader with ISR + client actions |
| `(app)/learn` subroutes | Client | Hit API in `useEffect` | Move fetch to server with streaming fallback |
| `(auth)/auth`, `/login`, `/register` | Client pages with forms, useAuth login | Auth endpoints hit via fetch | Keep forms client but hydrate session via server and redirect authenticated users server-side |
| `admin/layout` | Client nav | uses `usePathname` and toggles | Convert to server layout generating nav; move mobile nav toggle to client island |
| `admin` child pages (`/documents`, `/bank-mappings`, `/users`, `/audit`) | Client pages fetching via `/api/admin/...` | Each calls API in `useEffect` | Provide server loaders with streaming and pass data as props; keep inline filters client |
| `admin/page` | Already server-only | Uses Prisma directly | Retain, add shared skeleton |

## Key Issues Identified

- **Double fetch + spinner cascades**: Pages wait for `AuthProvider` to complete before rendering, causing layout flashes, redundant `/api/*` queries, and inconsistencies with ISR/edge caching.
- **Inconsistent fallbacks**: Inline spinners differ by route; lacks unified skeletons. Many routes lack `error.tsx` for graceful failure.
- **Client bundle bloat**: Heavy pages (`settings`, `simple-dashboard`) import charts, big icons, analytics in client. Server-side streaming could reduce JS shipped.
- **Caching undefined**: Fetches default to `cache: 'default'` or `'no-store'` ad hoc. No documented TTLs or ISR usage.
- **Admin area mismatch**: Layout is client-side only; no guard ensures superuser in layout (only in specific pages).

## Recommendations (Baseline)

1. Introduce `lib/server-fetch.ts` with wrappers around `fetch` supporting `{ next: { revalidate } }`, logging, and consistent error handling.
2. Create shared skeleton components (`<FullScreenSkeleton/>`, `<SectionSkeleton/>`) and reuse across `loading.tsx`.
3. Build `lib/auth/require-user.ts` to read cookies, validate tokens, and return user server-side (with optional role guard). Root layout can pass `initialUser` into a revised `AuthProvider`.
4. Refactor each route:
   - Server `page.tsx` fetches data via loader helpers.
   - Export client view component (existing logic) moved to `components/pages/*`.
   - Wrap heavy client islands in `Suspense` with streaming data from server.
5. Document caching strategy (ISR intervals per route, `cache: 'no-store'` for user-specific data) in ops guide.
6. Add per-route `error.tsx` to mirror `loading` skeleton for failure states.


