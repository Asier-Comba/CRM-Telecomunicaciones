'use client'
import { createContext, useContext, useState } from 'react'
import type { WorkspaceRole } from '@/lib/workspace-roles'
import { IntegratedLocalProductRepository, SyntheticProductRepository, type ProductRepository } from './repository'
const Context = createContext<{ repository: ProductRepository; role: WorkspaceRole | null } | null>(null)
export function ProductProvider({ integrated, role, children }: { integrated: boolean; role: WorkspaceRole | null; children: React.ReactNode }) {
  const [repository] = useState<ProductRepository>(() => integrated ? new IntegratedLocalProductRepository() : new SyntheticProductRepository())
  return <Context.Provider value={{ repository, role }}>{children}</Context.Provider>
}
export function useProduct() {
  const value = useContext(Context)
  if (!value) throw new Error('ProductProvider required')
  return value
}
