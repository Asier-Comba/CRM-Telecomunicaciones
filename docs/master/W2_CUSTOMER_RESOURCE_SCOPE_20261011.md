# Customer360: isolate the lifetime of each customer

Changing the `id` of `IntegratedCustomerDetail` or
`AuthorizedCustomerContext`, or the `customerId` of `Customer360Overview`,
previously retained the old identity, summary, contacts and local dialogs while
the new request was pending. Existing effect cleanup rejected late replies but
did not retire already displayed state. An archive dialog could remain open
while its parent had received a different customer reference.

Each exported component now owns a child keyed by its customer reference. The
change removes old reads, editors, archive/contact intents and expanded
priorities synchronously. The existing effect cleanup still rejects replies
from the retired child. Selecting the same customer keeps its current draft.
Ordinary identity admission, DTO validation, repository commands and server
authorization are unchanged. The common ProductProvider separately owns the
actor/workspace/role lifetime.

## Reproduction and bounded verification

`tests/e2e-preview/customer-resource-scope.spec.ts` mounts the actual exported
components and actual repository/strict parsers with controlled HTTP responses.
All three components reproduce retained identity/counts against parent B57 at
1440px. The valid reproduction uses civil-date read DTOs and dispatches the
external fixture chooser to simulate a parent prop change during a modal. An
earlier invalid timestamp fixture and a modal-overlay click failure are retained
outside the repository and do not constitute product reproductions.

Nine final local cases pass at 390, 768 and 1440px:

- Previously displayed identities, contacts, counts and priority links disappear
  before the delayed new identity/summary is released.
- A same-customer contact draft remains; a new customer removes that draft.
- A pending archive dialog is removed when the customer changes.
- New-customer counts and identity are exact; delayed old summary/attention
  replies cannot replace them.
- Denied new reads leave no previous identity or action, and context/overview
  report the denial through the supplied callback.
- No business command is sent and no browser error/horizontal overflow occurs.

The chooser/provider binding and HTTP transport are synthetic. These cases do
not prove Auth, SQL, RLS, cross-tenant authority or commercial/security acceptance.
Focused strict ES2017 types and lint pass locally. The own CI browser total is
expected to grow from 160 to 178; it is not yet an executed result.

## Preserve earlier closed failures

B57 owns 1140 functional tests, lint/full types/build66, preview160 and native
85 migrations/320 functions including the normal completion postcommit SIGKILL
and fresh-process recovery with all 14 original audits. Its own Supabase run
38136948098 failed: 105 passed, two TIMEOUT checks failed
(`opportunity_real_drag_keyboard_conflict`, and
`layout:portfolio:1440:exact_reference:current_request`). Auth85, backend,
history, grounding and teardown passed. B57 is not eligible for composition.

The pipeline failure frame shows its loaded draggable record and the visible
empty-stage disclosure. The test attempted to locate a hidden empty destination
before opening it. The full SQL/browser acceptance now opens that disclosure
with Enter and checks expansion before performing the original drag, persisted
stage readback, keyboard move and stale-version conflict checks. No persistence
or conflict assertion is removed. The new physical result is pending.

The portfolio failure frame shows access verification still loading. Its cause
is unproven. This customer change does not claim to fix it or D3ac's earlier
100/107 failure. Root A885 remains the last composition with its own functional
gates closed. IA business stays OFF; full23, verified absence and independent
W4 security acceptance remain pending.
