'use client'
import Link from 'next/link'
import { CustomerIntegratedPanels, customerAreas } from './CustomerIntegratedPanels'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CustomerEditor } from './CustomerEditor'
import { useProduct } from '@/features/product/integration/Provider'
import { commandIntent, safeMessage, ProductUiError } from '@/features/product/integration/repository'
import { PreviewNotice, control, primary, Status, Drawer, Tabs } from '@/features/product/ui'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { CustomerEditorV1, ContactEditorPageV1, ContactEditorV1, ProductReceiptV1 } from '@/lib/contracts/product-v1'

export function IntegratedCustomerDetail({ id }: { id: string }) {
  const { repository, role } = useProduct()
  const [customer,setCustomer] = useState<CustomerEditorV1|null>(null), [contacts,setContacts] = useState<ContactEditorPageV1|null>(null)
  const [error,setError] = useState(''), [edit,setEdit] = useState(false), [contact,setContact] = useState<ContactEditorV1|'new'|null>(null)
  const [confirm,setConfirm] = useState(false), [busy,setBusy] = useState(false), [message,setMessage] = useState('')
  const [area,setArea]=useState('Resumen')
  const archiveIntent = useRef<{execute:()=>Promise<ProductReceiptV1>}|null>(null)
  const canWrite = role !== null && role !== 'viewer'
  const load = useCallback(async()=>{
    setError('')
    try { const [c,p] = await Promise.all([repository.customer(id),repository.contacts(id)]);setCustomer(c);setContacts(p) }
    catch(e){setCustomer(null);setContacts(null);setError(safeMessage(e))}
  },[repository,id])
  useEffect(()=>{let active=true; void (async()=>{try {const [c,p]=await Promise.all([repository.customer(id),repository.contacts(id)]);if(active){setCustomer(c);setContacts(p)}}catch(e){if(active)setError(safeMessage(e))}})();return()=>{active=false}},[repository,id])
  async function archive() {
    if(!customer || busy)return
    setBusy(true);setError('')
    if(!archiveIntent.current){const action=commandIntent(customer.status==='archived'?'customer.restore':'customer.archive',{id,expected_version:customer.version});archiveIntent.current={execute:()=>action.execute(repository)}}
    try {await archiveIntent.current.execute();archiveIntent.current=null;setConfirm(false);setMessage('Cambio guardado.');await load()}
    catch(e){setError(safeMessage(e));if(!(e instanceof ProductUiError && e.code==='transport_uncertain'))archiveIntent.current=null}
    finally{setBusy(false)}
  }
  return <div className="space-y-4">
    <Link href="/clients" className="text-sm text-indigo-600">Volver a clientes</Link><PreviewNotice />
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    {!customer ? <section className="rounded-xl border bg-white p-5"><p>{error?'Cliente no disponible':'Cargando cliente…'}</p><button className={control} onClick={load}>Volver a consultar</button></section> : <>
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-5"><div><Status value={customer.status}/><h1 className="mt-2 text-2xl font-bold">{customer.legal_name}</h1><p className="text-sm text-slate-500">{customer.trade_name} · Origen: {customer.source}</p></div><div className="flex gap-2">{canWrite && customer.source==='manual' && <>{customer.status!=='archived'&&<button className={control} onClick={()=>setEdit(true)}>Editar cliente</button>}<button className={control} onClick={()=>{archiveIntent.current=null;setError('');setConfirm(true)}}>{customer.status==='archived'?'Restaurar cliente':'Archivar cliente'}</button></>}</div></header>
      <Tabs prefix="customer360-" items={customerAreas} value={area} onChange={setArea}/><section role="tabpanel" id={`customer360-panel-${area}`} aria-labelledby={`customer360-tab-${area}`} className="space-y-4"><CustomerIntegratedPanels customer={customer} area={area}/>
      {(area==='Resumen'||area==='Contactos')&&<section className="rounded-xl border bg-white p-5"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-semibold">Contactos</h2>{canWrite && customer.status!=='archived' && <button className={primary} onClick={()=>setContact('new')}>Añadir contacto</button>}</div><p className="mb-3 text-xs text-slate-500">Datos protegidos para esta sesión. No se guardan en el navegador.</p>
        {contacts?.items.map(c=><article key={c.id} className="flex flex-wrap items-center justify-between gap-3 border-t py-3"><div><h3 className="font-medium">{c.display_name}{c.is_primary?' · Principal':''}</h3><p className="text-sm text-slate-500">{c.job_title} · {c.email ?? 'Sin correo'} · {c.phone ?? 'Sin teléfono'}</p><Status value={c.status}/></div>{canWrite && <button className={control} onClick={()=>setContact(c)}>Editar contacto</button>}</article>)}
        {!contacts?.items.length && <p className="text-sm text-slate-500">Sin contactos en esta página.</p>}
        {contacts?.next_id && <button className={control} onClick={async()=>{try{setContacts(await repository.contacts(id,contacts.next_id))}catch(e){setError(safeMessage(e))}}}>Siguiente página de contactos</button>}
      </section>}</section>

      {edit && <CustomerEditor customer={customer} onClose={()=>setEdit(false)} onSaved={async()=>{setEdit(false);setMessage('Cliente guardado.');await load()}} onReload={async()=>{setEdit(false);await load();setMessage('Versión actual recargada. Abre el editor para revisar los cambios.')}}/>}
      {contact && <ContactEditor customerId={id} contact={contact==='new'?undefined:contact} onClose={()=>setContact(null)} onSaved={async()=>{setContact(null);setMessage('Contacto guardado.');await load()}} onReload={async()=>{setContact(null);await load()}}/>}
      <ConfirmDialog open={confirm} title={customer.status==='archived'?'Restaurar cliente':'Archivar cliente'} description="El cambio se guardará en la base de prueba local." loading={busy} error={error} onConfirm={archive} onCancel={()=>{if(!busy){setConfirm(false);archiveIntent.current=null}}}/>
    </>}
  </div>
}
function ContactEditor({customerId,contact,onClose,onSaved,onReload}:{customerId:string;contact?:ContactEditorV1;onClose:()=>void;onSaved:()=>void;onReload:()=>void}){
  const {repository}=useProduct()
  const [fields,setFields]=useState({display_name:contact?.display_name??'',job_title:contact?.job_title??'',email:contact?.email??'',phone:contact?.phone??'',is_primary:contact?.is_primary??false})
  const [busy,setBusy]=useState(false),[error,setError]=useState<unknown>(null)
  const [confirm,setConfirm]=useState(false)
  const intent=useRef<{execute:()=>Promise<ProductReceiptV1>}|null>(null)
  const locked=busy || (error instanceof ProductUiError && ['transport_uncertain','conflict'].includes(error.code))
  async function save(action:'save'|'state'='save'){if(busy || error instanceof ProductUiError && error.code==='conflict')return;setBusy(true);setError(null)
    if(!intent.current){const input={...fields,job_title:fields.job_title||null,email:fields.email||null,phone:fields.phone||null};const command=action==='state'&&contact?commandIntent(contact.status==='archived'?'contact.restore':'contact.archive',{id:contact.id,expected_version:contact.version}):contact?commandIntent('contact.update',{...input,id:contact.id,expected_version:contact.version}):commandIntent('contact.create',{...input,customer_id:customerId});intent.current={execute:()=>command.execute(repository)}}
    try{await intent.current.execute();intent.current=null;onSaved()}catch(e){setError(e);if(!(e instanceof ProductUiError && e.code==='transport_uncertain'))intent.current=null}finally{setBusy(false)}
  }
  return <Drawer title={contact?'Editar contacto':'Añadir contacto'} onClose={()=>{if(!busy)onClose()}}><form onSubmit={e=>{e.preventDefault();void save()}} className="space-y-4"><fieldset disabled={locked||contact?.status==='archived'} className="space-y-4">{(['display_name','job_title','email','phone'] as const).map(key=><label key={key} className="block text-sm">{{display_name:'Nombre del contacto',job_title:'Cargo',email:'Correo del contacto',phone:'Teléfono del contacto'}[key]}<input className={`${control} mt-1 w-full`} required={key==='display_name'} type={key==='email'?'email':'text'} maxLength={key==='email'?320:key==='phone'?40:160} value={fields[key]} onChange={e=>{setFields({...fields,[key]:e.target.value});setError(null);intent.current=null}}/></label>)}<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={fields.is_primary} onChange={e=>{setFields({...fields,is_primary:e.target.checked});setError(null);intent.current=null}}/>Contacto principal</label></fieldset>{!!error && <p role="alert" className="text-sm text-red-700">{safeMessage(error)}</p>}{error instanceof ProductUiError && error.code==='conflict' && <button type="button" onClick={onReload} className={control}>Recargar y revisar</button>}<button disabled={busy || contact?.status==='archived' || error instanceof ProductUiError && error.code==='conflict'} className={primary}>{busy?'Guardando…':error instanceof ProductUiError && error.code==='transport_uncertain'?'Reintentar la misma acción':'Guardar contacto'}</button></form>{contact&&<button type="button" className={control} disabled={locked} onClick={()=>setConfirm(true)}>{contact.status==='archived'?'Restaurar contacto':'Archivar contacto'}</button>}<ConfirmDialog open={confirm} title={contact?.status==='archived'?'Restaurar contacto':'Archivar contacto'} description="Se conservará el historial y se guardará el cambio de estado." loading={busy} error={error?safeMessage(error):undefined} onConfirm={()=>save('state')} onCancel={()=>{if(!busy)setConfirm(false)}}/></Drawer>
}
