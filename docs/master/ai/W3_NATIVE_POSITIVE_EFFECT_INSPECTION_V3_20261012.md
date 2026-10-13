# Native positive effect count: existing owned receipt ledger

This component reads the existing completion fixture's private synthetic receipt
sink. It creates no database, ledger, business handler, W5 resource or restart.
The sink name must have the fixed completion prefix and a24-hex nonce matching
the admitted fixture capability. The existing five-field binding descriptor
snapshot is reused before preparing any readonly SQL.

All sink rows for the exact workspace/operation are read, then the one positive
row and its complete eleven-field receipt admission are checked. Wrong actor,
capability, digest, workspace, receipt/outbox, dispatcher, authority or malformed
fence is unavailable. A missing or duplicated receipt is unavailable, never an
invented effectCount0, verified absence, quiescence or automatic retry authority.
The returned frozen evidence contains only effectCount1, without SQL, identifiers,
fence, receipt contents or raw transport error.

Two controlled tests cover fixed scope/readonly measurement/partial observation
rejection and missing/duplicate/foreign/malformed/private-error/hostile-input
denials. The existing physical completion and reconciliation primitives each add
a readonly positive effect probe after their final audit, with a closed marker.
These new probes are NOT_RUN until this exact source's own native job completes.
The sink's accepted receipt represents a synthetic fixture effect; it does not
measure a live commercial provider or prove business-handler completeness.

Audit13+operationCount/state2+positive effect1=16/21 planned. Execution
authorizations, unauthorized rows, forbidden transitions, unregistered dispatches
and automatic redispatches remain unmeasured. The full driver five methods and
metadata, full23, four complete Node races, six rollback cuts, verified absence,
pre-effect kill and same-resource restart remain pending. Original primitives
and their assertions are retained. W4 security and W5 ownership stay independent.

New source quality/browser/native/Supabase controls are required; no prior PASS
transfers between SHAs. IA writes OFF; live model NOT_RUN; release NOT_ACCEPTED;
five HIGH alerts remain unresolved.

The global typecheck also exposed TS2345 on parentB168: the JavaScript diagnostic
callback appeared required to an existing TypeScript browser caller. Its explicit
undefined default preserves the optional API. The initial failure is retained;
the new source passes global types and all eight existing reopen helper tests.
This correction does not add diagnostic requirements to ordinary callers.
