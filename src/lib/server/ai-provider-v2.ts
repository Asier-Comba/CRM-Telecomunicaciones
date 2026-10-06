import 'server-only'
import { OpenAiResponsesProvider } from '../../assistant/providers/openai-responses.ts'
/** Environment authority stays server-side; no public key/config serializer. */
export function createAiProviderV2() {
  if (process.env.AI_PROVIDER && process.env.AI_PROVIDER !== 'openai') return null
  return new OpenAiResponsesProvider({ apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL,
    projectId: process.env.OPENAI_PROJECT_ID })
}
