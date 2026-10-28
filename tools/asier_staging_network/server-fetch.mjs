// Shared pure implementation: no node:* dependency enters the SDK/edge proxy graph.
export {createPrivateSupabaseFetchV1 as createGatewayFetch} from '../../src/lib/server/product-private-egress-v1.ts'
