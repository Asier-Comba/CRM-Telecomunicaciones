# W2 bootstrap UI gap and refactor plan

- Owner: W2
- Date: 2026-09-25
- Source reviewed: `w1/bootstrap-canonical` at `0dd2f14`
- Scope: shared primitives, product shell, navigation and route feedback
- Status: exact implementation plan; source edits wait for the canonical integration gate

## 1. Outcome

The W1 bootstrap contains a usable historical UI foundation, but it is not yet a coherent accessible design system. W2 will retain proven visual/interaction intent while replacing unsafe component contracts incrementally after the W1/W4 integration gate passes.

No file in this plan is copied from the historical repository. The reviewed files already exist in the new development repository on W1's branch.

## 2. Reviewed surface

| Area | Files |
| --- | --- |
| Primitives | `Button.tsx`, `Input.tsx`, `Badge.tsx`, `SectionCard.tsx`, `EmptyState.tsx` |
| Feedback | `PageSkeleton.tsx`, route `loading.tsx` files |
| Overlays | `ConfirmDialog.tsx`, `SideDrawer.tsx` |
| Shell | `AppShell.tsx`, `Sidebar.tsx`, `Topbar.tsx`, SaaS/root layouts |
| Theme | `src/app/globals.css` |
| Page headings | `PageHeader.tsx` and SaaS routes |

## 3. P0 gaps

These must be corrected before the shell/primitives become the basis of new telecom features.

### Mobile navigation remains keyboard reachable while closed

`AppShell` keeps the drawer and all sidebar links mounted. The closed state adds `pointer-events-none` and `aria-hidden`, but does not remove descendants from sequential keyboard navigation. This can focus invisible controls and places focusable content inside an `aria-hidden` subtree.

Required fix:

- use a tested modal/drawer primitive or unmount the closed drawer;
- trap focus while open, restore it to the menu button and isolate the background;
- lock body scrolling deliberately;
- connect opener state with `aria-expanded` and `aria-controls`;
- keep Escape and route-change close behavior.

### Dialogs/drawers lack complete modal focus behavior

`ConfirmDialog` and `SideDrawer` declare `role="dialog"`/`aria-modal`, but do not set initial focus, trap focus, restore focus or make background content inert. `ConfirmDialog` does not programmatically associate its description/error.

Required fix:

- one shared overlay foundation with labelled-by/described-by IDs;
- deterministic initial focus (cancel for destructive confirmation unless product logic requires otherwise);
- focus trap, background isolation and opener restoration;
- scroll lock and nested-overlay policy;
- async pending behavior that prevents duplicate submission without trapping the user in an unrecoverable state.

### Field label/error contract is not programmatic

`Input` renders a visual `<label>` without `htmlFor` and does not guarantee an input ID. Error text is not connected through `aria-describedby`, and invalid inputs do not receive `aria-invalid`.

Required fix:

- split `Field` composition from the input control or introduce generated/stable IDs;
- associate label, hint and error;
- expose required/invalid/pending/disabled semantics;
- retain the current 16 px compact-screen protection against iOS auto-zoom;
- test server and client validation messages.

### Duplicate page-level headings

`Topbar` renders an `h1` for the route while `PageHeader` and several routes render another `h1`. Most main SaaS pages therefore expose two page-level headings, and dynamic routes can fall back to the brand name in the top bar.

Required fix:

- top bar route context becomes non-heading chrome or the page owns the single `h1`;
- route metadata/navigation labels live in one registry that handles dynamic routes;
- section cards accept/derive the correct heading level rather than always rendering `h2`.

### Route feedback coverage is incomplete

The bootstrap has route loading files only for assistant, calendar, clients, dashboard, opportunities and settings. It has no SaaS route-group `error.tsx` or `not-found.tsx`; inbox, automations and both billing surfaces have no route loading boundary.

Required fix:

- add route-group error and not-found boundaries with safe reset/navigation;
- add loading boundaries only for retained pilot routes;
- use section-level failures for Customer 360 and dashboard partial results;
- never surface stack/provider/database details;
- verify focus and announcements after user-triggered retry.

## 4. P1 gaps

