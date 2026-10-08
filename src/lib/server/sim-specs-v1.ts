export const SIM_FIELDS_V1={
  "sim.create": [
    "command_id",
    "customer_id",
    "operator_id",
    "kind",
    "display_label"
  ],
  "sim.assign": [
    "command_id",
    "id",
    "expected_version",
    "line_id",
    "expected_line_version"
  ],
  "sim.activate": [
    "command_id",
    "id",
    "expected_version",
    "expected_line_version",
    "evidence_source",
    "provider_confirmation"
  ],
  "sim.replace": [
    "command_id",
    "id",
    "expected_version",
    "replacement_sim_id",
    "expected_replacement_version",
    "expected_line_version",
    "replacement_status",
    "evidence_source",
    "provider_confirmation"
  ],
  "sim.deactivate": [
    "command_id",
    "id",
    "expected_version",
    "expected_line_version",
    "evidence_source"
  ],
  "sim.cancel": [
    "command_id",
    "id",
    "expected_version"
  ],
  "sim.list": [],
  "sim.get": [
    "id"
  ],
  "sim.history": [
    "line_id"
  ]
}as const
export const SIM_LIST_FILTERS_V1=["limit", "after_id", "customer_id", "operator_id", "line_id", "kind", "status", "source"]as const
