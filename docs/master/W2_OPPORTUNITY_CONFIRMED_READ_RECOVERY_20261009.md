# W2 — Opportunity receipt recovery

Owner W2. Base: accepted composition38 source6b31dea11a5a833c57face2219a5356ce2a962ca. No pending56 source imported. PUBLIC is a critical risk; PRIVATE recommended without visibility changes.

Code inspection found that OpportunityEditor cleared the confirmed command intent before its parent's ordinary work.get completed. A read error left a new-creation form available to submit another command. This is a code-path finding, not a claim of a previously captured real duplicate.

The editor now retains the validated receipt until the authorized record read succeeds. A confirmed failure locks fields and offers only Consultar la oportunidad guardada. Its subsequent attempts reuse the receipt and perform the ordinary read, without invoking the command again. The parent requires the opportunity kind, receipt identity and version at least the receipt version before updating rows and closing. Unconfirmed transport retry preserves the original intent; existing CAS/authorization/import restrictions and lifecycle controls remain.

The existing product-links journey now commits its original real opportunity once, injects two HTTP503 work.get failures, requires the confirmed message/disabled title, checks actual SQL identity/customer/version1, retries reads, then requires one command and one persisted row. Its original actual links, uncertain update/exact replay, CAS refusal, foreign-customer exclusion and390/768/1440 frames remain. An additional1440 failure-state screenshot is taken from the actual UI. No mock successful response/count/receipt, timeout extension, skipped assertion or added case name.

Local lint2, types, syntax and diff checks pass. The first local lint rejected reading a ref during render; visible confirmation now uses React state while the intent remains in a ref. Full exact-source Supabase107/Auth/history/context/grounding/teardown, quality411+482/build and visual review remain PENDING at commit; no green inherited from the base. Full npm audit remains five HIGH FAIL under #29. Dependency review/Critical Playwright previously skipped, not PASS.

No API/RPC/schema/dependency/assistant kernel or W4/W5 infrastructure change. Physical AI business durability NOT_TESTED; writes stay off pending #10 and independent W4. Windows15.7GiB/2.5GiB available; no full local Docker stack started, no persistent installation accepted. Production/VPS/providers untouched; no main merge/force push.

Next three: obtain this source's own gates/actual screenshot; normally compose accepted product sources and test the new composition; continue product and W5-owned reconstruction contracts without enabling unaccepted effects.
