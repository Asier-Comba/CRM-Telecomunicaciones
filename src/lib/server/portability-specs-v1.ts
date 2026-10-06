export const PORTABILITY_FIELDS_V1={
  "portability.create": [
    "command_id",
    "line_id",
    "number_identifier_id",
    "direction",
    "donor_operator_id",
    "target_operator_id",
    "requested_on",
    "owner_user_id"
  ],
  "portability.update_draft": [
    "command_id",
    "id",
    "expected_version",
    "donor_operator_id",
    "target_operator_id",
    "requested_on"
  ],
  "portability.assign": [
    "command_id",
    "id",
    "expected_version",
    "owner_user_id"
  ],
  "portability.transition": [
    "command_id",
    "id",
    "expected_version",
    "status",
    "effective_on",
    "reason_code",
    "evidence_source"
  ],
  "portability.complete": [
    "command_id",
    "id",
    "expected_version",
    "completed_on",
    "evidence_source",
    "provider_outcome",
    "line_action",
    "expected_line_version"
  ],
  "portability.list": [],
  "portability.get": [
    "id"
  ]
}as const
export const PORTABILITY_LIST_FILTERS_V1=["limit", "after_id", "customer_id", "contract_id", "service_id", "line_id", "owner_user_id", "operator_id", "status", "source", "direction", "window_from", "window_to"]as const
export const PORTABILITY_REASONS_V1=["subscriber_mismatch", "number_not_found", "authorization_missing", "ineligible_contract", "donor_rejected", "technical_failure", "customer_withdrew", "duplicate_request"]as const
