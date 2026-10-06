/** Closed DTO/filter registry: no raw columns, protected identifiers or caller-defined schema. */
export const TELECOM_COLLECTION_SPECS_V1 = {
  "customer.list": {
    "fields": {
      "id": "uuid",
      "version": "positive",
      "display_name": "text",
      "account_kind": [
        "legal_entity",
        "sole_trader"
      ],
      "lifecycle": [
        "lead",
        "prospect",
        "customer",
        "former_customer"
      ],
      "status": [
        "active",
        "inactive",
        "archived"
      ],
      "source": [
        "manual",
        "import",
        "integration"
      ],
      "assigned_user_id": "uuid?"
    },
    "filters": [
      "limit",
      "after_id",
      "sort",
      "status",
      "lifecycle",
      "assigned_user_id",
      "source",
      "operator_id"
    ],
    "enums": {
      "status": [
        "active",
        "inactive",
        "archived"
      ],
      "lifecycle": [
        "lead",
        "prospect",
        "customer",
        "former_customer"
      ],
      "source": [
        "manual",
        "import",
        "integration"
      ]
    }
  },
  "contact.list": {
    "fields": {
      "id": "uuid",
      "version": "positive",
      "customer_id": "uuid",
      "display_name": "text",
      "job_title": "text?",
      "status": [
        "active",
        "inactive",
        "archived"
      ],
      "is_primary": "boolean",
      "has_email": "boolean",
      "has_phone": "boolean"
    },
    "filters": [
      "limit",
      "after_id",
      "sort",
      "customer_id",
      "status"
    ],
    "enums": {
      "status": [
        "active",
        "inactive",
        "archived"
      ]
    }
  },
  "opportunity.list": {
    "fields": {
      "id": "uuid",
      "version": "positive",
      "customer_id": "uuid",
      "title": "text",
      "status": [
        "open",
        "won",
        "lost",
        "cancelled"
      ],
      "stage_id": "uuid",
      "owner_user_id": "uuid?",
      "currency": "currency?",
      "amount_minor": "money?",
      "expected_close_date": "date?",
      "next_follow_up_at": "instant?",
      "has_next_action": "boolean",
      "source": [
        "manual",
        "import",
        "integration"
      ],
      "links": "links"
    },
    "filters": [
      "limit",
      "after_id",
      "sort",
      "customer_id",
      "owner_user_id",
      "stage_id",
      "status",
      "currency",
      "expected_close_from",
      "expected_close_to"
    ],
    "enums": {
      "status": [
        "open",
        "won",
        "lost",
        "cancelled"
      ]
    }
  },
  "activity.list": {
    "fields": {
      "id": "uuid",
      "customer_id": "uuid?",
      "activity_kind": [
        "created",
        "updated",
        "contacted",
        "status_changed",
        "system"
      ],
      "summary_code": [
        "entity.created",
        "entity.updated",
        "entity.contacted",
        "entity.status_changed",
        "system.imported",
        "system.synchronized"
      ],
      "occurred_at": "instant",
      "actor_user_id": "uuid?",
      "contract_id": "uuid?",
      "service_id": "uuid?",
      "opportunity_id": "uuid?",
      "task_id": "uuid?",
      "meeting_id": "uuid?"
    },
    "filters": [
      "limit",
      "after_id",
      "sort",
      "customer_id",
      "kind",
      "entity_kind",
      "entity_id",
      "date_from",
      "date_to"
    ],
    "enums": {
      "kind": [
        "created",
        "updated",
        "contacted",
        "status_changed",
        "system"
      ],
      "entity_kind": [
        "customer",
        "contract",
        "service",
        "opportunity",
        "task",
        "meeting"
      ]
    }
  },
  "assignee.list": {
    "fields": {
      "user_id": "uuid",
      "display_name": "text",
      "role": [
        "owner",
        "admin",
        "member"
      ]
    },
    "filters": [
      "limit",
      "after_id",
      "sort",
      "role"
    ],
    "enums": {
      "role": [
        "owner",
        "admin",
        "member"
      ]
    }
  },
  "operator.list": {
    "fields": {
      "id": "uuid",
      "code": "code",
      "display_name": "text",
      "status": [
        "active",
        "inactive"
      ],
      "source": [
        "manual",
        "import",
        "integration"
      ]
    },
    "filters": [
      "limit",
      "after_id",
      "sort",
      "status",
      "source"
    ],
    "enums": {
      "status": [
        "active",
        "inactive"
      ],
      "source": [
        "manual",
        "import",
        "integration"
      ]
    }
  },
  "operator.get": {
    "fields": {
      "id": "uuid",
      "code": "code",
      "display_name": "text",
      "status": [
        "active",
        "inactive"
      ],
      "source": [
        "manual",
        "import",
        "integration"
      ]
    },
    "filters": [
      "id"
    ],
    "enums": {}
  },
  "plan.list": {
    "fields": {
      "id": "uuid",
      "operator_id": "uuid",
      "code": "code",
      "display_name": "text",
      "service_kind": [
        "mobile",
        "fiber",
        "fixed_voice",
        "data_connectivity",
        "other"
      ],
      "status": [
        "active",
        "retired"
      ]
    },
    "filters": [
      "limit",
      "after_id",
      "sort",
      "operator_id",
      "service_kind",
      "status"
    ],
    "enums": {
      "status": [
        "active",
        "retired"
      ],
      "service_kind": [
        "mobile",
        "fiber",
        "fixed_voice",
        "data_connectivity",
        "other"
      ]
    }
  },
  "plan.get": {
    "fields": {
      "id": "uuid",
      "operator_id": "uuid",
      "code": "code",
      "display_name": "text",
      "service_kind": [
        "mobile",
        "fiber",
        "fixed_voice",
        "data_connectivity",
        "other"
      ],
      "status": [
        "active",
        "retired"
      ]
    },
    "filters": [
      "id"
    ],
    "enums": {}
  },
  "plan_version.list": {
    "fields": {
      "id": "uuid",
      "plan_id": "uuid",
      "operator_id": "uuid",
      "service_kind": [
        "mobile",
        "fiber",
        "fixed_voice",
        "data_connectivity",
        "other"
      ],
      "version_number": "positive",
      "valid_from": "date",
      "valid_until": "date?",
      "currency": "currency",
      "recurring_amount_minor": "money?",
      "plan_status": [
        "active",
        "retired"
      ]
    },
    "filters": [
      "limit",
      "after_id",
      "sort",
      "plan_id",
      "operator_id",
      "service_kind",
      "valid_on",
      "status"
    ],
    "enums": {
      "service_kind": [
        "mobile",
        "fiber",
        "fixed_voice",
        "data_connectivity",
        "other"
      ],
      "status": [
        "active",
        "retired"
      ]
    }
  },
  "plan_version.get": {
    "fields": {
      "id": "uuid",
      "plan_id": "uuid",
      "operator_id": "uuid",
      "service_kind": [
        "mobile",
        "fiber",
        "fixed_voice",
        "data_connectivity",
        "other"
      ],
      "version_number": "positive",
      "valid_from": "date",
      "valid_until": "date?",
      "currency": "currency",
      "recurring_amount_minor": "money?",
      "plan_status": [
        "active",
        "retired"
      ]
    },
    "filters": [
      "id"
    ],
    "enums": {}
  },
  "contract.list": {
    "fields": {
      "id": "uuid",
      "version": "positive",
      "customer_id": "uuid",
      "operator_id": "uuid",
      "plan_version_id": "uuid?",
      "assigned_user_id": "uuid?",
      "status": [
        "draft",
        "active",
        "ended",
        "cancelled"
      ],
      "source": [
        "manual",
        "import",
        "integration"
      ],
      "start_date": "date",
      "end_date": "date?"
    },
    "filters": [
      "limit",
      "after_id",
      "sort",
      "customer_id",
      "operator_id",
      "plan_id",
      "assigned_user_id",
      "status",
      "source"
    ],
    "enums": {
      "status": [
        "draft",
        "active",
        "ended",
        "cancelled"
      ],
      "source": [
        "manual",
        "import",
        "integration"
      ]
    }
  },
  "service.list": {
    "fields": {
      "id": "uuid",
      "version": "positive",
      "customer_id": "uuid",
      "contract_id": "uuid",
      "operator_id": "uuid",
      "plan_version_id": "uuid?",
      "service_kind": [
        "mobile",
        "fiber",
        "fixed_voice",
        "data_connectivity",
        "other"
      ],
      "display_name": "text",
      "status": [
        "pending",
        "active",
        "suspended",
        "ended",
        "cancelled"
      ],
      "source": [
        "manual",
        "import",
        "integration"
      ],
      "activated_on": "date?",
      "ended_on": "date?"
    },
    "filters": [
      "limit",
      "after_id",
      "sort",
      "customer_id",
      "contract_id",
      "operator_id",
      "plan_id",
      "kind",
      "status",
      "source"
    ],
    "enums": {
      "kind": [
        "mobile",
        "fiber",
        "fixed_voice",
        "data_connectivity",
        "other"
      ],
      "status": [
        "pending",
        "active",
        "suspended",
        "ended",
        "cancelled"
      ],
      "source": [
        "manual",
        "import",
        "integration"
      ]
    }
  },
  "line.list": {
    "fields": {
      "id": "uuid",
      "version": "positive",
      "service_id": "uuid",
      "customer_id": "uuid",
      "contract_id": "uuid",
      "operator_id": "uuid",
      "plan_version_id": "uuid?",
      "display_name": "text",
      "status": [
        "pending",
        "active",
        "suspended",
        "ended",
        "cancelled"
      ],
      "source": [
        "manual",
        "import",
        "integration"
      ],
      "activated_on": "date?",
      "ended_on": "date?"
    },
    "filters": [
      "limit",
      "after_id",
      "sort",
      "customer_id",
      "contract_id",
      "service_id",
      "operator_id",
      "status",
      "source"
    ],
    "enums": {
      "status": [
        "pending",
        "active",
        "suspended",
        "ended",
        "cancelled"
      ],
      "source": [
        "manual",
        "import",
        "integration"
      ]
    }
  },
  "renewal.list": {
    "fields": {
      "id": "uuid",
      "version": "positive",
      "contract_id": "uuid",
      "customer_id": "uuid",
      "owner_user_id": "uuid?",
      "status": [
        "open",
        "completed",
        "dismissed",
        "not_applicable"
      ],
      "source": [
        "manual",
        "import",
        "integration"
      ],
      "target_on": "date",
      "opens_on": "date?",
      "closes_on": "date?",
      "attention_state": [
        "open",
        "completed",
        "dismissed",
        "not_applicable",
        "overdue",
        "upcoming"
      ]
    },
    "filters": [
      "limit",
      "after_id",
      "sort",
      "customer_id",
      "contract_id",
      "owner_user_id",
      "status",
      "window_from",
      "window_to"
    ],
    "enums": {
      "status": [
        "open",
        "completed",
        "dismissed",
        "not_applicable"
      ]
    }
  },
  "renewal.get": {
    "fields": {
      "id": "uuid",
      "version": "positive",
      "contract_id": "uuid",
      "customer_id": "uuid",
      "owner_user_id": "uuid?",
      "status": [
        "open",
        "completed",
        "dismissed",
        "not_applicable"
      ],
      "source": [
        "manual",
        "import",
        "integration"
      ],
      "target_on": "date",
      "opens_on": "date?",
      "closes_on": "date?",
      "attention_state": [
        "open",
        "completed",
        "dismissed",
        "not_applicable",
        "overdue",
        "upcoming"
      ]
    },
    "filters": [
      "id"
    ],
    "enums": {}
  },
  "permanence.list": {
    "fields": {
      "id": "uuid",
      "version": "positive",
      "contract_id": "uuid",
      "service_id": "uuid?",
      "customer_id": "uuid",
      "status": [
        "open",
        "cancelled"
      ],
      "source": [
        "manual",
        "import",
        "integration"
      ],
      "commitment_kind": [
        "minimum_term",
        "device",
        "subsidy",
        "discount",
        "other"
      ],
      "starts_on": "date",
      "ends_on": "date",
      "days_remaining": "integer",
      "timing_state": [
        "cancelled",
        "expired",
        "upcoming",
        "current"
      ]
    },
    "filters": [
      "limit",
      "after_id",
      "sort",
      "customer_id",
      "contract_id",
      "service_id",
      "status",
      "window_from",
      "window_to"
    ],
    "enums": {
      "status": [
        "open",
        "cancelled"
      ]
    }
  },
  "permanence.get": {
    "fields": {
      "id": "uuid",
      "version": "positive",
      "contract_id": "uuid",
      "service_id": "uuid?",
      "customer_id": "uuid",
      "status": [
        "open",
        "cancelled"
      ],
      "source": [
        "manual",
        "import",
        "integration"
      ],
      "commitment_kind": [
        "minimum_term",
        "device",
        "subsidy",
        "discount",
        "other"
      ],
      "starts_on": "date",
      "ends_on": "date",
      "days_remaining": "integer",
      "timing_state": [
        "cancelled",
        "expired",
        "upcoming",
        "current"
      ]
    },
    "filters": [
      "id"
    ],
    "enums": {}
  }
} as const