| Component/area | Current evidence | Incremental correction |
| --- | --- | --- |
| `Button` | Visual variants are useful; pending spinner has no `aria-busy`; default HTML type remains implicit | Default to `type="button"` while allowing explicit submit; add busy semantics/hidden spinner; separate action and link APIs |
| Control sizing | Small buttons are 32 px high | Preserve compact desktop density but give touch controls at least a 44 px target on coarse/narrow contexts |
| `Badge` | Color vocabulary mixes semantic (`success`) and palette (`purple`, `indigo`) roles | Map source statuses through feature view models into semantic tones; hide decorative dot from assistive tech |
| `SectionCard` | Useful layout; hard-coded `h2` and header decoration | Support semantic heading composition and section states without making presentation decide document outline |
| `EmptyState` | Useful compact pattern; title is a paragraph and all empty meanings share one shape | Add heading/label contract and distinct first-use, no-data and filtered-empty variants |
| `PageSkeleton` | Layout variants reduce visual shift; every block uses `animate-pulse` | Make placeholders silent, add one loading status, respect reduced motion and avoid skeletons for immediately available shell content |
| Theme | `globals.css` has only background/foreground variables; components use raw gray/indigo/red classes | Introduce semantic surface/text/border/action/status/focus tokens through the canonical Tailwind v4 theme |
| Global overflow | `html, body { overflow-x: hidden }` can conceal component overflow defects | Keep page safe but remove this as proof of responsive correctness; test each route at 320 px and name deliberate scroll regions |
| Navigation | Labels include Dashboard, Cartera, property terminology and duplicate billing entries | Replace with the pilot IA in `W2_UI_FOUNDATION.md`; permissions/configuration come from canonical capabilities, not only public env flags |
| Active route | Exact pathname equality misses dynamic child routes | Route registry exposes match semantics and `aria-current="page"` |
| Topbar search | Direct customer query in shell, no label/combobox semantics, all results link to `/clients` | Use a typed search service, labelled combobox/listbox behavior, race/cancel/loading/error handling and canonical entity destinations |
| Notifications | Popover uses dialog role without modal behavior; future list rows are clickable `<li>` elements | Choose non-modal popover/menu semantics or full dialog; use keyboard-operable buttons/links and source-backed counts only |
| User menu | Open state lacks expanded/controls semantics and keyboard menu behavior | Implement as disclosure/popover with focus/escape/outside-click contract |
| Logout overlay | Visual blocking state lacks dialog/status semantics and focus isolation | Use the shared overlay/status foundation and retain tenant-cache clearing behavior |

## 5. Retain without redesigning first

- The responsive shell split between desktop sidebar and compact drawer.
- CSS `100dvh` use and full-width compact main column.
- The iOS input font-size protection without disabling pinch zoom.
- Loading skeleton shapes that mirror page geometry.
- Existing visual hierarchy of primary/secondary/destructive actions as design input.
- Server-side auth and workspace resolution boundaries; W2 changes presentation, not authorization.

## 6. Exact implementation sequence after integration approval

### Commit 1 — test and token seam

- Confirm the component test runner with W4.
- Add semantic theme tokens without changing feature behavior.
- Add a test harness for keyboard/focus and accessible-name assertions.

Acceptance: lint, typecheck, tests and build pass; no visual regression in existing shell routes.

### Commit 2 — field and action primitives

- Correct label/hint/error associations.
- Add action busy/type/touch-target behavior.
- Add focused component tests.

Acceptance: keyboard activation, duplicate prevention, form submit semantics and error association pass.

### Commit 3 — overlay foundation

- Replace confirmation/drawer internals with the shared accessible overlay behavior.
- Adapt mobile navigation to unmounted/inert closed state and focus restoration.

Acceptance: trap, Escape, outside-click policy, scroll lock, restoration and reduced-motion paths pass.

### Commit 4 — shell and route registry

- Establish task-oriented telecom navigation.
- Resolve single-page heading ownership and dynamic route labels.
- Add skip link, active-route semantics and capability-aware module visibility.

Acceptance: one `h1`, correct landmarks/current route, 320–1440 px shell review and no hidden focusables.

### Commit 5 — feedback foundation

- Introduce loading/empty/filtered-empty/partial-error/route-error/not-found primitives.
- Add retained route boundaries and reduced-motion skeleton behavior.

Acceptance: every retained pilot route has documented loading, empty, error and populated evidence.

### Commit 6 — global search

- Move search access out of `Topbar` into a typed adapter.
- Implement accessible results, cancellation/race handling and canonical deep links.

Acceptance: keyboard, no-results, failure, long labels, permission changes and compact layout pass.

Each commit remains independently reviewable and must not include customer/contract fields until W1 contracts exist.

## 7. Required tests

| Area | Tests |
| --- | --- |
| Shell | skip link, landmarks, single `h1`, current route, mobile open/close/restore, no hidden focusables |
| Action | link versus button semantics, submit default, pending duplicate prevention, accessible name |
| Field | label, hint/error, required/invalid, generated and supplied IDs, retained value |
| Overlay | labelled dialog, description, initial focus, trap, Escape, outside click, pending, restore, background isolation |
| Feedback | silent skeleton details, one loading announcement, scoped retry, route reset, not-found navigation |
| Responsive | 320/375/768/1024/1440 px, zoom to 200%, long Spanish labels, coarse pointer targets |
| Motion | `prefers-reduced-motion` eliminates non-essential pulse/slide/scale transitions |
| Search | labelled combobox/listbox pattern, stale request cancellation, empty/error, entity deep link |

Automated accessibility checks complement keyboard and screen-reader review; they do not replace it.

## 8. Non-goals

- No full visual rebrand before core workflows work.
- No replacement of the entire component stack in one PR.
- No telecom status mappings before W1 publishes canonical states.
- No client-side permission model.
- No copying of historical data queries into shared primitives.
