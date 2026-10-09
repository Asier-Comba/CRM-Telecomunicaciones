# W5 composed validation candidate

This is a new disposable candidate, not a release or an approval. Normal merges retain the separately published units:

| Unit | Frozen source | Evidence consumed by scope |
| --- | --- | --- |
| W5 latest product, PR77 | 36efc07db35f6bef9cf7c3ca8cb6372ee17b1dd9 | Its own74-migration/3762backend/107browser/recovery PASS on tested merge124c59896b7ae4f1f3110510bd789a334000d49c |
| W4 restored authorization, PR76 | 60c610d7b3862922d8a689ce480918f9fee34856 | Exact native retry PASS on e8719274aac0f2bdbb094e39f6b1eb13d72b4293,12actor/session proofs and26denied RPCs; failed attempts retained |
| W5 recovery-point/monitor, PR73 | eeefd942efb8d7ae903666570e8591016e730d6a | Preparatory contract,13selected controls, baseline native/platform evidence; no hosted RPO or scheduler |
| W4 scanner/protection, PR74 including PR68 | 0a457def4ef728673e4611f020a891c931162e91 |10Linux positive/adversarial controls; reachable history blocked18candidates,0exceptions; proposal disabled |

No domain, product, assistant, migration, RPC manifest, package or lock implementation is rewritten during these merges. The product source remains9ab36e242ff4678ee518c1d1606f0035139fcd39,623preserved paths plus four platform overrides from85d3. Later unaccepted owner source4f63 is not consumed. Experimental vendor pins in PR71/75 are not adopted: this candidate preserves the previously blocked base pins and requires their security gates.

The Supabase workflow now also triggers on platform scripts/config changes, so future platform compositions cannot omit actual Auth/Storage/product acceptance because their source edits fall outside the old filter. Existing criteria, budgets, scanners and severity gates remain unchanged. This combined source needs its own terminal CI; source evidence in the table is provenance, not inherited acceptance.

Local combined platform/security controls74/74 PASS, source composition/inventory/diff PASS. Fresh exact-source native PostgreSQL, Supabase/browser, strengthened recovery, container/mail/proxy and all-ref scanning remain required. Any18history candidates, HIGH/CRITICAL/secret image result or issue29 full audit violation remains blocking. No green global readiness is asserted.

W4 and W5 are roles of one executor; true independent final review remains pending. Company accounts/MFA/region/PITR/offsite/KMS/retention/DNS/mail and hosted Auth/runtime need separate decisions and authorization. RPO, repository protection and AI workers remain inactive preparatory contracts. Issues10/12/22/29 stay open. VPS/production/provider effects are untouched.

NEXT3: collect this combined tree's actual CI and preserve failures; independent disposition/review without exceptions; company activation and hosted restore proof only under the separate gates.
