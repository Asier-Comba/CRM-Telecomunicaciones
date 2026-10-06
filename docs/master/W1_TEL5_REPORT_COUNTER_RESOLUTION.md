# Exact Customer360 fixture discrepancy identified

Source fe398b97d146b0dea7bc8057a2f72ccb9c4eb80a / Supabase112262692190 reported TEL5_SAFE_COUNTER_DIAGNOSTIC: customer_scope_matches=true, record_key_count=16, current_role=member, differences=[]. Every provided expected counter matched. The expected fixture object contained only15 keys: tasks was omitted, while the closed authoritative Customer360 DTO correctly contains customer ID and15 counters.

The earlier activity expectation also required11, because canonical portfolio commands append coded activity. A faithful fresh embedded reproduction observed all15 counters, including tasks1 and activity11. The fixture now includes tasks1; exact key count and every field equality remain required. No product SQL, authorization, DTO or historical migration changes. Real repaired-source acceptance is still required; last accepted source remains b654b1d/188operations/2479checks.

The execution workspace disconnected while preparing the separately implemented dense line/attention checkpoint. This minimal remote repair uses the exact saved published file, adds only the omitted expectation and keeps diagnostics privacy-safe. Dense line/attention are not published or accepted by this commit. Native/embedded/browser on the prior source passed; full CI remains blocked by the unsuppressed dependency audit.
