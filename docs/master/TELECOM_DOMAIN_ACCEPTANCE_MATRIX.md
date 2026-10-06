# Telecom commercial domain acceptance matrix

Accepted source `48483ae8d583e13cf1dd144b0a09873f36efddfc`:167operations individually observed,2071real checks,58migrations/260functions/270Node tests. Native fresh/restore/races and browser boundary PASS. Quality audit6HIGH remains blocked, unsuppressed. New12case operations await exact-source proof. W2_CONSUMED unproven.

Counts: REQUIRED=93, IMPLEMENTED=66, PROVEN=54, W2_CONSUMED=0, BLOCKER=93.

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
| SIM/eSIM | sim.create | YES | NO | NO | NO | not_implemented_as_requested |
| SIM/eSIM | sim.assign | YES | NO | NO | NO | not_implemented_as_requested |
| SIM/eSIM | sim.activate | YES | NO | NO | NO | not_implemented_as_requested |
| SIM/eSIM | sim.replace | YES | NO | NO | NO | not_implemented_as_requested |
| SIM/eSIM | sim.history | YES | NO | NO | NO | not_implemented_as_requested |
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
| Cases | case.list | YES | YES | NO | NO | exact_case_source_evidence_pending |
| Cases | case.get | YES | YES | NO | NO | exact_case_source_evidence_pending |
| Cases | case.create | YES | YES | NO | NO | exact_case_source_evidence_pending |
| Cases | case.update | YES | YES | NO | NO | exact_case_source_evidence_pending |
| Cases | case.assign | YES | YES | NO | NO | exact_case_source_evidence_pending |
| Cases | case.change_status | YES | YES | NO | NO | exact_case_source_evidence_pending |
| Cases | case.resolve | YES | YES | NO | NO | exact_case_source_evidence_pending |
| Cases | case.reopen | YES | YES | NO | NO | exact_case_source_evidence_pending |
| Cases | case.close | YES | YES | NO | NO | exact_case_source_evidence_pending |
| Cases | case.cancel | YES | YES | NO | NO | exact_case_source_evidence_pending |
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
| Cases | case.note_create | YES | YES | NO | NO | exact_case_source_evidence_pending |
| Cases | case.note_list | YES | YES | NO | NO | exact_case_source_evidence_pending |
