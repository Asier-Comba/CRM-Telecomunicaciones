# W3 review — W2 assistant READ fixtures

- Date: 2026-09-26
- W2 source: `w2/frontend-bootstrap-readiness@d1df763`
- W3 executable matrix: `evals/ui/assistant-read-contract.v1.json`

W3 validated the nine synthetic W2 scenarios against `AssistantResponse` v1. The stable READ contract is strict at the transport boundary: the renderer receives either a fully valid response or a safe transport/error state. It does not repair an invalid assistant envelope locally.

| W2 scenario | W3 v1 decision | Required alignment |
| --- | --- | --- |
| success answer only | Accept after update | Add `contractVersion: 1` and matching taxonomy version. |
| empty with refinement | Accept after update | Add the required version fields; `refine` remains prompt-only. |
| partial table | Accept after update | Add required version fields and `continuation` when `truncated=true`. |
| unknown entity fallback | Reject | Unknown entity types fail closed against the injected taxonomy. |
| forbidden safe notice | Accept after update | Add required version fields; bounded notice is supported. |
| ungrounded evidence omitted | Reject | Evidence with `grounded=false` is invalid at source, not accepted then hidden. |
| action follow-up disabled | Reject | Executable follow-up kinds are outside READ v1. |
| secret-like key | Reject | Closed schema and sensitive-key defenses both reject it. |
| invalid envelope | Reject | Version and `meta` are mandatory. |

The reconciled matrix is executed by `test/contracts.test.ts`. It contains no production/customer data and does not enable confirmation or mutation UI.

Open dependencies:

- W1 owns canonical `module` and `entityType` taxonomy.
- W2 owns route resolution and accessible presentation.
- W3 owns response validation and the server confirmation lifecycle.
- W4 acceptance is required before mutation controls are enabled.
