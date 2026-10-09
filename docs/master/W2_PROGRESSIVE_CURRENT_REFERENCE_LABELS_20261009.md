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
Base9cf has its own gate in progress; neither base nor prior unit acceptance
transfers. This mechanism does not establish the original W5 mobile timeout or
server500 cause, nor claim all enrichment is immediately ready.

Issue29/audit fiveHIGH, physical business durability and independentW4,
persistent Windows, live model and commercial gates remain open. Business AI
writes stay OFF; no production/main/VPS/provider or W4/W5 branch is changed.
