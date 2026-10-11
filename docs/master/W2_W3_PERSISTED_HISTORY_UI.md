# Persisted conversation history UI candidate

Owner: W2 UI consumer of existing W3 history v2. Base composition:
0fa8864928074e86a40cdc38707111df7f1f7060. No W3 RPC, SQL, capability, provider,
business dispatcher or privilege changes. All73 migrations remain unchanged.

The integrated assistant previously offered only page-memory conversations while
the W3 cookie/RPC history was independently exercised by the acceptance runner.
The server now selects the persisted display only when the existing local W3
gate is enabled; preview and flag-off behavior retain their current component.
Production/remote transport gates are unchanged. History creation/rename/archive
are human actions on the existing user-owned conversation API, not AI business
writes. Query generation, invoice proposals and business actions remain disabled.

The consumer uses the fixed same-origin cookie endpoint, no-store and bounded
requests. Runtime display validation rejects extra/private fields, wrong IDs,
out-of-order/duplicate messages, false historical/completeness markers and invalid
CAS/archive receipts. Titles/messages render only as React text. Historical text
never becomes current CRM evidence, a selected-context binding, model input or
action authority. Messages and conversations use separate20-row server cursors;
there is no invented total or all-record query. Empty and unavailable differ.

The ProductProvider exposes the already resolved server workspace ID as nullable
display context, alongside actor/role. Existing callers retain compatible props;
the history component remounts on actor/workspace/role changes. This key grants
no authority and is never sent as a scope override. The cookie API resolves active
membership and ownership per request. A failed read removes displayed records;
revocation cannot be treated as an empty successful history. In-flight responses
are fenced by a component generation and aborted on unmount. No browser storage,
URL persistence, shared cache or telemetry contains history text.

Creation holds its frozen UUID/title across uncertain delivery and exposes only
an explicit retry of that same creation. No automatic retry. Rename/archive use
the actual fetched version; uncertain/stale results require an authorized refresh,
not a blind version increment. Archive requires its own explicit confirmation;
the backend retains archived messages. Refreshing an uncertain selected thread
uses its exact known ID rather than claiming absence from a bounded list.

Meaningful client tests cover hostile fields/accessors, identity/CAS/archive
validation, Unicode byte bounds, keyset partiality, literal history, cookie-only
fixed transport, denied/malformed responses and absence of automatic retries.
The actual Supabase history phase additionally runs a real authenticated Chromium
context with actual Auth-derived cookies: real UI create with committed response
delivery loss and exact same-UUID/title retry/one persisted thread,22 real RPC-seeded messages,
20+2 message pagination, text injection inertness, rename/CAS, reload persistence,
three widths/upper-and-lower captures, no history in browser storage, active-JWT
revocation/display removal, archive/message retention and20+1 thread pagination.
Browser/app cleanup remains sequential before the retained107 W2 product groups.
No response/Auth mock, timer increase, removed assertion or DB reset is used.

Local client tests3/3 PASS, changed-file lint/types PASS. Windows full assistant
suite480/481: the unchanged native-driver prerequisite runner prints its expected
message but Node24.12 aborts during immediate exit with libuv assertion
UV_HANDLE_CLOSING (unsigned exit3221226505). The assertion is not weakened;
physical durability remains NOT_TESTED. A local build initially rejected a
shared node_modules junction outside Turbopack's root; that task-owned link was
removed without touching its target and an independent lockfile install completed
with416 packages. After installation only2.1–2.4GiB was available, so the next
heavy build is deferred to CI under the resource gate. Neither failure is a
claimed PASS. Full compilation,
all deterministic regressions and exact-source real Supabase/browser evidence
must be recorded before acceptance; merely implementing this harness proves no
backend/UI PASS. Existing backend/API successes do not accept this new consumer.
The preceding full composition107/107 gate is separately pending at preparation.

Issue29 remains five HIGH with the full audit enforced. Issue10 and independent
W4 approval continue to block AI business writes; physical durability NOT_TESTED.
PUBLIC repository remains a critical governance risk; recommend private without
changing visibility. Original master sources00–19 remain unavailable. W5 scripts,
VPS/production/providers and external sends are untouched. Persistent local
Supabase remains resource-blocked; verified CLI2.119.0 is installed without start.

Next three: prove preceding107/107 and this exact candidate's whole suite; inspect
actual history and product captures and request independent W4 review through
GitHub; connect grounded read/context semantics only after their own contracts and
gates, leaving invoice/business writes disabled. Broader product/local acceptance
and live model quality remain unfinished.

## Terminal actual consumer evidence

Source `92ea85c718cb685fa1de140eda7e1e37a85b904e`, executed `0d6ed4ab70d77d58e7a777be631a34299f3d59ab`, tree `d6a7ccc3ea7d76ab7934142ed191377e6ad7fa0e` equals source. Supabase37855856474/job113579731794 **107/107**, Auth200,3468+227,73 migrations, backend/API and new actual browser history/CAS/pagination/revocation PASS, teardownPASS. Quality410+481/lint/types/buildPASS; audit5HIGH FAIL. Real browser artifact11584363276 reviewed at desktop/mobile: literal injection remains inert, persisted displays work, mobile rename input needs separate presentation correction PR45. These results supersede pending consumer evidence for this exact source only. Separate Windows CLI fix PR43 is now normally composed; full local assistant482/482 on the composition, but its fresh whole remote gate remains pending. See W2_W3_ACCEPTANCE_LEDGER_20261009.md. Business durability/provider live/context/invoice/W4/local full product gates remain unfinished.
