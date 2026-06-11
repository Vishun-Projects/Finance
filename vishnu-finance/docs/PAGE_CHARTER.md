# Page Charter

Each route has **one job**. Pages link to each other for depth; they do not duplicate full workflows.

| Route | Single job | Must NOT become |
|-------|------------|-----------------|
| `/dashboard` | **This month at a glance** — mobile hub (Overview / Plans / Activity), pulse, search, recent txns, quick actions, Explore shortcuts | Full goals editor, full txn list, fund research |
| `/transactions` | **All money movement** — import, categorize, search, export | Plan capacity essay, recurring bills list, retirement sim |
| `/plans` | **Commitments** — goals, bills & dues, wishlist, funding gap | Bank balance hero, duplicate month KPIs |
| `/phase-plan` | **Budget model** — how take-home is allocated | Goals/deadlines CRUD |
| `/investments` | **Investing activity** — SIP detection, CAS, research, retirement | Generic expense KPIs |
| `/financial-health` | **Score + trends + tax hints** — longitudinal view | Bank balance, duplicate goals/deadlines lists |
| `/net-worth` | **Assets vs liabilities** — net total, debt payoff hints | Transaction list, bank balance hero |
| `/salary` | **Income structure** | Plan adherence |
| `/advisor` | **AI + contextual insights** (links out; no duplicate charts) | Replace dedicated pages |
| `/education` | **Learning / market briefings** (nav label: Learn) | Personal data CRUD |
| `/reports` | **Month summary + CSV export** | Live editing of transactions |

## Plans tabs

Overview · Goals · **Bills & dues** · Wishlist

**Detected recurring bills** (subscriptions, mandates) appear **only** on Plans → Bills & dues — not on Transactions or Dashboard.

## Mobile navigation

- **Bottom nav (4 items):** Dashboard, Advisor, Transactions, Plans
- **Explore shortcuts** (Learn, Health, Investments, Salary, Settings, Assets & debt, Reports) live on Dashboard → Overview

## Shared components

- `MonthAtGlanceKpis` — Dashboard + Transactions only
- `AccountBalanceChip` — Dashboard + Transactions only
- `PlanDisciplineStrip` — Dashboard Plans tab + Financial Health (compact); full banner on Plans Overview only
- `PageMandate` — every main page (title + one-line job + max 3 metric chips above the fold)

---

## Layout contract

Configuration lives in [`src/lib/layout-config.ts`](../src/lib/layout-config.ts).

### Scroll modes

| Mode | Routes | Scroll owner | Scrollbar |
|------|--------|--------------|-----------|
| **page-scroll** (default) | All except `/transactions` | `main` in app layout | Hidden (`.scrollbar-none`) |
| **table-scroll** | `/transactions` only | Transaction list/table panel | Hidden |

Only `/transactions` uses internal panel scroll. Every other route scrolls via `main`. Modals, sheets, and max-height lists inside cards may scroll internally.

### Desktop scroll

**page-scroll routes:** `main` scrolls on laptop/desktop (`overflow-y-auto`). Page content must not use fixed `max-height` wrappers that clip without an internal scroller.

**table-scroll routes:** On `lg+`, the viewport flex chain (`MainScrollContainer` → `AppPageShell` → `.transactions-layout-root`) fills remaining height; only inner list/aside panels scroll.

**Salary / long forms:** Rely on page-scroll `main`; do not cap page root with `max-h` without `overflow-y-auto`.

---

### Bottom-nav clearance

CSS tokens in [`globals.css`](../src/app/globals.css):

| Token | Purpose |
|-------|---------|
| `--app-bottom-inset` | Bottom nav pill + safe area — padding on scroll surfaces |
| `--app-scroll-end-gap` | Extra end gap on **page-scroll** routes only (`MobileScrollEndSpacer`) |

**page-scroll routes:** `main` gets `max-lg:pb-[var(--app-bottom-inset)]` plus `MobileScrollEndSpacer` for the scroll-end gap.

**table-scroll routes:** Every inner scroller (List, Calendar, Stats, desktop table) uses `pb-bottom-bar scroll-pb-bottom-bar` so the last row clears the bottom nav.

Utility classes: `.pb-bottom-bar` (padding-bottom) and `.scroll-pb-bottom-bar` (scroll-padding-bottom).

### Rules A–F

**A — Page header (exactly one)**  
Global top bar title **or** `PageMandate` **or** custom h1 — never stacked duplicates. Never `PageMandate` + `PageHero` on the same route.

**B — KPI strip (exactly one per view)**  
If `PageMandate.metrics` is present, tab content must not repeat the same labels.

**C — Toolbar (Refresh / Add — one row)**  
When Plans tabs are embedded in `plans-page`, tab components with `layoutVariant="embedded"` hide their header and toolbar at all breakpoints; the parent owns Refresh/Add.

**D — Scroll**  
If route is `/transactions`: `main` does not scroll; only the table/list panel scrolls. Else: `main` scrolls; pages must not wrap full content in `overflow-y-auto`.

**E — Theme toggle**  
Dashboard, Plans, Advisor, and Transactions mobile headers include theme toggle (global top bar hidden on those routes).

**F — Orphan cleanup**  
When refactoring a page, remove unused imports, duplicate headers, and obsolete layout props (`fillViewport`, `fillHeight`, etc.) in the same change.

### Route layout flags

| Route | hideGlobalTopBar | tableScrollShell | scrollMode |
|-------|------------------|------------------|------------|
| `/dashboard` | yes | no | page |
| `/plans` | yes | no | page |
| `/advisor` | yes | no | page |
| `/transactions` | yes | yes | table |
| Others | no | no | page |
