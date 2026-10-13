# W3 evaluation accounting: validate persisted records before totals

Two real SQLite-file tests reproduce logical corruption on the parent ledger.
After three synthetic500000microUSD settlements exhaust the shared1500000 cap,
a constraint-disabled test insertion of an invalid negative settlement offsets
the total. The parent admits reopening and a later reservation instead of refusing
the corrupt accounting. No provider request or actual spend is involved.

The ledger now independently validates all persisted identifiers, value types,
maximum/state/actual bounds and pending/unknown null-actual invariants. It checks
on admission and inside each BEGIN IMMEDIATE before every operation, so a file
changed after opening also fails closed. Invalid records are not repaired,
discarded, netted into an allowance or treated as missing/new storage.

All nine ledger tests pass, including eight independent processes sharing one
reservation, fresh-process persistence after termination, cap exhaustion,
unknown holds and conflicting settlements. This is local storage/process
evidence, not company Auth/DB, machine-power-loss recovery, provider usage,
price verification or cryptographic authentication of a trusted host's file.
The firstbatch500000/shared1500000 limits and dispatchAuthorized:false remain.
Canonical-file binding, private key/model, pricing/token bounds and actual
provider-controller wiring still block live evaluation. ModelNOT_RUN/calls0.
AI writes OFF, release NOT_ACCEPTED, W4 review independent, fiveHIGH unresolved.
