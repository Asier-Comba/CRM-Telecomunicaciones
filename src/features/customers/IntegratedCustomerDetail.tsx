'use client'
import {AssignedCommercial} from '@/features/product/integration/AssignedCommercial'
import {Customer360Overview} from './Customer360Overview'
import {customerCollectionIdentity,customerName,type CustomerIdentity} from './customer-identity'
import type {ContactRowV1,TelecomCollectionPageV1} from '@/lib/contracts/telecom-collections-v1'
import {OriginProof} from '@/features/product/integration/OriginProof'
import Link from 'next/link'
import {SensitiveReveal} from './SensitiveReveal'
import { CustomerIntegratedPanels, customerAreas } from './CustomerIntegratedPanels'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CustomerEditor } from './CustomerEditor'
import { useProduct } from '@/features/product/integration/Provider'
import { commandIntent, safeMessage, ProductUiError } from '@/features/product/integration/repository'
import { PreviewNotice, control, primary, Status, Drawer, Tabs } from '@/features/product/ui'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { ProductReceiptV1 } from '@/lib/contracts/product-v1'

export function IntegratedCustomerDetail({ id }: { id: string }) {
  const { repository, role } = useProduct()
  const [customer,setCustomer] = useState<CustomerIdentity|null>(null), [contacts,setContacts] = useState<TelecomCollectionPageV1<'contact.list'>|null>(null)
  const [error,setError] = useState(''), [edit,setEdit] = useState(false), [contact,setContact] = useState<ContactRowV1|'new'|null>(null)
  const [confirm,setConfirm] = useState(false), [busy,setBusy] = useState(false), [message,setMessage] = useState('')
  const [contactCursors,setContactCursors]=useState<string[]>([]),[contactRevision,setContactRevision]=useState(0),[contactsError,setContactsError]=useState('')
  const [area,setArea]=useState('Resumen')
  const [inventoryRevision,setInventoryRevision]=useState(0)
  const archiveIntent = useRef<{execute:()=>Promise<ProductReceiptV1>}|null>(null)
  const canWrite = role !== null && role !== 'viewer'
  const readCustomer=useCallback(()=>role==='viewer'?customerCollectionIdentity(repository,id):repository.customer(id),[repository,id,role])
  const load = useCallback(async()=>{
    setError('')
    try {setCustomer(await readCustomer());setContacts(null);setContactCursors([]);setContactRevision(v=>v+1)}
    catch(e){setCustomer(null);setContacts(null);setError(safeMessage(e))}
  },[readCustomer])
  useEffect(()=>{let active=true; void (async()=>{try {const c=await readCustomer();if(active){setCustomer(c);setError('')}}catch(e){if(active)setError(safeMessage(e))}})();return()=>{active=false}},[readCustomer])
  useEffect(()=>{let active=true;void repository.collection('contact.list',{customer_id:id,limit:20,sort:'id_asc',...(contactCursors.length?{after_id:contactCursors.at(-1)}:{})}).then(v=>{if(active){setContacts(v);setContactsError('')}}).catch(e=>{if(active){setContacts(null);setContactsError(safeMessage(e))}});return()=>{active=false}},[repository,id,contactCursors,contactRevision])
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
    {error && !confirm && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    {!customer ? <section className="rounded-xl border bg-white p-5"><p>{error?'Cliente no disponible':'Cargando cliente…'}</p><button className={control} onClick={load}>Volver a consultar</button></section> : <>
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-5"><div><Status value={customer.status}/><h1 className="mt-2 text-2xl font-bold">{customerName(customer)}</h1><p className="text-sm text-slate-500">{'trade_name'in customer&&customer.trade_name?customer.trade_name+' · ':''}Origen: {{manual:'Manual',import:'Importado',integration:'Integración'}[customer.source]}</p><p className="mt-2 text-sm text-slate-600">{{lead:'Lead',prospect:'Prospecto',customer:'Cliente',former_customer:'Antiguo cliente'}[customer.lifecycle]} · <AssignedCommercial id={customer.assigned_user_id}/></p><OriginProof kind="customer" id={customer.id}/></div><div className="flex gap-2">{canWrite && customer.source==='manual' && <>{customer.status!=='archived'&&<button className={control} onClick={()=>setEdit(true)}>Editar cliente</button>}<button className={control} onClick={()=>{archiveIntent.current=null;setError('');setConfirm(true)}}>{customer.status==='archived'?'Restaurar cliente':'Archivar cliente'}</button></>}</div></header>
      <Customer360Overview key={contactRevision+':'+inventoryRevision} customerId={id}/><Tabs prefix="customer360-" items={customerAreas} value={area} onChange={setArea}/><section tabIndex={0} role="tabpanel" id={`customer360-panel-${area}`} aria-labelledby={`customer360-tab-${area}`} className="space-y-4"><CustomerIntegratedPanels key={area+':'+contactRevision} customer={customer} area={area} onRecordCreated={()=>setInventoryRevision(v=>v+1)}/>
      {(area==='Resumen'||area==='Contactos')&&<section className="rounded-xl border bg-white p-5"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-semibold">Contactos</h2>{canWrite && customer.status!=='archived' && <button className={primary} onClick={()=>setContact('new')}>Añadir contacto</button>}</div><p className="mb-3 text-xs text-slate-500">Datos protegidos para esta sesión. No se guardan en el navegador.</p>
        {contacts?.items.map(c=><article key={c.id} className="flex flex-wrap items-center justify-between gap-3 border-t py-3"><div><h3 className="font-medium">{c.display_name}{c.is_primary?' · Principal':''}</h3><p className="text-sm text-slate-500">{c.job_title??'Cargo no registrado'} · {c.has_email?'Correo registrado':'Sin correo'} · {c.has_phone?'Teléfono registrado':'Sin teléfono'}</p><Status value={c.status}/><OriginProof kind="contact" id={c.id}/></div><div className="flex flex-wrap gap-2">{c.status==='active'&&customer.status==='active'&&<><SensitiveReveal entityKind="contact" entityId={c.id} field="email"/><SensitiveReveal entityKind="contact" entityId={c.id} field="phone"/></>}{canWrite && <button className={control} onClick={()=>setContact(c)}>Editar contacto</button>}</div></article>)}
        {contactsError&&<p role="alert" className="text-sm text-red-700">{contactsError}</p>}{!contacts&&!contactsError&&<p role="status" className="text-sm text-slate-500">Cargando contactos autorizados…</p>}
        {contacts&&!contacts.items.length && <p className="text-sm text-slate-500">Sin contactos en esta página.</p>}
        <div className="mt-4 flex flex-wrap items-center gap-3"><button className={control} disabled={!contacts||!contactCursors.length} onClick={()=>{setContacts(null);setContactsError('');setContactCursors(v=>v.slice(0,-1))}}>Página anterior de contactos</button><span className="text-xs text-slate-500">Página {contactCursors.length+1} · Hasta 20 contactos</span><button className={control} disabled={!contacts?.next_id} onClick={()=>{if(contacts?.next_id){setContactCursors(v=>[...v,contacts.next_id!]);setContacts(null);setContactsError('')}}}>Siguiente página de contactos</button></div>
      </section>}</section>

      {edit && !('display_name'in customer) && <CustomerEditor customer={customer} onClose={()=>setEdit(false)} onSaved={async()=>{setEdit(false);setMessage('Cliente guardado.');await load()}} onReload={async()=>{setEdit(false);await load();setMessage('Versión actual recargada. Abre el editor para revisar los cambios.')}}/>}
      {contact && <ContactEditor customerId={id} contact={contact==='new'?undefined:contact} onClose={()=>setContact(null)} onSaved={async()=>{setContact(null);setMessage('Contacto guardado.');await load()}} onReload={async()=>{setContact(null);await load()}}/>}
      <ConfirmDialog open={confirm} title={customer.status==='archived'?'Restaurar cliente':'Archivar cliente'} description="El cambio se guardará en la base de prueba local." loading={busy} error={error} onConfirm={archive} onCancel={()=>{if(!busy){setConfirm(false);archiveIntent.current=null}}}/>
    </>}
  </div>
}
function ContactEditor({customerId,contact,onClose,onSaved,onReload}:{customerId:string;contact?:ContactRowV1;onClose:()=>void;onSaved:()=>void;onReload:()=>void}){
  const {repository}=useProduct()
  const [fields,setFields]=useState({display_name:contact?.display_name??'',job_title:contact?.job_title??'',email:'',phone:'',is_primary:contact?.is_primary??false})
  const [busy,setBusy]=useState(false),[error,setError]=useState<unknown>(null)
  const [confirm,setConfirm]=useState(false),[methods,setMethods]=useState(!contact)
  const intent=useRef<{execute:()=>Promise<ProductReceiptV1>}|null>(null)
  const locked=busy || (error instanceof ProductUiError && ['transport_uncertain','conflict'].includes(error.code))
  async function save(action:'save'|'state'='save'){if(busy || error instanceof ProductUiError && error.code==='conflict')return;setBusy(true);setError(null)
    if(!intent.current){const input={display_name:fields.display_name,job_title:fields.job_title||null,is_primary:fields.is_primary,...(methods?{email:fields.email||null,phone:fields.phone||null}:{})};const command=action==='state'&&contact?commandIntent(contact.status==='archived'?'contact.restore':'contact.archive',{id:contact.id,expected_version:contact.version}):contact?commandIntent('contact.update',{...input,id:contact.id,expected_version:contact.version}):commandIntent('contact.create',{...input,customer_id:customerId});intent.current={execute:()=>command.execute(repository)}}
    try{await intent.current.execute();intent.current=null;onSaved()}catch(e){setError(e);if(!(e instanceof ProductUiError && e.code==='transport_uncertain'))intent.current=null}finally{setBusy(false)}
  }
  return <Drawer title={contact?'Editar contacto':'Añadir contacto'} onClose={()=>{if(!busy)onClose()}}><form onSubmit={e=>{e.preventDefault();void save()}} className="space-y-4"><fieldset disabled={locked||contact?.status==='archived'} className="space-y-4">{(['display_name','job_title','email','phone'] as const).filter(key=>methods||key==='display_name'||key==='job_title').map(key=><label key={key} className="block text-sm">{{display_name:'Nombre del contacto',job_title:'Cargo',email:'Correo del contacto',phone:'Teléfono del contacto'}[key]}<input className={`${control} mt-1 w-full`} required={key==='display_name'} type={key==='email'?'email':'text'} maxLength={key==='email'?320:key==='phone'?40:160} value={fields[key]} onChange={e=>{setFields({...fields,[key]:e.target.value});setError(null);intent.current=null}}/></label>)}<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={fields.is_primary} onChange={e=>{setFields({...fields,is_primary:e.target.checked});setError(null);intent.current=null}}/>Contacto principal</label>{contact&&!methods&&<button type="button" className={control} onClick={()=>setMethods(true)}>Cambiar métodos de contacto</button>}{contact&&methods&&<p className="text-xs text-amber-800">Los valores introducidos sustituirán los métodos existentes; un campo vacío los eliminará. No se han consultado sus valores actuales.</p>}</fieldset>{!!error && !confirm && <p role="alert" className="text-sm text-red-700">{safeMessage(error)}</p>}{error instanceof ProductUiError && error.code==='conflict' && <button type="button" onClick={onReload} className={control}>Recargar y revisar</button>}<button disabled={busy || contact?.status==='archived' || error instanceof ProductUiError && error.code==='conflict'} className={primary}>{busy?'Guardando…':error instanceof ProductUiError && error.code==='transport_uncertain'?'Reintentar la misma acción':'Guardar contacto'}</button></form>{contact&&<button type="button" className={control} disabled={locked} onClick={()=>setConfirm(true)}>{contact.status==='archived'?'Restaurar contacto':'Archivar contacto'}</button>}<ConfirmDialog open={confirm} title={contact?.status==='archived'?'Restaurar contacto':'Archivar contacto'} description="Se conservará el historial y se guardará el cambio de estado." loading={busy} error={error?safeMessage(error):undefined} onConfirm={()=>save('state')} onCancel={()=>{if(!busy)setConfirm(false)}}/></Drawer>
}
