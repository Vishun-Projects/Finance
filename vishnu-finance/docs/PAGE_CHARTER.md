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
