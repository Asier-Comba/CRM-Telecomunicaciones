# W3 status — iteration6.0

HEAD: commit containing this file on w3/assistant-runtime-foundation; PR9 DRAFT. No merge/routes/writes/deploy.
CI: functional checkpoint b9f3e4cd189ca72d5ad3f32909f8b259c7f4c843 has4 success/2 skipped in GitHub; final documentation/pin CI recorded on PR9. Dependency Review owner configuration remains unresolved; no bypass.
TESTS:414/414 local deterministic tests PASS; lint/typecheck/build PASS. Source/IPC fixtures are not native DB or LLM quality evidence.
W2_PLATFORM_SHA: w2/platform-closure-v1@a917bbb41ef8192344dc49737cd78fd52fe29649 (PR19, docs-only after implementation8e978e04d6f179fcad6aa624923a03dd3b54d092). C2 reviewed immediately; no adapter. W2 records native PG16 CI/restore PASS; W3 execution here is PGlite only.
READ_INTEGRATION: all14 exact-source signatures/DTOs and authorized service/repository/cursor replay PASS with synthetic RPC. Text→injected semantic planner→closed read plan→authorized service→validated DTO→grounded UI v1 implemented without HTTP routes. Factual values carry source/entity/field/freshness; unknown/partial retained. UI v1 unchanged.
LIVE_EVAL: NOT RUN. One external prerequisite: reviewed W3_EVAL_PROVIDER_MODULE with approved model and securely bound credentials; none configured. Historical n8n selector is not a compatible provider module.
DURABLE_SCHEMA: C2 at8e978e0 corrects both exact failure codes and persists nonnull lease. W3 reran25 migrations/fixtures in PGlite plus both code round-trips, stable lease reads and NULL rejection: PASS. Static scanner marks forward DDL REVIEW_REQUIRED, not an obsolete effective-schema failure.
DURABLE_ADAPTER: absent from reviewed tree; W2 owns physical implementation. W3 port/atomic audit semantics versioned; no schema authored.
NATIVE_PROCESS: NOT RUN without W2 native driver. New explicit v2 acceptance protocol adds claim race, six rollback boundaries, fence attacks, commit/reply loss and original audit identity after lost sink ACK. No lowered W4 gate.
SEMANTIC_QUALITY:31 compact authored Spanish cases, now covering newly available attention reads and opportunity-text injection. No live accuracy claim. Runtime tests prove deterministic boundaries, not natural-language interpretation.
OPEN_MISMATCH: No remaining C2 code/lease storage mismatch. Native result/audit/transaction factory and acceptance evidence absent. W3 review published PR19/Issue10; independent gate unchanged.
W4_GATE: independent review required; Issue10 OPEN, PR9 DRAFT. Prior accepted seam fixes remain; new revocation/turn/composer/process delta is CANDIDATE only.
NEXT 3: review W2 next exact durable checkpoint; bind actual adapter/native v2 driver; run approved live provider when configured.

Current handoff: W3_HANDOFF_W2_PLATFORM.md. Prior status: ../ai/W3_STATUS_ARCHIVE_50.md.
