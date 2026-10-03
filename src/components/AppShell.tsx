'use client'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { Topbar } from '@/components/Topbar'
import { LocalCompanyProvider } from '@/features/settings/LocalCompany'
import type { SearchItem } from '@/features/product/model'
export function AppShell({
  children,
  search = [],
}: {
  children: React.ReactNode
  search?: SearchItem[]
}) {
  const [navOpen, setNavOpen] = useState(false),
    pathname = usePathname(),
    dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    queueMicrotask(() => setNavOpen(false))
  }, [pathname])
  useEffect(() => {
    if (navOpen && !dialog.current?.open) dialog.current?.showModal()
    if (!navOpen && dialog.current?.open) dialog.current?.close()
  }, [navOpen])
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)'),
      close = () => {
        if (media.matches) setNavOpen(false)
      }
    media.addEventListener('change', close)
    return () => media.removeEventListener('change', close)
  }, [])
  return (
    <LocalCompanyProvider>
      <div className="flex h-dvh overflow-hidden bg-slate-50">
        <a
          href="#main-content"
          className="sr-only fixed left-3 top-2 z-[80] rounded bg-indigo-600 px-4 py-2 text-white focus:not-sr-only"
        >
          Saltar al contenido
        </a>
        <div className="hidden h-full lg:flex">
          <Sidebar />
        </div>
        <dialog
          ref={dialog}
          aria-label="Navegación"
          onCancel={() => setNavOpen(false)}
          onClick={(e) => {
            if (e.target === e.currentTarget) setNavOpen(false)
          }}
          className="fixed inset-y-0 left-0 right-auto m-0 h-dvh max-h-none w-60 max-w-[84vw] border-0 bg-white p-0 shadow-2xl backdrop:bg-slate-950/40 lg:hidden"
        >
          <Sidebar onClose={() => setNavOpen(false)} />
        </dialog>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar search={search} onMenuClick={() => setNavOpen(true)} />
          <main
            id="main-content"
            tabIndex={-1}
            className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3 pb-8 outline-none sm:p-5 xl:p-6"
          >
            {children}
          </main>
        </div>
      </div>
    </LocalCompanyProvider>
  )
}
