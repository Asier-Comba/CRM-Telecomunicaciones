# W1 backend closure — live C1 map

Sources read live2026-10-05: PR28@488647d, PR27@2878687, PR30@13b4666 (w2/product-integration-v2). Existing W1 executable b5955fb has41 migrations/170 functions/201 Node tests and actual Supabase23 PASS522. This continuation does not reimplement those families. Local unpublished attention alternative was preserved as a8e721a/w1/attention-preserved-20261005 before fetch; new worktree follows canonical remote history.

W2's parity JSON in the new integration branch still contains historical preview statuses. These are consumer gaps, not proof that an accepted W1 operation is missing. No W2 parity file or frontend is edited here.

| W2 PAR IDs | Backend direction |
|---|---|
| PAR-035/042 contacts | Existing contact.editors + canonical contact writes; handoff existing backend, no duplicate implementation |
| PAR-043 sensitive reveal | Explicit requested-field/audited reveal capability still needed; no generic DTO expansion |
| PAR-053/190 documents | Existing protected metadata list/get/archive/restore can be reviewed now |
| PAR-200/201 private upload/download | New document.content.v1 candidate: scoped pending Storage INSERT, explicit finalize and30s proxy ticket; exact-head real acceptance pending |
| PAR-072 imports | Closed lineage foundation exists; encrypted staging/KMS/quarantine/application adapter still absent |
| PAR-101 calendar provider import/sync | No provider/OAuth access; publish status/cursor seam only |
| PAR-172/173/176 inbox | Provider-neutral assignment/read/close/link and bounded thread domain still needed |
| PAR-175/177/178 assisted reply/send/webhook | Future closed provider/signature/dedupe seam only; no external send/public webhook or AI registration |
| PAR-179..189 automation | Registered definitions/internal actions/history needed; no arbitrary code/SQL/URL/n8n calls |
| PAR-005/160 notifications | Self-recipient bounded center/unread/acknowledgement + deterministic source dedupe needed |
| Settings profile/company/provider rows | Separate nonsecurity user preferences from owner/admin company/fiscal/integration configuration |

C2 candidate includes42 migrations/177 functions/205 Node tests, new explicit role matrix and unchanged metadata shapes. Scan/hash certification/cleanup/private invoice association remain open. Imports cannot use a plaintext payload fallback. Every new operation retains UI_SAFE=false until W2/W4 review. Handoffs are posted to PR30 after coherent checkpoints, with exact executable evidence and limitations.
