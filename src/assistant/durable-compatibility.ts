/** Offline review metadata, not an adapter, migration or production approval. */
export const W1_DURABLE_COMPATIBILITY = {
  source: {
    branch: 'w1/telecom-domain-v1',
    commit: 'e65f1e802fbcb63f9a1636689b85eb2aa135c592',
    path: 'docs/master/W1_W3_DURABLE_DATA_MAPPING.md',
  },
  status: 'offline_candidate_only',
  productionReady: false,
  relations: {
    confirmation: 'assistant_confirmations',
    operation: 'assistant_operations',
    outbox: 'assistant_outbox',
    reconciliationAudit: 'append_only_business_audit_event',
  },
  uniqueIdentities: [
    ['workspace_id', 'operation_ref'],
    ['workspace_id', 'capability', 'idempotency_key'],
  ],
  immutableBinding: ['workspaceId', 'actorId', 'capability', 'argumentsDigest'],
  requiredEvidence: [
    'w4_accepted_integration_base',
    'forced_rls_and_immutable_binding',
    'atomic_confirmation_compare_and_swap',
    'atomic_operation_and_outbox_transaction',
    'multiprocess_races_and_restart_replay',
    'versioned_canonical_argument_digest',
    'safe_result_reference_projection',
    'append_only_audit_transaction',
    'real_jwt_tenant_membership_and_service_principal_attacks',
    'isolated_backup_restore',
  ],
  // These cannot be claimed from the current in-memory conformance adapter.
  contractGaps: [
    'confirmation_api_does_not_expose_expected_version',
    'outbox_api_does_not_define_atomic_operation_transaction',
    'capability_result_requires_safe_reference_storage_projection',
    'reconciliation_audit_is_not_atomic_with_transition',
  ],
} as const
