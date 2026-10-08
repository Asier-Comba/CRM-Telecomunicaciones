# Commercial catalog.v1 — accepted human backend

Accepted source `461245637b2078a1151969d4f3c6662ad626a239`: all9operations individually observed,1838real Supabase checks,57migrations/256functions/264Node tests; native fresh/restore/races and official browser boundary PASS. e7b33c3 failed application bundle filtering and was repaired by4612456. Quality audit remains6HIGH, unsuppressed. Evidence: W1_TEL5_CATALOG_ACCEPTANCE.json.

POST `/api/catalog/v1`, real same-origin current-user cookie transport, `PRODUCT_V1_ENABLED`, canonical `PRODUCT_V1_ORIGIN`, no-store. Raw catalog tables remain closed. No AI write registration or provider calls.

| Operation | Input | Roles |
|---|---|---|
| operator.create | command_id, code, display_name | owner/admin |
| operator.update | command_id, id, expected_version, display_name | owner/admin |
| operator.activate / operator.deactivate | command_id, id, expected_version | owner/admin |
| plan.create | command_id, operator_id, code, display_name, service_kind | owner/admin |
| plan.update_metadata | command_id, id, expected_version, display_name | owner/admin |
| plan.change_status | command_id, id, expected_version, status active/retired | owner/admin |
| plan_version.create | command_id, plan_id, expected_version, valid_from, valid_until, currency, recurring_amount_minor, one_time_amount_minor, is_bundle, components, entitlements | owner/admin |
| plan_version.terms_get | id | owner/admin/member/viewer |

Ordinary operator.get/list and plan.get/list now include authoritative `version` for CAS. W2 must use the new typed DTO after this candidate passes. Consumption reads remain `/api/product/v1/queries`; no fixtures required.

Versions publish atomically with a server-assigned version_number, typed entitlements, ordered components, publication seal and value-free audit. Parent plan CAS increments; receipt carries parent_version. The header, children and seal cannot be changed after publication, including when referenced. The existing non-overlapping inclusive date-window constraint remains: a future version must use a non-overlapping window. Existing open-ended versions cannot be shortened; use a separately identified new plan rather than rewriting historical commercial truth. No supersession operation is implemented.

New recurring prices are monthly (`recurring_period=month`), exact decimal-string minor units, currency-separated. Activation/setup price is one_time_amount_minor. No inferred prices, cross-currency sums or component-price allocation. Legacy terms remain `unrecorded`, with unknown bundle/setup/period values null and no fabricated entitlements/components.

Components: 1–8 ordered entries, position assigned server-side. Each has component_kind base/add_on, service_kind mobile/fiber/fixed_voice/data_connectivity/other, quantity1–100, addon_code null for base or one of extra_data/international_calling/roaming/static_ip/device_financing for add_on. First base retains the plan's existing primary service kind. Single-service products have exactly one base unit; bundles have at least two. Registered optional catalog components are frozen commercial facts; separate optional service add-on assignment/history is not yet implemented.

Service assignment permits the primary service kind or a sealed bundle's base components, using the same operator and version validity checks. An add-on alone does not authorize a new base service. plan_version.list service-kind filtering includes frozen base components; plan.list includes currently valid frozen bundle components while retaining primary service_kind in its row DTO. Existing single-service versions retain prior behavior.

Entitlements: maximum24. Each input entry has exactly code, component_position (null means whole product; otherwise1–8), integer_value, boolean_value, text_value. Exactly the registered type's value is present; the other two are null. Whole-product and component facts are explicit scopes; they are not implicit overrides or client-derived sums. Duplicate code/scope and unlimited true plus a capped allowance in the same scope are rejected.

| Code | Type | Unit / values |
|---|---|---|
| data_mib | integer decimal string | MiB |
| unlimited_data | boolean | — |
| voice_minutes | integer decimal string | minutes |
| unlimited_voice | boolean | — |
| sms_count | integer decimal string | messages |
| unlimited_sms | boolean | — |
| download_mbps / upload_mbps | integer decimal string 1–1,000,000 | Mbps |
| access_technology | controlled text | fiber_ftth, cable_hfc, dsl, 4g, 5g, satellite, other |
| roaming_zone | controlled text | domestic, eea, international |
| commitment_months / promotion_months | integer decimal string 0–60 | months |

Other integer allowances are bounded0–10^12. No arbitrary JSON facts or free-text catalog features. Output includes registered value_kind/unit and ordered component positions. This is a commercial catalog, not network provisioning or an SLA/charging engine.

Only manual catalog facts can be administered. Imported/integration operators reject mutation. Legacy plan provenance was not previously stored: new nullable source preserves that uncertainty; unknown legacy plans remain readable but are not relabeled or administered as verified manual plans. New canonical plans explicitly record manual source. Production import processing/protected staging remains separate and blocked.

Node tests, fresh embedded schema/restore, SQL operation/immutability/bundle assertions pass locally. Native fresh/logical restore and independent-process version races plus real Supabase Auth/PostgREST/cookie operation acceptance are published for exact-source proof. Candidate status remains until those jobs pass; W2 consumption and fully green audit are not claimed.
