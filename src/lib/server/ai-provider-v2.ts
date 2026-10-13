import 'server-only'
import type { AiProvider } from '../../assistant/providers/ai-provider.ts'
/** Environment authority stays server-side; no public key/config serializer. */
export function createAiProviderV2(): AiProvider | null {
  // A backend key is configuration, not authority to spend. The local ledger
  // and inert call coordinator do not install a canonical provider controller.
  // Keep the route unconfigured until that controller, verified pricing/token
  // bounds and the shared authorization are actually wired here. No env flag
  // can bypass this missing integration; adapter tests remain offline-capable.
  return null
}
