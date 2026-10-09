# W2 — Create a manual service from Customer360

Owner: W2 existing portfolio creation flow, customer presentation and real browser consumers.

## Existing capability and new entry

Customer360 Servicios previously exposed only its full read collection. The existing Cartera Telecom form can already create a manual service beneath a manual draft/active contract. This unit extracts only PortfolioCreate into its own module and reuses it from a customer-scoped Services entry, avoiding another write implementation. The ancestry helper remains byte-equivalent in IntegratedPortfolio. A local normalization comparison proves the creator body is identical except its optional service-only prop, one local type/context guard and its restricted kind options; the original global mode remains unchanged.

The new entry is shown only for an active customer and a non-viewer role. The existing bounded PortfolioRelationSelect queries that exact customer's contracts; an optional label makes its purpose clear without changing selectors used by cases. Proceed performs the existing authorized portfolio.get and verifies customer identity, manual source and draft/active state before mounting the creator. The backend still independently validates each command. Only the service kind is offered in this context; the existing five service families and name form are reused. This creates an internal pending service, without operator activation or external calls; tariff-version selection is not added.

After a validated receipt, the wrapper reads the actual service and verifies its UUID, customer, parent contract, manual source and version before closing the form, reloading the inventory, refreshing summary/attention and showing the created-service link. A failed receipt read keeps the existing creator's confirmed receipt and offers read-only recovery; an unknown response keeps the exact original command input. No optimistic row/count is added. New selectors/reads do not become authority, and viewer behavior remains the ordinary service collection.

## Real acceptance required

The existing location-create/private-reveal/cursor journey retains all its original actions, SQL and three-width frames. It additionally prepares a synthetic manual contract through normal cookie commands, selects it through Customer360's bounded contract picker and creates a basic mobile service. Its first create response is lost after a real successful commit, then the exact input is replayed; the receipt's subsequent portfolio read returns503. The summary must keep its old count until a verified read succeeds. Final recovery requires zero extra create requests, one SQL row/version1 with the exact parent/customer/manual/pending/mobile facts, activated_on null, actual HTTP summary equal to SQL, visible KPI and preserved Servicios tab, followed by three actual creation captures and navigation to the real detail. The fixture observer adds only a closed service table/field/label entry.

The existing viewer-service journey retains masked installation/addon/no-write assertions and additionally loads that customer's Servicios collection normally and requires the new-create button absent. All107 literal product check names, other screenshots, budgets, activation/privacy/CAS/replay/revocation assertions remain. Backend APIs/RPC/schema/contracts are unchanged.

Local lint seven files, types, two script syntax checks, diff check, normalized creator/ancestry comparison and107-name equivalence PASS. Initial extraction boundary accidentally included the ancestry helper; lint caught it and it was restored before publishing. Full exact-source107/Auth/history/context/grounding/teardown, remote build/quality and images PENDING. Accepted base54@671 results do not transfer. Other55/56/57 units remain separately owned/tested; no heavy Windows stack/build starts (approximately2.58GiB available).

## Limits and next tasks

This entry does not create a contract or change tariff/activation semantics. No production/provider effects, AI kernel/dependency/migration or W4/W5 infrastructure changes. #29 full audit fiveHIGH remains enforced, #10 physical AI durability and independent W4 pending, AI writes disabled. PUBLIC critical risk/PRIVATE recommendation retained. Local persistent installation remains resource-blocked; disposable real CI is not installation acceptance.

Next three: collect this exact source full gates and captures; normally consume only accepted sources with a new canonical gate; continue product/read/local/W5 work with independent security acceptance.


## Exact first-source acceptance and visual follow-up

Source99d5d9eb1573cc99e10a089965492d218481cd51/treec0a481e3abe4b273b0ee694b6f088a08b2817199: actual Supabase37878820654/job113653505119 executedec289c8cb4892a9e42e00ba7956d8418f2799978 with identical tree,107/107/Auth200/3535+227/73/history backend/API/browser/CAS/cursor/revocation/context/grounding/teardown PASS. Business durability NOT_TESTED; documents200 bodies121/152ms. Quality37878820637/job113653505355 same tree: lint/types411+482/build66PASS, fullaudit5HIGHFAIL;other gatesPASS/dependentsSKIPPED.

Artifact11593948520 three creation frames reviewed. They show summaryServices4/notice/tab at desktop/tablet; mobile frame contains only the summary, and the created row is absent from all three frames. The desktop first-row operator is still loading. Functional acceptance99 is retained, visual acceptance partial.

This follow-up retains those three original summary screenshots, then uses ordinary pending-service reads/bounded cursor to locate the receipt's actual collection row. Additional1440/768/390 frames require every field/full row ratio1 and no operator loading placeholder. Services reuse the existing contract card breakpoint below1280 because their seven fields also need room at768; other areas unchanged. No fixture coordinates/crop/image editing, no timeout extension or asserted fake row. The new tree's complete107/Auth/history/context/grounding/teardown/quality/frames are PENDING, not inherited from99.
