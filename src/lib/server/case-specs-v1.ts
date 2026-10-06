export const CASE_FIELDS_V1={
  "case.create": [
    "command_id",
    "customer_id",
    "contract_id",
    "service_id",
    "line_id",
    "case_type",
    "title",
    "priority",
    "due_on",
    "assigned_user_id"
  ],
  "case.update": [
    "command_id",
    "id",
    "expected_version",
    "case_type",
    "title",
    "priority",
    "due_on"
  ],
  "case.assign": [
    "command_id",
    "id",
    "expected_version",
    "assigned_user_id"
  ],
  "case.change_status": [
    "command_id",
    "id",
    "expected_version",
    "status"
  ],
  "case.resolve": [
    "command_id",
    "id",
    "expected_version",
    "resolution_code"
  ],
  "case.reopen": [
    "command_id",
    "id",
    "expected_version"
  ],
  "case.close": [
    "command_id",
    "id",
    "expected_version"
  ],
  "case.cancel": [
    "command_id",
    "id",
    "expected_version",
    "cancellation_code"
  ],
  "case.note_create": [
    "command_id",
    "id",
    "expected_version",
    "body"
  ],
  "case.list": [],
  "case.get": [
    "id"
  ],
  "case.note_list": [
    "id"
  ]
}as const
export const CASE_LIST_FILTERS_V1=["limit", "after_id", "customer_id", "contract_id", "service_id", "line_id", "assigned_user_id", "case_type", "priority", "status", "source", "due_from", "due_to", "overdue"]as const
