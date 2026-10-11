# Verified reconciliation readback and bounded outcomes

## Reproduced defect and resulting behavior

Parent5ef service accepted a completed state/version from both adapter receipt and reread even when the verified result was missing, replaced, or accompanied by an old failure. It also accepted changed original receipt/attempt/creation/lease and resource revocation after commit. Four new adversarial tests fail on the unchanged parent with unexpected SUCCESS. These are semantic in-process proofs, not physical database acceptance.

The service now requires both terminal records to preserve the full original identity, attempt, creation, lease and receipt, and advance exactly one version with a nondecreasing update timestamp. Completion requires the exact schema-validated canonical result independently admitted by the verifier and no failure code. Verified absence requires its original exact retryable/terminal failure code and no result. The original authorized record is snapshotted before callbacks, preventing a borrowed adapter object from moving the checked receipt during commit. Resource authorization runs again on the authorized terminal reread before success. A denied reread does not erase or replace the original committed audit intent.

One ten-second deadline covers original lookup, verifier, resource authorization, commit, authorized reread, resource reauthorization and diagnostic audit delivery. Every dependency also observes the request's abort signal. A late initial lookup/verifier/authorizer cannot initiate commit after timeout. A timed-out commit can have persisted: unavailable never certifies effect absence, rollback, cancellation of an ignored adapter, or permission to retry a business effect. Success continues to depend on the original durable audit intent rather than diagnostic sink availability.

## Verification

- Seven new tests cover full result/failure readback in both records, original immutable fields, postcommit resource revocation, borrowed original mutation, seven separately withheld dependency stages and a deadline shared across stages.
- Thirty-five focused existing/new reconciliation checks PASS; all594 assistant checks PASS; focused strict ES2017 types and lint PASS.
- Removing only the overall deadline causes the explicit shared-deadline settlement oracle to fail; exact source bytes are restored and all seven new checks pass. The first diagnostic mutant attempt used an unbounded test assertion and timed out locally; that failed attempt is retained and replaced with an explicit bounded oracle, without weakening production deadlines.
- Existing reference-only adapters now actually persist the admitted result/failure fields. Their completion removes the obsolete quarantine failure and absence removes result material. The first whole-suite run exposed this incomplete fixture; the following fixture attempt exposed unsupported undefined properties. They now omit absent properties, preserving the existing closed secret/structure validator. Original negative checks remain intact.

## Physical scope and next seam

No new SQL, physical eleventh method, production command handler, business dispatcher, provider, or model is enabled. Existing ten-method reservation/completion seam and migrations84/functions319 remain unchanged from parent141. This semantic service still requires an independently authorized physical `commitVerifiedReconciliation` implementation; a matching state/version or synthetic adapter receipt cannot fill that gap.

Positive physical reconciliation must preserve the actual registered original effect receipt, result producer, operation version and full eight-field `assistant.operation.reconciliation` audit, then atomically commit terminal DTO and delivery. Effect absence requires independent authoritative absence and fencing/quiescence proof; a missing row or expired lease alone is insufficient. Full23, twenty independent Node workers, SIGKILL/watchdog/same-cluster restart and independent W4/W5 acceptance remain NOT_RUN/pending. Business IA OFF; five HIGH remain FAIL; commercial/security acceptance remains NOT_ACCEPTED.

Parent141 current5ef/execution283 has own1115 functional/140 browser/native84/319 PASS with five HIGH FAIL. Supabase for that exact source remains pending at authoring time; original499/c2ae native and history failures are retained. Root38 remains independently accepted4af/497 for functional1077/140/native82/313/Supabase107/Auth200, with release gates open. Fresh own candidate gates remain pending until separately closed.
