import type { BillingReadDataV1 } from '@/lib/contracts/billing-v1'
import { control, Status } from '@/features/product/ui'

type InvoiceRowsProps={items:Extract<BillingReadDataV1,{operation:'invoice.list'}>['items'];disabled:boolean;onSummary:(id:string)=>void;onOpen:(id:string)=>void}
const cell='min-w-0 p-2 [overflow-wrap:anywhere]'
const label='mb-1 block text-xs text-slate-500 sm:hidden'

export function InvoiceRows({items,disabled,onSummary,onOpen}:InvoiceRowsProps){
 return <table role="table" aria-label="Listado de facturas" className="block w-full text-left text-sm sm:table">
  <thead role="rowgroup" className="sr-only sm:not-sr-only sm:table-header-group"><tr role="row">{['Factura','Estado','Vencimiento','Total','Acciones'].map(title=><th key={title} role="columnheader" scope="col" className="p-2">{title}</th>)}</tr></thead>
  <tbody role="rowgroup" className="grid gap-3 sm:table-row-group">{items.map(invoice=><tr role="row" data-invoice-id={invoice.id} key={invoice.id} className="grid grid-cols-2 rounded-lg border p-3 sm:table-row sm:rounded-none sm:border-x-0 sm:border-b-0 sm:p-0">
   <td role="cell" className={`${cell} col-span-2`}><span aria-hidden="true" className={label}>Factura</span><span className="font-medium">{invoice.number?`${invoice.number.series}/${invoice.number.year}/${String(invoice.number.sequence).padStart(6,'0')}`:`Borrador ${invoice.series} · ${invoice.issue_on}`}</span></td>
   <td role="cell" className={cell}><span aria-hidden="true" className={label}>Estado</span><Status value={invoice.status}/>{invoice.overdue&&<span className="ml-2 text-amber-700">Vencida</span>}</td>
   <td role="cell" className={cell}><span aria-hidden="true" className={label}>Vencimiento</span><span>{invoice.due_on??'Sin vencimiento'}</span></td>
   <td role="cell" className={`${cell} col-span-2`}><span aria-hidden="true" className={label}>Total</span><span className="font-semibold">{new Intl.NumberFormat('es-ES',{style:'currency',currency:invoice.currency}).format(invoice.totals.total_minor/100)}</span></td>
   <td role="cell" className={`${cell} col-span-2`}><span aria-hidden="true" className={label}>Acciones</span><div className="flex flex-wrap gap-2"><button className={control} onClick={()=>onSummary(invoice.id)}>Ver resumen</button><button className={control} disabled={disabled} onClick={()=>onOpen(invoice.id)}>Abrir factura</button></div></td>
  </tr>)}</tbody>
 </table>
}
