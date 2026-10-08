import { CONFIRMATION_STATES, IDEMPOTENCY_STATES, OUTBOX_STATES } from './durable-contracts.ts'
import type { DurableConfirmationRecord, DurableIdempotencyRecord, DurableOutboxRecord, ReconciliationAuditEvent, ServerEffectCommand } from './durable-contracts.ts'
import type { ConfirmationBinding } from './contracts.ts'

type SemanticMapping = {
  meaning: string
  mapping: 'direct_semantics' | 'flatten_binding' | 'flatten_command' | 'requires_projection'
  physicalColumn: null
}
const semantic = (meaning: string): SemanticMapping => ({ meaning, mapping: 'direct_semantics', physicalColumn: null })
const binding = { meaning: 'Immutable server actor/workspace/capability/versioned argument digest; dedicated fields, not authority JSON', mapping: 'flatten_binding', physicalColumn: null } as const
/** Semantic mapping only. The W5 physical foundation is reviewed separately;
 * W2 now owns its adapter. Null column names do not define physical storage.
 * `satisfies Record<keyof ...>` makes additions/removals fail compilation.
 */
export const DURABLE_MAPPING_MANIFEST = {
  source: {
    branch: 'w1/telecom-domain-v1', commit: 'e65f1e802fbcb63f9a1636689b85eb2aa135c592',
    path: 'docs/master/W1_W3_DURABLE_DATA_MAPPING.md',
  },
  status: 'offline_semantic_mapping_not_adapter',
  confirmation: {
    candidateRelation: 'assistant_confirmations', states: CONFIRMATION_STATES,
    fields: {
      operationRef: semantic('LEGACY FIELD NAME: opaque confirmation identity, NOT the logical operation; persist a separate immutable association during confirmReserveEnqueue'), binding,
      state: semantic('Exact W3 confirmation state'), version: semantic('Optimistic version'),
      issuedAt: semantic('Server issue timestamp'), expiresAt: semantic('Server maximum-bounded expiry'),
      updatedAt: semantic('Last committed transition timestamp'),
    } satisfies Record<keyof DurableConfirmationRecord, SemanticMapping>,
  },
  operation: {
    candidateRelation: 'assistant_operations', states: IDEMPOTENCY_STATES,
    fields: {
      operationRef: semantic('Opaque workspace-scoped operation identity'),
      idempotencyKey: semantic('Workspace/capability-scoped key with immutable full binding'), binding,
      state: semantic('Exact W3 operation state'), attempt: semantic('Execution attempt counter'),
      version: semantic('Optimistic version'), leaseExpiresAt: semantic('Expiring execution lease'),
      createdAt: semantic('Server creation timestamp'), updatedAt: semantic('Last committed transition timestamp'),
      effectReceiptRef: semantic('Opaque verified effect receipt reference; never provider body'),
      result: {
        meaning: 'UNMAPPABLE DIRECTLY: CapabilityResult body requires validated projection into a safe result reference (safe_result_ref is a semantic label, not a published SQL column)',
        mapping: 'requires_projection', physicalColumn: null,
      },
      failureCode: semantic('Allowlisted safe failure code'),
    } satisfies Record<keyof DurableIdempotencyRecord, SemanticMapping>,
  },
  outbox: {
    candidateRelation: 'assistant_outbox', states: OUTBOX_STATES,
    fields: {
      outboxRef: semantic('Opaque outbox identity'), operationRef: semantic('Same-workspace operation foreign identity'), binding,
      command: { meaning: 'Allowlisted dispatcher and opaque command reference; no URLs or provider payload', mapping: 'flatten_command', physicalColumn: null },
      state: semantic('Exact W3 outbox state'), attempt: semantic('Dispatch attempt counter'),
      version: semantic('Optimistic version'), leaseExpiresAt: semantic('Expiring worker lease'),
      receiptRef: semantic('Opaque receipt reference'), failureCode: semantic('Allowlisted safe failure code'),
      createdAt: semantic('Server enqueue timestamp'), updatedAt: semantic('Last committed transition timestamp'),
    } satisfies Record<keyof DurableOutboxRecord, SemanticMapping>,
  },
  audit: {
    candidateRelation: null,
    meaning: 'Append-only business audit event; W1 did not publish an assistant audit relation name',
    fields: {
      event: semantic('Closed reconciliation event type'), requestId: semantic('Server request reference'),
      actorId: semantic('Authorized reconciling principal identity'), workspaceId: semantic('Server-resolved workspace identity'),
      operationRef: semantic('Workspace-scoped operation identity'), requestedOutcome: semantic('Closed requested outcome'),
      decision: semantic('Closed reconciliation decision'), reasonCode: semantic('Closed safe reason code, never verifier body'),
    } satisfies Record<keyof ReconciliationAuditEvent, SemanticMapping>,
  },
  bindingFields: {
    actorId: semantic('Immutable originating actor identity'), workspaceId: semantic('Immutable server workspace identity'),
    capability: semantic('Immutable registered capability name'), argumentsDigest: semantic('Immutable versioned canonical argument digest'),
  } satisfies Record<keyof ConfirmationBinding, SemanticMapping>,
  commandFields: {
    dispatcher: semantic('Server allowlisted dispatcher key'), commandRef: semantic('Opaque server command reference'),
  } satisfies Record<keyof ServerEffectCommand, SemanticMapping>,
} as const
