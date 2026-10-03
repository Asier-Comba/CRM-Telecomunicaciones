'use client'
import { createContext, useContext, useState, type ReactNode } from 'react'
export type CompanyForm = {
  legalName: string
  tradeName: string
  taxId: string
  address: string
  postalCode: string
  city: string
  province: string
  country: string
  email: string
  phone: string
  website: string
}
export const initialCompany: CompanyForm = {
  legalName: 'Telecom Demo Norte',
  tradeName: '',
  taxId: '',
  address: '',
  postalCode: '',
  city: '',
  province: '',
  country: 'España',
  email: '',
  phone: '',
  website: '',
}
const Context = createContext<{
  company: CompanyForm
  setCompany: (c: CompanyForm) => void
}>({ company: initialCompany, setCompany: () => {} })
export function LocalCompanyProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState(initialCompany)
  return (
    <Context.Provider value={{ company, setCompany }}>
      {children}
    </Context.Provider>
  )
}
export const useLocalCompany = () => useContext(Context)
