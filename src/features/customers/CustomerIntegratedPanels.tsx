'use client'
import Link from 'next/link'
import {EquipmentInventory} from '@/features/equipment/EquipmentInventory'
import {SensitiveReveal} from './SensitiveReveal'
import {CustomerDomainPages,isCustomerDomain} from './CustomerDomainPages'
import {customerName,type CustomerIdentity} from './customer-identity'
import { IntegratedCalendar } from '@/features/calendar/IntegratedCalendar'
import {CustomerDocuments} from './CustomerDocuments'
import {CustomerCommunications} from './CustomerCommunications'
import { IntegratedBilling } from '@/features/billing/IntegratedBilling'
import { control, Status } from '@/features/product/ui'

export const customerAreas=['Resumen','Empresa','Contactos','Contratos','Servicios','Líneas','SIM/eSIM','Portabilidades','Renovaciones','Permanencias','Oportunidades','Tareas','Reuniones','Incidencias','Equipos','Agenda','Documentos','Facturación','Actividad','Comunicaciones']
export function CustomerIntegratedPanels({customer,area}:{customer:CustomerIdentity;area:string}){
 if(area==='Equipos')return <EquipmentInventory customerId={customer.id} createAllowed={customer.status==='active'}/>
 if(isCustomerDomain(area))return <CustomerDomainPages key={area} area={area} customerId={customer.id}/>
 if(area==='Agenda')return <IntegratedCalendar customerId={customer.id}/>
 if(area==='Documentos')return <CustomerDocuments customerId={customer.id}/>
 if(area==='Facturación')return <IntegratedBilling initialCustomerId={customer.id}/>
 if(area==='Contactos')return null
 if(area==='Comunicaciones')return <CustomerCommunications customerId={customer.id}/>
 if(area==='Empresa')return <section className="rounded-xl border bg-white p-5"><h2 className="font-semibold">Datos de empresa</h2>{customer.status==='active'&&<div className="mt-3"><SensitiveReveal entityKind="customer" entityId={customer.id} field="fiscal_id"/></div>}<dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">{'legal_name'in customer?'Razón social':'Identidad comercial'}</dt><dd>{customerName(customer)}</dd></div><div><dt className="text-slate-500">Nombre comercial</dt><dd>{'trade_name'in customer?customer.trade_name??'Sin nombre comercial':'Identidad comercial visible'}</dd></div><div><dt className="text-slate-500">Relación comercial</dt><dd>{{lead:'Lead',prospect:'Prospecto',customer:'Cliente',former_customer:'Antiguo cliente'}[customer.lifecycle]}</dd></div><div><dt className="text-slate-500">Estado</dt><dd><Status value={customer.status}/></dd></div><div><dt className="text-slate-500">Origen</dt><dd>{{manual:'Manual',import:'Importado',integration:'Integración'}[customer.source]}</dd></div><div><dt className="text-slate-500">Responsable</dt><dd>{customer.assigned_user_id?'Responsable asignado':'Sin asignar'}</dd></div></dl></section>
 if(area==='Resumen')return <section className="rounded-xl border bg-white p-5"><h2 className="font-semibold">Customer 360</h2><p className="mt-2 text-sm text-slate-500">El resumen superior contiene los recuentos completos del cliente. Cada pestaña consulta su colección independiente; tareas y reuniones incluyen registros sin fecha y estados históricos. Las versiones de tarifa mostradas son las vendidas, sin sustituirlas por versiones actuales.</p><div className="mt-3 flex flex-wrap gap-2"><Link className={control} href={`/documents?customer=${customer.id}`}>Documentos del cliente</Link><Link className={control} href={`/facturacion?customer=${customer.id}`}>Facturación del cliente</Link><Link className={control} href={`/assistant?customer=${customer.id}`}>Consultar este cliente</Link><Link className={control} href={`/assistant?customer=${customer.id}&intent=invoice`}>Crear factura con IA</Link></div></section>
 return <section className="rounded-xl border bg-white p-5"><h2 className="font-semibold">{area}</h2><p className="mt-2 text-sm text-slate-500">{['Contratos','Servicios','Líneas','Oportunidades'].includes(area)?'La colección completa vinculada al cliente requiere un servicio de lectura con alcance y paginación. La búsqueda global disponible tiene cobertura limitada y no sustituye este inventario.':area==='Actividad'?'El historial transversal del cliente aún no dispone de lectura normal aceptada.':'El servicio de comunicaciones aún no está disponible; no se ejecutan envíos.'}</p>{['Contratos','Servicios','Líneas','Oportunidades'].includes(area)&&<Link className={`${control} mt-3 inline-flex`} href={area==='Oportunidades'?'/opportunities':'/portfolio'}>Consultar en el módulo</Link>}</section>
}
