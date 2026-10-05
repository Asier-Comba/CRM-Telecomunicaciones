# Telecom commercial domain acceptance matrix

Accepted source `e09ddf222b22e72150e7c27bf0d1b68f9ae4dd63`: 147 operations, 1601 real disposable checks, 55 migrations/248 privilege functions, 251 Node tests; native fresh/logical restore, isolated PGlite and official browser-private boundary PASS. npm audit remains red (Issue29). The current identifier module is a separate candidate, not yet proven. This is not TEL5 completion. W2 consumption requires W2 evidence.

Counts: REQUIRED=87, IMPLEMENTED=35, PROVEN=30, W2_CONSUMED=0, BLOCKER=87.

| Section | Requirement | REQUIRED | IMPLEMENTED | PROVEN | W2_CONSUMED | BLOCKER |
|---|---|---|---|---|---|---|
| Operators | operator.list | YES | YES | YES | NO | W2_consumption_unproven |
| Operators | operator.get | YES | YES | YES | NO | W2_consumption_unproven |
| Operators | operator.create | YES | NO | NO | NO | not_implemented_as_requested |
| Operators | operator.update | YES | NO | NO | NO | not_implemented_as_requested |
| Operators | operator.activate | YES | NO | NO | NO | not_implemented_as_requested |
| Operators | operator.deactivate | YES | NO | NO | NO | not_implemented_as_requested |
| Plans | plan.list | YES | YES | YES | NO | W2_consumption_unproven |
| Plans | plan.get | YES | YES | YES | NO | W2_consumption_unproven |
| Plans | plan.create | YES | NO | NO | NO | not_implemented_as_requested |
| Plans | plan.update_metadata | YES | NO | NO | NO | not_implemented_as_requested |
| Plans | plan.change_status | YES | NO | NO | NO | not_implemented_as_requested |
| Plan versions | plan_version.list | YES | YES | YES | NO | W2_consumption_unproven |
| Plan versions | plan_version.get | YES | YES | YES | NO | W2_consumption_unproven |
| Plan versions | plan_version.create | YES | NO | NO | NO | not_implemented_as_requested |
| Entitlements | typed immutable version entitlements | YES | NO | NO | NO | not_implemented_as_requested |
| Bundles | immutable version components | YES | NO | NO | NO | not_implemented_as_requested |
| Bundles | service add-on assignment history | YES | NO | NO | NO | not_implemented_as_requested |
| Contracts | contract.list | YES | YES | YES | NO | W2_consumption_unproven |
| Contracts | contract.create_manual | YES | YES | YES | NO | W2_consumption_unproven |
| Contracts | contract.update_allowed_metadata | YES | YES | YES | NO | W2_consumption_unproven |
| Services | service.list | YES | YES | YES | NO | W2_consumption_unproven |
| Services | service.create_manual | YES | YES | YES | NO | W2_consumption_unproven |
| Services | service.update_label | YES | YES | YES | NO | W2_consumption_unproven |
| Services | fixed service operational facts | YES | NO | NO | NO | not_implemented_as_requested |
| Lines | line.list | YES | YES | YES | NO | W2_consumption_unproven |
| Lines | line.create_manual | YES | YES | YES | NO | W2_consumption_unproven |
| Lines | line.update_label | YES | YES | YES | NO | W2_consumption_unproven |
| Lines | masked mobile commercial row | YES | NO | NO | NO | not_implemented_as_requested |
| Identifiers | identifier.create_manual | YES | YES | NO | NO | new_candidate_real_native_and_supabase_evidence_pending |
| Identifiers | identifier.retire | YES | YES | NO | NO | new_candidate_real_native_and_supabase_evidence_pending |
| Identifiers | identifier.list | YES | YES | NO | NO | new_candidate_real_native_and_supabase_evidence_pending |
| Identifiers | sensitive.get (telecom_identifier) | YES | YES | NO | NO | new_candidate_real_native_and_supabase_evidence_pending |
| SIM/eSIM | sim.create | YES | NO | NO | NO | not_implemented_as_requested |
| SIM/eSIM | sim.assign | YES | NO | NO | NO | not_implemented_as_requested |
| SIM/eSIM | sim.activate | YES | NO | NO | NO | not_implemented_as_requested |
| SIM/eSIM | sim.replace | YES | NO | NO | NO | not_implemented_as_requested |
| SIM/eSIM | sim.history | YES | NO | NO | NO | not_implemented_as_requested |
| Portabilities | portability.list | YES | NO | NO | NO | not_implemented_as_requested |
| Portabilities | portability.get | YES | NO | NO | NO | not_implemented_as_requested |
| Portabilities | portability.create | YES | NO | NO | NO | not_implemented_as_requested |
| Portabilities | portability.transition | YES | NO | NO | NO | not_implemented_as_requested |
| Portabilities | explicit completion line action | YES | NO | NO | NO | not_implemented_as_requested |
| Permanences | permanence.list | YES | YES | YES | NO | W2_consumption_unproven |
| Permanences | permanence.get | YES | YES | YES | NO | W2_consumption_unproven |
| Permanences | permanence.create_manual | YES | YES | YES | NO | W2_consumption_unproven |
| Permanences | permanence.update | YES | YES | YES | NO | W2_consumption_unproven |
| Renewals | renewal.list | YES | YES | YES | NO | W2_consumption_unproven |
| Renewals | renewal.get | YES | YES | YES | NO | W2_consumption_unproven |
| Renewals | contract.record_renewal | YES | YES | YES | NO | W2_consumption_unproven |
| Renewals | renewal.update | YES | YES | YES | NO | W2_consumption_unproven |
| Cases | case.list | YES | NO | NO | NO | not_implemented_as_requested |
| Cases | case.get | YES | NO | NO | NO | not_implemented_as_requested |
| Cases | case.create | YES | NO | NO | NO | not_implemented_as_requested |
| Cases | case.update | YES | NO | NO | NO | not_implemented_as_requested |
| Cases | case.assign | YES | NO | NO | NO | not_implemented_as_requested |
| Cases | case.change_status | YES | NO | NO | NO | not_implemented_as_requested |
| Cases | case.resolve | YES | NO | NO | NO | not_implemented_as_requested |
| Cases | case.reopen | YES | NO | NO | NO | not_implemented_as_requested |
| Cases | case.close | YES | NO | NO | NO | not_implemented_as_requested |
| Cases | case.cancel | YES | NO | NO | NO | not_implemented_as_requested |
| Equipment | bounded equipment need assessment | YES | NO | NO | NO | assessment_pending |
| Collections | customer.list | YES | YES | YES | NO | W2_consumption_unproven |
| Collections | contact.list | YES | YES | YES | NO | W2_consumption_unproven |
| Collections | opportunity.list | YES | YES | YES | NO | W2_consumption_unproven |
| Collections | activity.list | YES | YES | YES | NO | W2_consumption_unproven |
| Collections | assignee.list | YES | YES | YES | NO | W2_consumption_unproven |
| Customer360 | bounded existing domain pages | YES | NO | NO | NO | not_implemented_as_requested |
| Customer360 | customer360.summary | YES | NO | NO | NO | not_implemented_as_requested |
| Attention | deterministic telecom attention | YES | NO | NO | NO | not_implemented_as_requested |
| Reports | operator portfolio | YES | NO | NO | NO | not_implemented_as_requested |
| Reports | service kind distribution | YES | NO | NO | NO | not_implemented_as_requested |
| Reports | line status distribution | YES | NO | NO | NO | not_implemented_as_requested |
| Reports | renewal periods | YES | NO | NO | NO | not_implemented_as_requested |
| Reports | permanence periods | YES | NO | NO | NO | not_implemented_as_requested |
| Reports | portability status | YES | NO | NO | NO | not_implemented_as_requested |
| Reports | case priority/status | YES | NO | NO | NO | not_implemented_as_requested |
| Reports | pipeline stage | YES | NO | NO | NO | not_implemented_as_requested |
| Reports | commercial owner counts | YES | NO | NO | NO | not_implemented_as_requested |
| Reports | billing monthly currency series | YES | NO | NO | NO | not_implemented_as_requested |
| Reports | billing top customers by currency | YES | NO | NO | NO | not_implemented_as_requested |
| Imports | safe telecom mapping update | YES | NO | NO | NO | not_implemented_as_requested |
| Imports | separate protected identifier import | YES | NO | NO | NO | not_implemented_as_requested |
| Imports | production encrypted processing | YES | NO | NO | NO | external_encrypted_provider_scoped_worker_domain_apply |
| Provenance | provenance.get | YES | YES | YES | NO | W2_consumption_unproven |
| Provenance | verified manual origins | YES | YES | YES | NO | W2_consumption_unproven |
| Provenance | provider-neutral external identities | YES | NO | NO | NO | not_implemented_as_requested |
| Identifiers | identifier.get | YES | YES | NO | NO | new_candidate_real_native_and_supabase_evidence_pending |
