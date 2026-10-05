# Telecom commercial domain acceptance matrix

Initial gap inventory at `3ebed3ff993c38cd74d60d8e3c6e4f3ed28af56c`. This is not TEL5 completion. Existing schema and narrower telecom.v1 readers are not credited as complete requested operation families. Exact-source functional proof is recorded in W1_TEL5_00_EXACT_HEAD_EVIDENCE.md; official browser CI was cancelled, local actual boundary passed, native restore passed. Every W2_CONSUMED remains false without W2 evidence. Production import processing is separately blocked and is not a prerequisite for completing safe human telecom modules.

Counts: required 86; implemented 30; proven 12; W2 consumed0. New reads are candidates until real evidence.

| Section | Requirement | REQUIRED | IMPLEMENTED | PROVEN | W2_CONSUMED | BLOCKER |
|---|---|---|---|---|---|---|
| Operators | operator.list | YES | YES | NO | NO | new_candidate_real_native_and_supabase_evidence_pending |
| Operators | operator.get | YES | YES | NO | NO | new_candidate_real_native_and_supabase_evidence_pending |
| Operators | operator.create | YES | NO | NO | NO | not_implemented_as_requested |
| Operators | operator.update | YES | NO | NO | NO | not_implemented_as_requested |
| Operators | operator.activate | YES | NO | NO | NO | not_implemented_as_requested |
| Operators | operator.deactivate | YES | NO | NO | NO | not_implemented_as_requested |
| Plans | plan.list | YES | YES | NO | NO | new_candidate_real_native_and_supabase_evidence_pending |
| Plans | plan.get | YES | YES | NO | NO | new_candidate_real_native_and_supabase_evidence_pending |
| Plans | plan.create | YES | NO | NO | NO | not_implemented_as_requested |
| Plans | plan.update_metadata | YES | NO | NO | NO | not_implemented_as_requested |
| Plans | plan.change_status | YES | NO | NO | NO | not_implemented_as_requested |
| Plan versions | plan_version.list | YES | YES | NO | NO | new_candidate_real_native_and_supabase_evidence_pending |
| Plan versions | plan_version.get | YES | YES | NO | NO | new_candidate_real_native_and_supabase_evidence_pending |
| Plan versions | plan_version.create | YES | NO | NO | NO | not_implemented_as_requested |
| Entitlements | typed immutable version entitlements | YES | NO | NO | NO | not_implemented_as_requested |
| Bundles | immutable version components | YES | NO | NO | NO | not_implemented_as_requested |
| Bundles | service add-on assignment history | YES | NO | NO | NO | not_implemented_as_requested |
| Contracts | contract.list | YES | YES | NO | NO | new_candidate_real_native_and_supabase_evidence_pending |
| Contracts | contract.create_manual | YES | YES | YES | NO | W2_consumption_unproven |
| Contracts | contract.update_allowed_metadata | YES | YES | YES | NO | W2_consumption_unproven |
| Services | service.list | YES | YES | NO | NO | new_candidate_real_native_and_supabase_evidence_pending |
| Services | service.create_manual | YES | YES | YES | NO | W2_consumption_unproven |
| Services | service.update_label | YES | YES | YES | NO | W2_consumption_unproven |
| Services | fixed service operational facts | YES | NO | NO | NO | not_implemented_as_requested |
| Lines | line.list | YES | YES | NO | NO | new_candidate_real_native_and_supabase_evidence_pending |
| Lines | line.create_manual | YES | YES | YES | NO | W2_consumption_unproven |
| Lines | line.update_label | YES | YES | YES | NO | W2_consumption_unproven |
| Lines | masked mobile commercial row | YES | NO | NO | NO | not_implemented_as_requested |
| Identifiers | identifier.assign | YES | NO | NO | NO | not_implemented_as_requested |
| Identifiers | identifier.retire | YES | NO | NO | NO | not_implemented_as_requested |
| Identifiers | identifier.list_masked | YES | NO | NO | NO | not_implemented_as_requested |
| Identifiers | identifier.reveal | YES | NO | NO | NO | not_implemented_as_requested |
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
| Permanences | permanence.list | YES | YES | NO | NO | new_candidate_real_native_and_supabase_evidence_pending |
| Permanences | permanence.get | YES | YES | NO | NO | new_candidate_real_native_and_supabase_evidence_pending |
| Permanences | permanence.create_manual | YES | YES | YES | NO | W2_consumption_unproven |
| Permanences | permanence.update | YES | YES | YES | NO | W2_consumption_unproven |
| Renewals | renewal.list | YES | YES | NO | NO | new_candidate_real_native_and_supabase_evidence_pending |
| Renewals | renewal.get | YES | YES | NO | NO | new_candidate_real_native_and_supabase_evidence_pending |
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
| Collections | customer.list | YES | YES | NO | NO | new_candidate_real_native_and_supabase_evidence_pending |
| Collections | contact.list | YES | YES | NO | NO | new_candidate_real_native_and_supabase_evidence_pending |
| Collections | opportunity.list | YES | YES | NO | NO | new_candidate_real_native_and_supabase_evidence_pending |
| Collections | activity.list | YES | YES | NO | NO | new_candidate_real_native_and_supabase_evidence_pending |
| Collections | assignee.list | YES | YES | NO | NO | new_candidate_real_native_and_supabase_evidence_pending |
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
