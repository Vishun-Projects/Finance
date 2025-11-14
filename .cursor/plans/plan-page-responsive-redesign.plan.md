## Plan Page Responsive Redesign

### Objective
- Redesign `src/app/(app)/plans/page-client.tsx` to deliver distinct, enhanced experiences for desktop/laptop vs. mobile, leveraging `shadcn/ui` components.

### Tasks
1. Build new mobile layout
   - Audit existing sections (hero stats, filters, plan cards, charts, activity).
   - Introduce mobile-first structure using `Tabs`, `Sheet`, `Command`, `Accordion`, etc., ensuring the mobile bottom navigation (`safe-area-bottom` container) is always visible.
   - Replace large hero statistic cards with a condensed carousel or `Tabs` (`shadcn` `Card`, `ScrollArea`) optimized for touch.
2. Build desktop/laptop layout
   - Implement a two-column + sidebar layout using `ResizablePanelGroup`, `Tabs`, or `Card` grids.
   - Surface additional insights (e.g., upcoming deadlines, budget split) using `HoverCard`, `Tooltip`, or `Chart` wrappers.
3. Abstract shared logic
   - Refactor any view-model logic (data fetching, state) to be layout-agnostic.
   - Create helper components (e.g., `PlanSummaryCard`, `PlanProgressList`, `PlanFilters`) for reuse across breakpoints.
4. Enhance interactions
   - Add quick actions via `QuickActionsMenu` with context-aware options (e.g., add plan, record contribution).
   - Integrate `Sheet` or `Dialog` for plan details on mobile; use `Drawer` or inline `Popover` on desktop.
5. Style polish and consistency
   - Ensure Tailwind spacing uses responsive prefixes (`md:`, `xl:`) and respects global padding adjustments.
   - Validate color usage aligns with design tokens (`bg-card`, `border-border`, `text-muted-foreground`).
   - Maintain accessibility: focus states, ARIA labels, animation reductions (`prefersReducedMotion`).
6. QA
   - Verify bottom tab bar (`safe-area-bottom` container) remains fixed/visible.
   - Test key flows on narrow (<768px) and wide screens, ensuring no layout regressions.
   - Run `npm run lint` if edits touch TSX logic or introduce new components.

