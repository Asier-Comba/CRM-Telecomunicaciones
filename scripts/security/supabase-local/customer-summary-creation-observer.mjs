import {expect} from '@playwright/test'

/** Fixture-only SQL observer. Product reads and writes still use normal cookies.
 * Registers before the reviewed creation; never fabricates a response or count. */
export async function observeCustomerSummaryCreation({page,sql,customerId,kind}){
 const domains={sim:{table:'telecom_sims',field:'sims',label:'SIM/eSIM'},portability:{table:'telecom_portabilities',field:'portabilities',label:'Portabilidades'},case:{table:'service_cases',field:'cases',label:'Incidencias'},service:{table:'telecom_services',field:'services',label:'Servicios'}}
 if(!Object.hasOwn(domains,kind)||typeof customerId!=='string'||!/^[0-9a-f-]{36}$/.test(customerId))throw Error('INVENTORY_SUMMARY_FIXTURE_REFUSED')
 const domain=domains[kind]
 const count=()=>Number(sql(`select count(*) from public.${domain.table} where customer_id='${customerId}'`)),before=count()
 const overview=page.getByLabel('Resumen real del cliente',{exact:true}),kpi=overview.locator('dl > div').filter({has:page.getByText(domain.label,{exact:true})}).locator('dd')
 await expect(kpi).toHaveText(String(before))
 const pending=page.waitForResponse(response=>{try{const q=response.request().postDataJSON();return new URL(response.url()).pathname==='/api/telecom/reads/v1'&&q.operation==='customer360.summary'&&q.input.customer_id===customerId}catch{return false}})
 return async receiptId=>{
  if(typeof receiptId!=='string'||!/^[0-9a-f-]{36}$/.test(receiptId))throw Error('INVENTORY_SUMMARY_RECEIPT_REFUSED')
  const response=await pending,body=await response.json(),after=count()
  if(response.status()!==200||!body.ok||body.data?.record?.customer_id!==customerId||after!==before+1||body.data.record[domain.field]!==after)throw Error('INVENTORY_SUMMARY_NOT_AUTHORITATIVE')
  await expect(kpi).toHaveText(String(after));await expect(page.getByRole('tab',{name:domain.label,exact:true})).toHaveAttribute('aria-selected','true')
  if(sql(`select count(*) from public.${domain.table} where id='${receiptId}' and customer_id='${customerId}'`)!=='1')throw Error('INVENTORY_SUMMARY_RECEIPT_SCOPE_MISMATCH')
 }
}

/** Agenda counts are summary text, not one of the headline KPI cards. */
export async function observeCustomerAgendaCreation({page,sql,customerId,kind}){
 const domains={task:{table:'tasks',field:'tasks',label:'Tareas'},meeting:{table:'calendar_events',field:'meetings',label:'Reuniones'}}
 if(!Object.hasOwn(domains,kind)||typeof customerId!=='string'||!/^[0-9a-f-]{36}$/.test(customerId))throw Error('AGENDA_SUMMARY_FIXTURE_REFUSED')
 const domain=domains[kind],count=()=>Number(sql(`select count(*) from public.${domain.table} where customer_id='${customerId}'`)),before=count()
 const overview=page.getByLabel('Resumen real del cliente',{exact:true}),text=value=>new RegExp(domain.label+': '+value+'(?:\\D|$)')
 await expect(overview.getByText(text(before))).toHaveCount(1)
 const pending=page.waitForResponse(response=>{try{const q=response.request().postDataJSON();return new URL(response.url()).pathname==='/api/telecom/reads/v1'&&q.operation==='customer360.summary'&&q.input.customer_id===customerId}catch{return false}})
 return async receiptId=>{
  if(typeof receiptId!=='string'||!/^[0-9a-f-]{36}$/.test(receiptId))throw Error('AGENDA_SUMMARY_RECEIPT_REFUSED')
  const response=await pending,body=await response.json(),after=count()
  if(response.status()!==200||!body.ok||body.data?.record?.customer_id!==customerId||after!==before+1||body.data.record[domain.field]!==after)throw Error('AGENDA_SUMMARY_NOT_AUTHORITATIVE')
  await expect(overview.getByText(text(after))).toHaveCount(1);await expect(page.getByRole('tab',{name:'Agenda',exact:true})).toHaveAttribute('aria-selected','true')
  if(sql(`select count(*) from public.${domain.table} where id='${receiptId}' and customer_id='${customerId}'`)!=='1')throw Error('AGENDA_SUMMARY_RECEIPT_SCOPE_MISMATCH')
 }
}
