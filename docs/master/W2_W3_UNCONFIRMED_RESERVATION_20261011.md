# Private SAFE reservation without confirmation

This candidate closes the missing `reserveOperation` lifecycle method over the actual registered command producer and nine-method completion constructor. The ten-method port remains private: no routes, business handler, service/delegated business principal or production registrations are enabled. Business IA stays OFF and issue10 remains open pending independent W4 and full physical acceptance.

## Behavior

Only a reviewed server definition with `SAFE_WRITE`, `confirmationPolicy: none`, idempotency and a private registered SQL policy can reserve without confirmation. Sensitive, irreversible and preview-confirm definitions fail closed. The private original key-to-command lookup is independent of caller/model command selection. The opaque producer material preserves the exact original canonical UTF8 argument bytes and digest algorithm, current permission/scope epoch and resource authorization.

Migration84 atomically inserts operation, registered command, immutable original material, effect outbox, original reservation audit and delivery. It creates no confirmation row and keeps `confirmation_ref` NULL. The same workspace/capability/key advisory lock serializes confirmed and unconfirmed attempts. Exact original actor/digest/command/schema/material/audit/delivery/outbox are required for existing reservations; a confirmed reservation cannot be promoted into the unconfirmed path. Retries never replace the original request, material, lease, audit or timestamp. Current membership/private worker grant and clock are checked after the blocking locks.

A retry receives its original authorized nonterminal or completed DTO through the existing completion loader. Completed results still require registered output material, private original receipt/outcome and current returned-resource authorization. Input resources and authority are checked again after commit/recovery. The whole-call deadline covers lookup, producer, mutation, original recovery and returned authorization, forwarding an abort signal and refusing late replies.

The forward-only completion replacement binds the full original audit's confirmation literal to the persisted operation: confirmed origin requires `accepted`; unconfirmed origin requires `not_applicable` plus the private SAFE/none policy and SAFE output registration. The application independently resolves original provenance from a private loader and requires SAFE/none producer policy. Older confirmed consumers retain their original behavior. The original full eleven-field audit is delivered intact using the existing complete-content digest algorithm; unconfirmed sensitive/irreversible audits are rejected.

## Current verification

- Parent83 actual embedded migrations reproduce `physical_unconfirmed_reservation_missing`.
- 587 assistant tests PASS, including 12 new reservation boundary cases and a provenance/policy completion case; focused strict ES2017 types and lint PASS.
- 13 focused bootstrap checks PASS, including exact migration inventory and live-table inventory; the new function uses the catalog's exact signature with spaces.
- Embedded84/319 migration, schema/roles/scope/domain and synthetic restore PASS. Six separate insert interruption points preserve the entire original ledger, including confirmations, commands/material, operations/outboxes and audit/delivery.
- The actual ten-method constructor reserves without fabricating confirmation, recovers targeted postcommit reservation reply loss, executes the existing private receipt workflow, completes with original `not_applicable` audit, returns its original authorized completed result on retry and drains nine original audits across confirmed/unconfirmed fixtures. This is embedded, not native acceptance.
- Three separately applied SQL mutants bypass policy admission, grant expiry or delivery insertion; each reaches its specific rejection oracle, and exact original function/fixture behavior is restored.
- Fresh corrected-source native CI PENDING. The new consumer uses only the existing verified owned native image/container/database. It exercises 20 distinct SQL processes/backend PIDs through the actual ten-method constructor (one reservation/19 original replays), targeted reply loss, completion/provenance/authorized replay, grant expiry after an observed advisory-key lock, three SQL mutants and four original audit deliveries. The previous completion consumer now restores the actual current forward function from the catalog rather than recreating obsolete migration83 SQL after its negative controls. No W5 platform image/job/runtime implementation is added.

This is not full23, twenty independent Node workers, real business handlers, SIGKILL/watchdog/same-cluster restart, an enabled assistant or commercial/security acceptance. Verified reconciliation is still the eleventh missing method. Five HIGH audit findings, independent W4/W5, staging, provider and owner privacy gates remain open.

## Retained evidence and failures

PR140 source2f/execution1297043 had own1101 functional/140 browser/native83/318 PASS, but Supabase38111369076 FAILED at history create upstream HTTP500. Approved history artifact classified HTML/SERVER_SYNTAX_ERROR/no_store=false. Auth/migrations/teardown passed; 107 product journeys were not completed. Cause is unproven; it is not consumed into root38, and this candidate must pass its own exact-tree gates. Root38 source4af/execution497a still has own1077/140/native82/313/Supabase107/Auth200 PASS with five HIGH FAIL. No identical-tree retry or failure reclassification is performed.

Local first typecheck rejected fixture-only generic boolean authorization and a too-narrow mock cast; the fixture now returns the actual discriminated authorization contract. The first privilege comparison rejected a signature lacking PostgreSQL catalog spaces; the manifest now enumerates the exact actual signature. An initial assistant command from the wrong working directory executed zero tests and is not accepted; the retained subsequent actual repository run passes587. No production rule or comparison was relaxed.


## Corrected native-control statement framing

Published source499/executionc2ae own1114/lint/types/build66 PASS; native CI38112764541 FAILED in completion negative control at line141 before the new reservation race. Local reproduction with the actual current catalog definition reaches SQL42601 instead of the intended mutant oracle: `pg_get_functiondef` does not guarantee a terminating semicolon, so concatenating the next fixture merges statements. A shared native-only adapter adds a statement delimiter while preserving all definition bytes; five actual-current completion mutants now reach their original explicit rejection oracles and exact definitions are restored. Native assertions, controls and timeouts remain unchanged. The reservation consumer uses the same adapter and independently compares the catalog definition after restoration.

The same original source's Supabase38112764527 FAILED at HISTORY_REOPEN_LIST_HTTP_REFUSED;Auth84 migrations/teardown PASS,107 journeys not completed. Safe server categories again include SERVER_SYNTAX_ERROR; underlying cause remains unproven. Closed enum subcategories now distinguish JSON input, module format and regexp syntax without preserving any raw source, response, identifier or credential. This is improved bounded observation, not a claimed history fix. Historical failures are retained; the corrected source needs fresh own gates. No identical-tree retry or inherited success.

Correction verification: all five completion and three reservation mutants now use the actual current catalog definitions and reach their intended rejection oracles; catalog/fixture restoration passes. Sixteen focused bootstrap checks and lint PASS. No business SQL or assertion was weakened. Initial499 native/Supabase failures remain frozen independently; fresh corrected-source acceptance remains pending.
