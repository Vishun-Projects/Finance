## Legacy Archive

This directory keeps components that have been removed from the active codebase but may still be useful for reference.

- **Components**
  - `src/components/SimpleDashboard.tsx` → replaced by `src/components/dashboard/simple-dashboard.tsx`.
  - `src/components/IncomeManagement.tsx` → superseded by `src/components/income-management.tsx`.
  - `src/components/income-management.tsx` → no longer referenced now that `/income` redirects into `TransactionUnifiedManagement`.
  - `src/components/expense-management.tsx` → legacy expense UI replaced by unified transactions experience.
  - `src/components/entity-mapping-manager.tsx` → admin entity mapping tooling retired.
  - `src/components/editor/**` and `src/components/blocks/editor-00/**` → experimental Lexical editor widgets with no active imports.
  - `src/components/modern-card.tsx`, `modern-grid.tsx`, `modern-page-layout.tsx` → unused layout trials; matching exports in `src/components/layout/` mirror this move.
  - `src/components/management/income-management.tsx` and `management/expense-management.tsx` → re-export wrappers for the archived components above.
  - `src/components/salary-structure-management.tsx` → replaced by `src/components/management/salary-structure-management.tsx`.
  - `src/components/layout/content-wrapper.tsx`, `modern-card.tsx`, `modern-grid.tsx`, `modern-page-layout.tsx` → layout re-exports without consumers.

- **Lib modules**
  - `src/lib/ai-assistant.ts` → legacy chat helper superseded by the in-route implementation.
  - `src/lib/circuit-breaker.ts` → unused resilience utilities.
  - `src/lib/neumorphism.ts` → styling helpers not referenced in the current UI.
  - `src/lib/performance-optimizer.ts` → experimental profiler not wired into requests.
  - `src/lib/psychology-ui.ts` → unused behavioural UI toolkit.
  - `src/lib/regulatory-compliance.ts` → compliance scaffolding kept for reference only.
  - `src/lib/websocket.ts` → websocket manager not integrated with any route.

TypeScript and ESLint ignore the `legacy/` directory so these files will not affect builds. Move files back to their original paths if recovery is required.

