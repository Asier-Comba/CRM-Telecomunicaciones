/**
 * Import seam kept separate so this composition can be transported without
 * copying backend DTOs. Every symbol is a W2 presentation type.
 */
export type {
  AttentionItemPresentation,
  CustomerIdentityPresentation,
  OpaqueId,
  PrimaryContactPresentation,
} from './w2-presentation-v0.ts'

export type {
  ContractSummaryPresentation,
  LineSummaryPresentation,
  ServiceSummaryPresentation,
} from './w2-telecom-portfolio-v0.ts'

