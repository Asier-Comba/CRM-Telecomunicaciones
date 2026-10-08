# Enterprise 3 company preparation

`npm run company:init -- public-company.json` collects public ownership and provider choices only. Named administrator MFA is a declaration requiring company verification. DNS records, retention and approved RPO/RTO remain incomplete until supplied by owners. No secret prompt or provider connection occurs.

`npm run company:preflight -- public-company.json` reads the environment in memory, reports variable names and errors, and never prints values. READY_FOR_CONFIGURATION means only that the public contract and environment are consistent. Provider availability, ownership, DNS, delivery, staging and production require independent live evidence. W4 cannot be satisfied by a caller-supplied boolean.

`npm run company:plan -- public-company.json` binds all seven phases to the exact source, target, public configuration and canonical migration hashes. Changing any binding invalidates saved simulation state. PLAN_ONLY is the only CLI mode. There is no hosted execute switch.

The exported simulation interface accepts disposable test adapters only. Failed phases stop subsequent phases; retries reuse the same idempotency key. Adapters must implement that key atomically if a failure occurs after their effect. Saved state is atomic and strips adapter responses. A completed simulation remains NOT_PROVEN for staging and production. This is a recovery interface for local adapter tests, not a durable hosted job worker.

Phases: PREFLIGHT → PLAN → PROVISION → CONFIGURE → DEPLOY → VERIFY → ACCEPT. Real future adapters must verify the company account and exact project, protected workflow identity, accepted W2/W3 sources, signed artifact and independent W4 review. Production additionally requires exact staging evidence, backup/readback, compatible rollback and explicit company environment approval.
