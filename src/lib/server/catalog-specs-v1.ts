export const CATALOG_FIELDS_V1 = {
  "operator.create": [
    "command_id",
    "code",
    "display_name"
  ],
  "operator.update": [
    "command_id",
    "id",
    "expected_version",
    "display_name"
  ],
  "operator.activate": [
    "command_id",
    "id",
    "expected_version"
  ],
  "operator.deactivate": [
    "command_id",
    "id",
    "expected_version"
  ],
  "plan.create": [
    "command_id",
    "operator_id",
    "code",
    "display_name",
    "service_kind"
  ],
  "plan.update_metadata": [
    "command_id",
    "id",
    "expected_version",
    "display_name"
  ],
  "plan.change_status": [
    "command_id",
    "id",
    "expected_version",
    "status"
  ],
  "plan_version.create": [
    "command_id",
    "plan_id",
    "expected_version",
    "valid_from",
    "valid_until",
    "currency",
    "recurring_amount_minor",
    "one_time_amount_minor",
    "is_bundle",
    "components",
    "entitlements"
  ],
  "plan_version.terms_get": [
    "id"
  ]
} as const
export const CATALOG_ENTITLEMENTS_V1 = {
  "data_mib": {
    "kind": "integer",
    "unit": "MiB",
    "values": null
  },
  "unlimited_data": {
    "kind": "boolean",
    "unit": null,
    "values": null
  },
  "voice_minutes": {
    "kind": "integer",
    "unit": "minutes",
    "values": null
  },
  "unlimited_voice": {
    "kind": "boolean",
    "unit": null,
    "values": null
  },
  "sms_count": {
    "kind": "integer",
    "unit": "messages",
    "values": null
  },
  "unlimited_sms": {
    "kind": "boolean",
    "unit": null,
    "values": null
  },
  "download_mbps": {
    "kind": "integer",
    "unit": "Mbps",
    "values": null
  },
  "upload_mbps": {
    "kind": "integer",
    "unit": "Mbps",
    "values": null
  },
  "access_technology": {
    "kind": "text",
    "unit": null,
    "values": [
      "fiber_ftth",
      "cable_hfc",
      "dsl",
      "4g",
      "5g",
      "satellite",
      "other"
    ]
  },
  "roaming_zone": {
    "kind": "text",
    "unit": null,
    "values": [
      "domestic",
      "eea",
      "international"
    ]
  },
  "commitment_months": {
    "kind": "integer",
    "unit": "months",
    "values": null
  },
  "promotion_months": {
    "kind": "integer",
    "unit": "months",
    "values": null
  }
} as const
export const CATALOG_ADDONS_V1 = ["extra_data", "international_calling", "roaming", "static_ip", "device_financing"] as const
