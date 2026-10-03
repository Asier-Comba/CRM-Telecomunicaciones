'use client'
import { useState, type ReactNode } from 'react'
import { Tabs } from '@/features/product/ui'
export function CustomerTabs({ panels }: { panels: Record<string, ReactNode> }) {
  const [tab,setTab]=useState('Resumen')
  return <div className="space-y-4"><Tabs items={Object.keys(panels)} value={tab} onChange={setTab}/><section role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0} className="space-y-4 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">{panels[tab]}</section></div>
}
