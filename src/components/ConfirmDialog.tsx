'use client'

import { useEffect, useRef, useId } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/Button'

// Reusable in-CRM confirmation modal — replaces native window.confirm for
// destructive actions so the product feels premium and on-brand. No new deps.
// Controlled: parent owns `open` + the async action. Escape / overlay / X cancel
// (disabled while loading so a destructive op in flight isn't interrupted).
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  loadingLabel,
  cancelLabel = 'Cancelar',
  destructive = false,
  loading = false,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  loadingLabel?: string
  cancelLabel?: string
  destructive?: boolean
  loading?: boolean
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
}) {
  const dialogRef=useRef<HTMLDialogElement>(null),titleId=useId(),descriptionId=useId()
  useEffect(()=>{
    if(!open||!dialogRef.current)return
    const dialog=dialogRef.current,previous=document.activeElement as HTMLElement|null
    dialog.showModal()
    return()=>{dialog.close();previous?.focus()}
  },[open])

  if (!open) return null

  return (
    <dialog ref={dialogRef} aria-labelledby={titleId} aria-describedby={descriptionId}
      onCancel={e=>{e.preventDefault();if(!loading)onCancel()}}
      onClick={e=>{if(e.target===e.currentTarget&&!loading)onCancel()}}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/55 backdrop:backdrop-blur-sm">
        <div className="flex items-start gap-3.5 p-5">
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', destructive ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600')}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-sm font-semibold text-gray-950">{title}</h2>
            <p id={descriptionId} className="mt-1 text-sm leading-6 text-gray-500">{description}</p>
            {error && <p role="alert" className="mt-2 text-xs font-medium text-red-600">{error}</p>}
          </div>
          <button
            type="button"
            onClick={() => { if (!loading) onCancel() }}
            aria-label="Cerrar"
            disabled={loading}
            className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50/70 px-5 py-3">
          <Button variant="secondary" size="sm" autoFocus onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
          <Button variant={destructive ? 'danger' : 'primary'} size="sm" loading={loading} onClick={onConfirm}>
            {loading ? (loadingLabel ?? confirmLabel) : confirmLabel}
          </Button>
        </div>
    </dialog>
  )
}
