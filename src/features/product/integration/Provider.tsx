'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import type { WorkspaceRole } from '@/lib/workspace-roles'
import { IntegratedLocalProductRepository, SyntheticProductRepository, type ProductRepository } from './repository'
type Display={name:string|null;company:string|null;timezone:string;locale:string}
const Context = createContext<{ repository: ProductRepository; role: WorkspaceRole | null; actorId: string | null;workspaceId:string|null;display:Display|null } | null>(null)
export function ProductProvider({ integrated, role, actorId = null, workspaceId = null, children }: { integrated: boolean; role: WorkspaceRole | null; actorId?:string|null; workspaceId?:string|null; children: React.ReactNode }) {
  const [repository] = useState<ProductRepository>(() => integrated ? new IntegratedLocalProductRepository() : new SyntheticProductRepository())
  const [display,setDisplay]=useState<Display|null>(null)
  useEffect(()=>{if(!integrated||!role)return;let active=true,attempt=0;const read=()=>{const current=++attempt;void Promise.all([repository.settings('settings.profile_get'),repository.settings('settings.company_get')]).then(([self,company])=>{if(active&&current===attempt)setDisplay({name:self.profile.display_name,company:company.profile.trade_name??company.profile.business_name,timezone:self.profile.timezone,locale:self.profile.locale})}).catch(()=>{if(active&&current===attempt)setDisplay(null)})};read();window.addEventListener('crm-product-display-changed',read);return()=>{active=false;window.removeEventListener('crm-product-display-changed',read)}},[repository,integrated,role])
  return <Context.Provider value={{ repository, role, actorId,workspaceId,display }}>{children}</Context.Provider>
}
export function useProduct() {
  const value = useContext(Context)
  if (!value) throw new Error('ProductProvider required')
  return value
}
