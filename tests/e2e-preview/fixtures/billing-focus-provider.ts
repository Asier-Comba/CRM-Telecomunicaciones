import { IntegratedLocalProductRepository } from '../../../src/features/product/integration/repository'
const repository = new IntegratedLocalProductRepository()
// Test-only provider binding. The production component, repository, parsers,
// React effects and invoice/PDF child components execute without replacement.
export function useProduct() { return { repository, role: 'owner' as const } }
