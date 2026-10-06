# Telecom commercial domain acceptance matrix

Accepted source `a220ee17c8eb59fe8e4ab33530c6f4205a5bdefd`:179operations individually observed,2290real checks,59migrations/264functions/276Node tests. Native fresh/restore/races and actual private boundary PASS. Audit6HIGH remains blocked, unsuppressed. New9SIMoperations and protected SIM identifier extensions await exact-source proof. W2_CONSUMED unproven.

Counts: REQUIRED=97, IMPLEMENTED=75, PROVEN=66, W2_CONSUMED=0, BLOCKER=97.

| Section | Requirement | REQUIRED | IMPLEMENTED | PROVEN | W2_CONSUMED | BLOCKER |
|---|---|---|---|---|---|---|
| Operators | operator.list | YES | YES | YES | NO | W2_consumption_unproven |
| Operators | operator.get | YES | YES | YES | NO | W2_consumption_unproven |
| Operators | operator.create | YES | YES | YES | NO | W2_consumption_unproven |
| Operators | operator.update | YES | YES | YES | NO | W2_consumption_unproven |
| Operators | operator.activate | YES | YES | YES | NO | W2_consumption_unproven |
| Operators | operator.deactivate | YES | YES | YES | NO | W2_consumption_unproven |
| Plans | plan.list | YES | YES | YES | NO | W2_consumption_unproven |
| Plans | plan.get | YES | YES | YES | NO | W2_consumption_unproven |
| Plans | plan.create | YES | YES | YES | NO | W2_consumption_unproven |
| Plans | plan.update_metadata | YES | YES | YES | NO | W2_consumption_unproven |
| Plans | plan.change_status | YES | YES | YES | NO | W2_consumption_unproven |
| Plan versions | plan_version.list | YES | YES | YES | NO | W2_consumption_unproven |
| Plan versions | plan_version.get | YES | YES | YES | NO | W2_consumption_unproven |
| Plan versions | plan_version.create | YES | YES | YES | NO | W2_consumption_unproven |
| Entitlements | typed immutable version entitlements | YES | YES | YES | NO | W2_consumption_unproven |
| Bundles | immutable version components | YES | YES | YES | NO | W2_consumption_unproven |
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
| Identifiers | identifier.create_manual | YES | YES | YES | NO | W2_consumption_unproven |
| Identifiers | identifier.retire | YES | YES | YES | NO | W2_consumption_unproven |
| Identifiers | identifier.list | YES | YES | YES | NO | W2_consumption_unproven |
| Identifiers | sensitive.get (telecom_identifier) | YES | YES | YES | NO | W2_consumption_unproven |
| SIM/eSIM | sim.create | YES | YES | NO | NO | exact_sim_source_evidence_pending |
| SIM/eSIM | sim.assign | YES | YES | NO | NO | exact_sim_source_evidence_pending |
| SIM/eSIM | sim.activate | YES | YES | NO | NO | exact_sim_source_evidence_pending |
| SIM/eSIM | sim.replace | YES | YES | NO | NO | exact_sim_source_evidence_pending |
| SIM/eSIM | sim.history | YES | YES | NO | NO | exact_sim_source_evidence_pending |
| Portabilities | portability.list | YES | YES | YES | NO | W2_consumption_unproven |
| Portabilities | portability.get | YES | YES | YES | NO | W2_consumption_unproven |
| Portabilities | portability.create | YES | YES | YES | NO | W2_consumption_unproven |
| Portabilities | portability.transition | YES | YES | YES | NO | W2_consumption_unproven |
| Portabilities | explicit completion line action | YES | YES | YES | NO | W2_consumption_unproven |
| Permanences | permanence.list | YES | YES | YES | NO | W2_consumption_unproven |
| Permanences | permanence.get | YES | YES | YES | NO | W2_consumption_unproven |
| Permanences | permanence.create_manual | YES | YES | YES | NO | W2_consumption_unproven |
| Permanences | permanence.update | YES | YES | YES | NO | W2_consumption_unproven |
| Renewals | renewal.list | YES | YES | YES | NO | W2_consumption_unproven |
| Renewals | renewal.get | YES | YES | YES | NO | W2_consumption_unproven |
| Renewals | contract.record_renewal | YES | YES | YES | NO | W2_consumption_unproven |
| Renewals | renewal.update | YES | YES | YES | NO | W2_consumption_unproven |
| Cases | case.list | YES | YES | YES | NO | W2_consumption_unproven |
| Cases | case.get | YES | YES | YES | NO | W2_consumption_unproven |
| Cases | case.create | YES | YES | YES | NO | W2_consumption_unproven |
| Cases | case.update | YES | YES | YES | NO | W2_consumption_unproven |
| Cases | case.assign | YES | YES | YES | NO | W2_consumption_unproven |
| Cases | case.change_status | YES | YES | YES | NO | W2_consumption_unproven |
| Cases | case.resolve | YES | YES | YES | NO | W2_consumption_unproven |
| Cases | case.reopen | YES | YES | YES | NO | W2_consumption_unproven |
| Cases | case.close | YES | YES | YES | NO | W2_consumption_unproven |
| Cases | case.cancel | YES | YES | YES | NO | W2_consumption_unproven |
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
| Identifiers | identifier.get | YES | YES | YES | NO | W2_consumption_unproven |
| Plan versions | plan_version.terms_get | YES | YES | YES | NO | W2_consumption_unproven |
| Portabilities | portability.update_draft | YES | YES | YES | NO | W2_consumption_unproven |
| Portabilities | portability.assign | YES | YES | YES | NO | W2_consumption_unproven |
| Portabilities | portability.complete | YES | YES | YES | NO | W2_consumption_unproven |
| Cases | case.note_create | YES | YES | YES | NO | W2_consumption_unproven |
| Cases | case.note_list | YES | YES | YES | NO | W2_consumption_unproven |
| SIM/eSIM | sim.deactivate | YES | YES | NO | NO | exact_sim_source_evidence_pending |
| SIM/eSIM | sim.cancel | YES | YES | NO | NO | exact_sim_source_evidence_pending |
| SIM/eSIM | sim.list | YES | YES | NO | NO | exact_sim_source_evidence_pending |
| SIM/eSIM | sim.get | YES | YES | NO | NO | exact_sim_source_evidence_pending |
