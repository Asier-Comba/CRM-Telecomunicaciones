# W3 v2 deliberate port — checkpoint A

Base: W2 `c632f0ad936b0d24e77fe77144666a23753a762f` (`w2/product-integration-v2`). Historical source: W3 `dc19ce65cbc89df92ae0496af2d358eea74e0493` (PR9, still Draft). Inspected live PR9, Issue10, PR28 and PR30 on 2026-10-06. No historical product merge.

| Old file/concept | Decision | Reason |
|---|---|---|
| Existing read planner, DTO parser, reference fences, grounding, UI v1 | Reuse W2 copies | Already ported; preserve W2 customer-reference compatibility repair. |
| registry/runtime/plan | Reuse isolated modules | Closed schemas, resource authorization, sensitive output scanning; no route registration or effect enablement. |
| durable contracts, atomic reconciliation, operation status | Reuse isolated modules | Preserve exact states, bindings and immutable original audit intent. Memory implementations are conformance references only. |
| durable process-v2 runner/spec | Reuse | Native independent-process acceptance remains required; copying the harness does not prove persistence. |
| historical test/ and eval fixtures | Port to tests/assistant/ | Import suffix/path adaptation and explicit fixture type annotations only; TypeScript transform execution preserves parameter properties. |
| old package/tsconfig/CI/product/schema | Reject | Obsolete base; current W2 application stays authoritative. |
| old benchmark BigInt rewrite | Defer | Preserve existing W2 bounded safe-number behavior at this checkpoint. |
| old telecom DTO customer.id-only condition | Reject | W2 valid customer references use customer_id; restoring old check would regress accepted transport. |

No database adapter exists yet. Issue10 remains OPEN, W4 acceptance PENDING. No writes, sends, merge or production changes. Current W1 docs head182283f and functional e9d8bcf are newer than W2 consumed8c93d4c; do not claim equipment/locations consumed by this base.
