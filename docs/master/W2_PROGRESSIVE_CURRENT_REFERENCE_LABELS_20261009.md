# Current reference labels appear as each authorized read completes

The page label loader deduplicated references and bounded concurrency to four,
but returned names only after every lookup completed. A delayed operator lookup
therefore left an already-received customer identity showing “Consultando…”.
Native reproduction against source9cf6c10eae9b6c301b6f79753ffbaafd6eebc7ad uses
the actual loader, integrated repository and closed collection parsers with a
memory HTTP adapter: twenty repeated rows issue exactly two distinct reads;
no customer publication occurs before the held operator read is released.
The customer appears only after both complete. No Auth or database is involved.

The loader now optionally publishes a fresh copy of the five label records as
each current lookup resolves or fails. Existing callers still receive the same
complete final result. One ordinary read per distinct kind/id, four concurrent
reads, bounded UUID predecessor identity lookup, endpoint/cookie/no-store/DTO
validation, final closed unavailability labels and disposal checks are unchanged.
There is no cross-page cache or extra request, command, retry, widened projection,
permission bypass or timing-budget change. A prior snapshot cannot be mutated by
a later completion, and a consumer cannot mutate the loader's current result.

ScopedCollectionLabels publishes only while active and binds displayed state to
both the current rows object and repository identity. With identical rows but a
replacement repository, earlier names are hidden on the first render before its
new asynchronous reads finish. The native React probe reproduces prior names
visible synchronously under the old context and pending labels under the new
one. This proves repository identity isolation in the component, not real Auth
revocation or a claim that the production provider follows that test topology.

Three meaningful regressions plus twenty-four existing collection/telecom tests
pass: fast customer publication during a held operator read; independent stable
snapshots and page deduplication; disposal after one publication with exactly four
started reads, no queued reads and no late publication; a fresh revoked page
receives only closed unavailability labels without earlier identities. The first
disposal fixture observed only three overlapping reads because its customer
finished immediately; a deterministic four-start barrier now verifies actual
four-way overlap. This fixture correction was not a product defect.

The native browser probe uses actual ScopedCollectionLabels, loader,
NamedCustomer/NamedOperator, integrated collection/post methods and closed
parsers, React/Tailwind/Geist with a memory product provider and local HTTP. On
1440/768/390, old and updated variants render twenty repeated references. Old
holds the fast customer until the slow operator completes; updated shows it
before release. Synchronous same-rows repository replacement exposes prior names
in old and hides them in updated; both resolve fresh403 to closed unavailable
labels. Twenty-four reads, zero commands, zero page errors, no horizontal overflow.
Three updated partial-load frames were actually viewed: current customer text
and still-pending operator remain legible. The surrounding cards are a test
layout, not the complete CRM inventory. No native Auth/DB/full107 is inferred.

The four changed files are the label loader/context, their regression file and
this document. Product contract, SQL/RLS, API, roles, CAS, command intent,
dependencies, workflow,55 main acceptance names and107 checks are unchanged.
This candidate must earn its own complete Supabase/Auth/history/grounding/Storage/
teardown, quality and fresh compatibility review before canonical consumption.
Base9cf closed its own107 and46 reviewed frames; neither base nor prior unit acceptance
transfers. This mechanism does not establish the original W5 mobile timeout or
server500 cause, nor claim all enrichment is immediately ready.

Issue29/audit fiveHIGH, physical business durability and independentW4,
persistent Windows, live model and commercial gates remain open. Business AI
writes stay OFF; no production/main/VPS/provider or W4/W5 branch is changed.


## Complete native inventory and isolated history recovery — 9 October 2026

The follow-up native probe renders the actual CustomerDomainPages contract
inventory used by ContractsInventory, actual ScopedCollectionLabels and current
label loader, integrated collection/post repository and closed parsers, actual
Status/Badge/clsx/tailwind-merge/utils, React19/Tailwind/Geist. Fixed product
provider and loopback memory HTTP only: no real Auth/DB or complete app shell.
Twenty distinct contract rows share one customer/operator. At1440/768/390 the
actual old9cf inventory holds the received customer while the operator is delayed;
updated448 shows the current customer before release. All twenty visible rows
and fields are checked by ordinary scroll after release; forty DOM rows include
the responsive table/card counterparts. Three ordinary reads per page: contracts
list plus one deduplicated customer list and one operator get. Eighteen reads,
zero commands/pageerrors/global horizontal overflow. All three updated frames
actually viewed: desktop table, tablet/mobile complete current customer/state/
date/origin fields and pending operator. Not all twenty rows fit at once.
The first native fixture failed before reads because generated CommonJS export
bindings redeclared twMerge. Native bundler export aliases corrected the fixture;
this was not a product defect. Exact inventory blobSHA256
5368754485f10e1124a2a6b0945d0fecf356ce2fd5633d524c54ff830bd78fa7.

Original100 source4483e5dfbb329ac710fba021b5f8bf04747b7f15/executed
39c761ef34a0a1d641c685bc1686ae8a3b0e6d37/tree
d94dced1ac677ff8f5502862653f2715cffc4b89 retains Supabase37978092747/
job113981371382 FAILURE W3_HISTORY_UI_HISTORY_RENAME_TIMEOUT before W2.
Auth73/teardown PASS, no107/productframes. Actual failed screenshot shows renamed
title but no selected conversation; original subphase/server cause unknown.
History product/component/client identical9cf. Quality418+483/build66/lint/types
PASS, audit5HIGH FAIL, independentjobs PASS. Failure is not erased or attributed
to these W2 changes.

Ordinary merge consumes accepted102 executed b11fff008cf4623901dcbd7adc9d31efb3f3a799, source
7ee00abedfbb5c2814956a062963bce16cd8fd25/treed00d7687ca1733f3ab90f256ef51f45bd7bbb82b. Own Supabase37981006441/
job113991194113 SUCCESS107/73migrations/3535+227backend/Auth/historyAPI/browser/
CAS/cursor/revocation/context/grounding/Storage/teardown PASS,0browsererrors.
Quality37981006405/job113991193783419+483/build66/lint/types PASS,audit5HIGH FAIL.
Safe11642511373/product11642366608/history11642586231;55 fresh frames actually
viewed with asynchronous loading and mobile viewport limits recorded. The helper
correlates the ordinary reload thread.list response to its current main document,
validates HTTP/envelope/parser/currentthread then uses the unchanged5s assertion.
No extra read/command/retry/budget;107 names/count remain unchanged. Native
5038ms timeout before versus6675ms PASS after,20messages/10reads/0writes/0errors.
This demonstrates observation-boundary recovery, not the original server cause.

The recovered100 tree requires its own complete107, quality and fresh visual
review before canonical adoption. Unit102 results do not transfer. Physical
issue10/independentW4/#29/Windows/live/commercial stay open; business AI writes OFF.
