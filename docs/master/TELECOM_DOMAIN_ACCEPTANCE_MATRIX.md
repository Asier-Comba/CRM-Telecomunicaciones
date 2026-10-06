# Telecom domain acceptance matrix

Generated from JSON with scripts/domain/validate-telecom-matrix.mjs --write.

Source: `FINAL7_PROVIDER_REQUIREMENTS_AND_COMPATIBLE_DEPENDENCY_PATCH_CANDIDATE`. Accepted functional source: `788d124f133678f6fd0c29619fa99aa99fe2409f`. W2 consumption is independent of backend acceptance. Overall CI remains blocked by dependency audit.

| Section | Requirement | REQUIRED | IMPLEMENTED | PROVEN | W2_CONSUMED | BLOCKER |
| --- | --- | --- | --- | --- | --- | --- |
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
| Bundles | service add-on assignment history | YES | YES | YES | NO | W2_consumption_unproven |
| Contracts | contract.list | YES | YES | YES | NO | W2_consumption_unproven |
| Contracts | contract.create_manual | YES | YES | YES | NO | W2_consumption_unproven |
| Contracts | contract.update_allowed_metadata | YES | YES | YES | NO | W2_consumption_unproven |
| Services | service.list | YES | YES | YES | NO | W2_consumption_unproven |
| Services | service.create_manual | YES | YES | YES | NO | W2_consumption_unproven |
| Services | service.update_label | YES | YES | YES | NO | W2_consumption_unproven |
| Services | fixed service operational facts | YES | YES | NO | NO | INTERNAL_NORMALIZED_LOCATION_PENDING |
| Lines | line.list | YES | YES | YES | NO | W2_consumption_unproven |
| Lines | line.create_manual | YES | YES | YES | NO | W2_consumption_unproven |
| Lines | line.update_label | YES | YES | YES | NO | W2_consumption_unproven |
| Lines | masked mobile commercial row | YES | YES | YES | NO | W2_consumption_unproven |
| Identifiers | identifier.create_manual | YES | YES | YES | NO | W2_consumption_unproven |
| Identifiers | identifier.retire | YES | YES | YES | NO | W2_consumption_unproven |
| Identifiers | identifier.list | YES | YES | YES | NO | W2_consumption_unproven |
| Identifiers | sensitive.get (telecom_identifier) | YES | YES | YES | NO | W2_consumption_unproven |
| SIM/eSIM | sim.create | YES | YES | YES | NO | W2_consumption_unproven |
| SIM/eSIM | sim.assign | YES | YES | YES | NO | W2_consumption_unproven |
| SIM/eSIM | sim.activate | YES | YES | YES | NO | W2_consumption_unproven |
| SIM/eSIM | sim.replace | YES | YES | YES | NO | W2_consumption_unproven |
| SIM/eSIM | sim.history | YES | YES | YES | NO | W2_consumption_unproven |
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
| Customer360 | bounded existing domain pages | YES | YES | YES | NO | W2_consumption_unproven |
| Customer360 | customer360.summary | YES | YES | YES | NO | W2_consumption_unproven |
| Attention | deterministic telecom attention | YES | YES | YES | NO | W2_consumption_unproven |
| Reports | operator portfolio | YES | YES | YES | NO | W2_consumption_unproven |
| Reports | service kind distribution | YES | YES | YES | NO | W2_consumption_unproven |
| Reports | line status distribution | YES | YES | YES | NO | W2_consumption_unproven |
| Reports | renewal periods | YES | YES | YES | NO | W2_consumption_unproven |
| Reports | permanence periods | YES | YES | YES | NO | W2_consumption_unproven |
| Reports | portability status | YES | YES | YES | NO | W2_consumption_unproven |
| Reports | case priority/status | YES | YES | YES | NO | W2_consumption_unproven |
| Reports | pipeline stage | YES | YES | YES | NO | W2_consumption_unproven |
| Reports | commercial owner counts | YES | YES | YES | NO | W2_consumption_unproven |
| Reports | billing monthly currency series | YES | YES | YES | NO | W2_consumption_unproven |
| Reports | billing top customers by currency | YES | YES | YES | NO | W2_consumption_unproven |
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
| SIM/eSIM | sim.deactivate | YES | YES | YES | NO | W2_consumption_unproven |
| SIM/eSIM | sim.cancel | YES | YES | YES | NO | W2_consumption_unproven |
| SIM/eSIM | sim.list | YES | YES | YES | NO | W2_consumption_unproven |
| SIM/eSIM | sim.get | YES | YES | YES | NO | W2_consumption_unproven |

Counts: `{"REQUIRED":97,"IMPLEMENTED":92,"PROVEN":91,"W2_CONSUMED":0,"BLOCKER":97}`.
