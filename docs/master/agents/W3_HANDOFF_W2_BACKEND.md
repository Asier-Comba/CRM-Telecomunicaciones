# W3 → W2 backend takeover — iteration 4.2

W3 DURABLE DB CONTRACT READY. Canonical communication: Issue #10 and PR #9;
copy this handoff to W2 takeover PR when published. W1 history and W2 frontend
db8ab41 remain preserved. Exact W4 accepted composition base: 6b0e30e.

DOC: ../ai/W3_DURABLE_DB_CONTRACT_V1.md
MACHINE PORT: src/assistant/durable-db-contract.ts
TEST MATRIX: ../ai/W3_DURABLE_PROCESS_ACCEPTANCE_V1.md
RUNNER: scripts/durable-process-acceptance.mjs

REQUIRED SEMANTIC CONCEPTS: confirmation; operation/idempotency; registered command;
safe result; effect outbox with lease/fence; immutable audit intent and audit delivery.
W2 owns physical tables, migrations, RLS and server adapter. Manifest relation names
are old suggestions, never an instruction to create parallel schema.

ATOMIC BOUNDARIES: confirmation+reservation+command enqueue; claim CAS+fence;
effect acknowledgement+receipt; completion+safe result+audit intent;
authorized reconciliation+safe result+state+original audit+delivery outbox.
The last boundary is now required by W3's live class abstraction. Old
applyAuthorizedReconciliation is not a permissible adapter fallback.

DO NOT IMPLEMENT: model SQL/HTTP/table/workspace authority; raw generic result JSON;
browser service principals; provider sends; enabled assistant writes; alternate CRM
truth in RAG. UI v1 stays stable. Issue10 is still a release gate.

OPEN QUESTIONS (answer with exact SHA/path on takeover PR/Issue10):

1. What module/factory exports the W2 transaction adapter and native test driver?
2. How are confirmation identity and operation identity associated atomically?
3. What claim fence and registered dispatcher catalog does W2 persist/check?
4. How are safe results stored/versioned and reauthorized on replay?
5. Are all 14 TelecomReadServiceV1 signatures unchanged? Publish DTO fixtures plus
   server service/repository factory. W3 will run the full parser against that SHA.

READ CHECK: scripts/check-telecom-contract.mjs compares exact pinned DTO source and
all14 service signatures; ai/W3_TELECOM_V1_COMPATIBILITY_42.json records observed
takeover snapshot. A missing DTO while replay is in progress is a dependency, not
a claim that W2 removed an accepted contract. No live reader is registered yet.
