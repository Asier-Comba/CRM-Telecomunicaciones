# Commercial assistant: current evidence and next acceptance units

Source baseline for this inventory: PR142 `8a0261bc3c964419ef3d6a023f47105da8ce8f81`, executed merge `9a2c630c78760998cd7ea6e5fcf39c43c33a6065`, tree `8ade84ae133e51467e498a747d019700632a39a8`. PR38 remains on `c38e5459ddad12b6eb5fa4ef80f0416a1f8377d5`; this evaluation change does not merge either PR, modify W4/W5, or enable business writes. Historical checkpoint documents remain historical evidence.

## Existing capabilities, with separate limits

`product-capabilities-v2.ts` derives thirty closed read capabilities from current collection/report specifications. `assistant-product-readers-v2.ts` connects existing user-session services. `product-read-turn-v2.ts` performs one provider planning turn; `product-read-executor-v2.ts` rechecks actor, active workspace, membership epoch and role around awaits. Opaque references require authorization; dependent references require a complete, unique result of the matching entity kind. Max eight nodes; partial pages never prove a portfolio total or absence. These mechanisms and current-cookie history/grounding have executed deterministic and disposable Auth/PostgREST tests; that is separate from live model quality.

| Requested area | Current registered planner surface | Remaining scope |
|---|---|---|
| Customers, contacts, contracts, services, lines | Closed lists; contact values and line identifiers minimized | Names require existing authorized entity resolution/selection; no raw IDs supplied by a model |
| Operators, tariffs, tariff versions | Lists and selected-reference reads | Sold terms remain historical; no automatic portfolio-wide savings calculation |
| Renewals, permanences, opportunities, tasks, meetings, activity | Lists, selected-reference reads where registered, aggregates | Multi-customer joins, complete pagination and rankings must have their own bounded typed contracts |
| Portabilities, incidents | Status/priority aggregates | Individual delay, case text and responsible-person reasoning are not implied by an aggregate |
| Billing, payments, documents, SIM/eSIM | Not registered as detailed planner reads | Protected summary counters do not grant detailed access; existing backend/UI modules do not automatically register assistant tools |
| Document RAG | No ingestion/embedding/retrieval implementation found in current assistant/server sources | Typed versioned ingestion, authorized retrieval, invalidation and citations; embeddings provider NOT_CONFIGURED |
| Provider usage | Server-only provider interface, usage parsing, deadline, cancellation and safe failures | Tenant monthly budgets, concurrency, pricing policy and durable metering remain unimplemented; no provider purchase or live call |

The 220-entry registry is an inventory with thirty executable local read candidates and disabled remaining candidates. It is not proof of 220 connected tools. Stage/prod enabled flags remain false. The source inventory does not replace fresh execution or W4 review.

## Versioned 200-case planner evaluation

`evals/assistant/product-v2.jsonl` now contains 200 unique, authored Spanish prompts. The original forty cases remain unchanged; 160 additions cover all thirty registered reads, statuses, dates, currencies, selected opaque references, five two-entity plans, five unique typed dependencies, missing references, forbidden scope/role changes, revocation, sensitive data, document injection, unsupported RAG/modules and disabled writes.

The existing scorer now checks every expected node in order, all argument filters and the exact reference/dependency binding. Harmless node renaming is accepted; an extra query, wrong offered handle or changed dependency fails. Runtime parsing is unchanged. Every golden plan is validated against the actual current parser; three initially authored activity filters needed a concrete entity reference and were corrected to explicit clarification expectations. No parser/permission/timeout relaxation was used to make the dataset pass.

The existing live runner sends only each prompt, the current catalog, fixed synthetic calendar and offered references. Gold decisions, node expectations, categories and case IDs stay judge-side. Without a configured provider or explicit `--live`, it reports `NOT_RUN` with 200 scenarios and `liveModelEvidence:false`. Local result: 608 assistant tests, targeted lint and strict ES2017 type checking PASS. Gold contract validity is not model comprehension, factual correctness, live database execution, RAG, latency acceptance, or model cost evidence.

Unsupported requests have abstention expectations to detect fabricated capabilities. Passing these cases would not fulfill the unsupported commercial capability. Pricing/cost remains `NOT_ESTIMATED_NO_PRICING_POLICY`; factual grounding and action success remain `NOT_MEASURED` in this planner-only runner. Actual live evaluation is NOT_RUN/provider_not_configured.

## Priority and independent acceptance

1. Preserve the stable integration; consume an exact candidate only after its own relevant completed controls. Retain failed candidates and their original artifacts.
2. Close issue10 physical durability: W2 ports/factory/business driver; W3 v3 semantics; W5 owned disposable resource/restart; W4 independent acceptance. Twenty-process reservation/start is one primitive, not Full23, four complete races, six cuts or a verified cluster restart. Business writes OFF, issue10 OPEN.
3. Expand essential authorized reads using current services, closed DTOs and fresh permission/resource checks. Demonstrate positive, limited-role, cross-company and revocation paths independently of synthetic planners.
4. Implement authorized document ingestion, versioning, bounded extraction/chunking, PostgreSQL-backed retrieval where suitable, revocation/delete invalidation and reproducible reindexing. Unconfigured embeddings require typed seams and deterministic tests, with operational RAG NOT_TESTED.
5. Extend multistep reasoning only through validated typed relations, complete pagination where required, deterministic dates/money and source citations. Preserve the existing semantic planner; no regex replacement or speculative rewrite.
6. Execute representative real-provider evaluations only when API use and pricing are authorized/configured; add tenant budget/concurrency/metering before commercial activation. Compare comprehension, planning, tool selection, truth, requested coverage, answer quality, isolation, latency and consumption separately.
7. Coordinate resource/runtime and independent acceptance through issue67 and existing handoffs. W5 interface offer/our surface ACK is not joint interface approval or delivered resource. Release NOT_ACCEPTED.

CRM browser 107/107, semantic stubs, and protocol tests each have a bounded scope. None independently certifies the commercial assistant. Current outstanding evidence remains marked NOT_TESTED/NOT_RUN rather than inferred from those controls.
