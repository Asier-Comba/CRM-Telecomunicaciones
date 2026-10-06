# Telecom domain acceptance matrix

Accepted functional source: `c18123e573c2f4a066dea2be0a75c5ee82770627` (2757 Supabase checks;199 operations). Billing analytics candidate pending exact proof. Six HIGH dependency findings prevent overall CI closure; W2 consumption never inferred.

| Section | Requirement | REQUIRED | IMPLEMENTED | PROVEN | W2_CONSUMED | BLOCKER |
|---|---|---|---|---|---|---|
| Operators | operator.list | true | true | true | false | W2_consumption_unproven |
| Operators | operator.get | true | true | true | false | W2_consumption_unproven |
| Operators | operator.create | true | true | true | false | W2_consumption_unproven |
| Operators | operator.update | true | true | true | false | W2_consumption_unproven |
| Operators | operator.activate | true | true | true | false | W2_consumption_unproven |
| Operators | operator.deactivate | true | true | true | false | W2_consumption_unproven |
| Plans | plan.list | true | true | true | false | W2_consumption_unproven |
| Plans | plan.get | true | true | true | false | W2_consumption_unproven |
| Plans | plan.create | true | true | true | false | W2_consumption_unproven |
| Plans | plan.update_metadata | true | true | true | false | W2_consumption_unproven |
| Plans | plan.change_status | true | true | true | false | W2_consumption_unproven |
| Plan versions | plan_version.list | true | true | true | false | W2_consumption_unproven |
| Plan versions | plan_version.get | true | true | true | false | W2_consumption_unproven |
| Plan versions | plan_version.create | true | true | true | false | W2_consumption_unproven |
| Entitlements | typed immutable version entitlements | true | true | true | false | W2_consumption_unproven |
| Bundles | immutable version components | true | true | true | false | W2_consumption_unproven |
| Bundles | service add-on assignment history | true | false | false | false | not_implemented_as_requested |
| Contracts | contract.list | true | true | true | false | W2_consumption_unproven |
| Contracts | contract.create_manual | true | true | true | false | W2_consumption_unproven |
| Contracts | contract.update_allowed_metadata | true | true | true | false | W2_consumption_unproven |
| Services | service.list | true | true | true | false | W2_consumption_unproven |
| Services | service.create_manual | true | true | true | false | W2_consumption_unproven |
| Services | service.update_label | true | true | true | false | W2_consumption_unproven |
| Services | fixed service operational facts | true | false | false | false | not_implemented_as_requested |
| Lines | line.list | true | true | true | false | W2_consumption_unproven |
| Lines | line.create_manual | true | true | true | false | W2_consumption_unproven |
| Lines | line.update_label | true | true | true | false | W2_consumption_unproven |
| Lines | masked mobile commercial row | true | true | true | false | W2_consumption_unproven |
| Identifiers | identifier.create_manual | true | true | true | false | W2_consumption_unproven |
| Identifiers | identifier.retire | true | true | true | false | W2_consumption_unproven |
| Identifiers | identifier.list | true | true | true | false | W2_consumption_unproven |
| Identifiers | sensitive.get (telecom_identifier) | true | true | true | false | W2_consumption_unproven |
| SIM/eSIM | sim.create | true | true | true | false | W2_consumption_unproven |
| SIM/eSIM | sim.assign | true | true | true | false | W2_consumption_unproven |
| SIM/eSIM | sim.activate | true | true | true | false | W2_consumption_unproven |
| SIM/eSIM | sim.replace | true | true | true | false | W2_consumption_unproven |
| SIM/eSIM | sim.history | true | true | true | false | W2_consumption_unproven |
| Portabilities | portability.list | true | true | true | false | W2_consumption_unproven |
| Portabilities | portability.get | true | true | true | false | W2_consumption_unproven |
| Portabilities | portability.create | true | true | true | false | W2_consumption_unproven |
| Portabilities | portability.transition | true | true | true | false | W2_consumption_unproven |
| Portabilities | explicit completion line action | true | true | true | false | W2_consumption_unproven |
| Permanences | permanence.list | true | true | true | false | W2_consumption_unproven |
| Permanences | permanence.get | true | true | true | false | W2_consumption_unproven |
| Permanences | permanence.create_manual | true | true | true | false | W2_consumption_unproven |
| Permanences | permanence.update | true | true | true | false | W2_consumption_unproven |
| Renewals | renewal.list | true | true | true | false | W2_consumption_unproven |
| Renewals | renewal.get | true | true | true | false | W2_consumption_unproven |
| Renewals | contract.record_renewal | true | true | true | false | W2_consumption_unproven |
| Renewals | renewal.update | true | true | true | false | W2_consumption_unproven |
| Cases | case.list | true | true | true | false | W2_consumption_unproven |
| Cases | case.get | true | true | true | false | W2_consumption_unproven |
| Cases | case.create | true | true | true | false | W2_consumption_unproven |
| Cases | case.update | true | true | true | false | W2_consumption_unproven |
| Cases | case.assign | true | true | true | false | W2_consumption_unproven |
| Cases | case.change_status | true | true | true | false | W2_consumption_unproven |
| Cases | case.resolve | true | true | true | false | W2_consumption_unproven |
| Cases | case.reopen | true | true | true | false | W2_consumption_unproven |
| Cases | case.close | true | true | true | false | W2_consumption_unproven |
| Cases | case.cancel | true | true | true | false | W2_consumption_unproven |
| Equipment | bounded equipment need assessment | true | false | false | false | assessment_pending |
| Collections | customer.list | true | true | true | false | W2_consumption_unproven |
| Collections | contact.list | true | true | true | false | W2_consumption_unproven |
| Collections | opportunity.list | true | true | true | false | W2_consumption_unproven |
| Collections | activity.list | true | true | true | false | W2_consumption_unproven |
| Collections | assignee.list | true | true | true | false | W2_consumption_unproven |
| Customer360 | bounded existing domain pages | true | false | false | false | not_implemented_as_requested |
| Customer360 | customer360.summary | true | true | true | false | W2_consumption_unproven |
| Attention | deterministic telecom attention | true | true | true | false | W2_consumption_unproven |
| Reports | operator portfolio | true | true | true | false | W2_consumption_unproven |
| Reports | service kind distribution | true | true | true | false | W2_consumption_unproven |
| Reports | line status distribution | true | true | true | false | W2_consumption_unproven |
| Reports | renewal periods | true | true | true | false | W2_consumption_unproven |
| Reports | permanence periods | true | true | true | false | W2_consumption_unproven |
| Reports | portability status | true | true | true | false | W2_consumption_unproven |
| Reports | case priority/status | true | true | true | false | W2_consumption_unproven |
| Reports | pipeline stage | true | true | true | false | W2_consumption_unproven |
| Reports | commercial owner counts | true | true | true | false | W2_consumption_unproven |
| Reports | billing monthly currency series | true | true | false | false | exact_source_acceptance_pending;W2_consumption_unproven |
| Reports | billing top customers by currency | true | true | false | false | exact_source_acceptance_pending;W2_consumption_unproven |
| Imports | safe telecom mapping update | true | false | false | false | not_implemented_as_requested |
| Imports | separate protected identifier import | true | false | false | false | not_implemented_as_requested |
| Imports | production encrypted processing | true | false | false | false | external_encrypted_provider_scoped_worker_domain_apply |
| Provenance | provenance.get | true | true | true | false | W2_consumption_unproven |
| Provenance | verified manual origins | true | true | true | false | W2_consumption_unproven |
| Provenance | provider-neutral external identities | true | false | false | false | not_implemented_as_requested |
| Identifiers | identifier.get | true | true | true | false | W2_consumption_unproven |
| Plan versions | plan_version.terms_get | true | true | true | false | W2_consumption_unproven |
| Portabilities | portability.update_draft | true | true | true | false | W2_consumption_unproven |
| Portabilities | portability.assign | true | true | true | false | W2_consumption_unproven |
| Portabilities | portability.complete | true | true | true | false | W2_consumption_unproven |
| Cases | case.note_create | true | true | true | false | W2_consumption_unproven |
| Cases | case.note_list | true | true | true | false | W2_consumption_unproven |
| SIM/eSIM | sim.deactivate | true | true | true | false | W2_consumption_unproven |
| SIM/eSIM | sim.cancel | true | true | true | false | W2_consumption_unproven |
| SIM/eSIM | sim.list | true | true | true | false | W2_consumption_unproven |
| SIM/eSIM | sim.get | true | true | true | false | W2_consumption_unproven |

Counts: `{"REQUIRED":97,"IMPLEMENTED":89,"PROVEN":87,"W2_CONSUMED":0,"BLOCKER":97}`.
