import {expect,type Page,type Route} from '@playwright/test'
import {startOpportunityInvoiceFixture} from './opportunity-invoice-server.cjs'

export const ids={customer:'10000000-0000-4000-8000-000000000001',stage:'20000000-0000-4000-8000-000000000001',opportunity:'30000000-0000-4000-8000-000000000001',contract:'60000000-0000-4000-8000-000000000001',service:'70000000-0000-4000-8000-000000000001',invoice:'80000000-0000-4000-8000-000000000001',previous:'80000000-0000-4000-8000-000000000002',foreign:'90000000-0000-4000-8000-000000000001'}
const profile={legal_name:'Synthetic63 Fiscal Company',tax_id:'SYNTHETIC63',address:'Synthetic Street 63',postal_code:'48001',city:'Bilbao',region:'Bizkaia',country:'ES'}
type Input=Record<string,unknown>
export async function opportunitySession(page:Page,width:number,mode='normal',role='owner'){
 const fixture=await startOpportunityInvoiceFixture(),commands:{operation:string;input:Input}[]=[],reads:{operation:string;input:Input}[]=[],held:Route[]=[],heldInvoices:Route[]=[],heldPrevious:Route[]=[]
 let version=1,fiscalVersion=1,customerFiscal=mode!=='missing_fiscal',denied=mode==='denied',invoiceCustomer=ids.customer,invoiceOpportunity=ids.opportunity,invoiceCreated=false,firstCreate=true,failReadback=mode==='readback',hold=mode==='late',badService=mode==='bad_service'
 const opportunity=()=>({id:ids.opportunity,version,title:'Synthetic63 opportunity',status:'open',customer_id:ids.customer,stage_id:ids.stage,owner_user_id:null,amount_minor:120000,currency:'EUR',next_follow_up_at:null,expected_close_date:null,next_action:null,source:'manual',links:[{kind:'contract',id:ids.contract},{kind:'service',id:ids.service}],history:[],history_partial:false})
 const contract=()=>({id:ids.contract,version:1,status:'active',source:'manual',customer_id:ids.customer,operator_id:ids.stage,plan_version_id:null,start_date:'2026-10-26',signed_date:'2026-10-26',end_date:null,assigned_user_id:null})
 const service=()=>({id:ids.service,version:1,status:'active',source:'manual',customer_id:badService?ids.foreign:ids.customer,contract_id:ids.contract,operator_id:ids.stage,plan_version_id:null,service_kind:'mobile',display_name:'Synthetic63 linked service',activated_on:'2026-10-26',ended_on:null,status_effective_on:'2026-10-26'})
 const customer=()=>({contract_version:'product.v1',id:ids.customer,version:1,account_kind:'legal_entity',legal_name:'Synthetic63 Company',trade_name:null,lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null})
 const configuration=(customerId:unknown)=>({contract_version:'billing.v1',operation:'configuration.get',issuer:{version:fiscalVersion,profile,currency:'EUR',default_series:'A'},customer:customerId&&customerFiscal?{version:fiscalVersion,profile}:null})
 const invoice=()=>({id:ids.invoice,version:1,status:'draft',customer_id:invoiceCustomer,issue_on:'2026-10-26',due_on:null,series:'A',currency:'EUR',number:null,totals:{subtotal_minor:30000,tax_minor:6300,withholding_minor:0,total_minor:36300},overdue:false,lines:[{description:'Synthetic63 connectivity',quantity_milli:1000,unit_price_minor:30000,discount_bps:0,tax_bps:2100,withholding_bps:0}],notes:null,contract_id:ids.contract,service_id:ids.service,opportunity_id:invoiceOpportunity,issuer:{...profile,currency:'EUR',default_series:'A'},customer_fiscal:profile,issued_at:null,paid_at:null,fx:null})
 const fulfill=(route:Route,data:unknown)=>route.fulfill({json:{ok:true,data}})
 const deny=(route:Route)=>route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 await page.route('**/api/**',async route=>{
  const {operation,input}=route.request().postDataJSON() as {operation:string;input:Input}
  if(route.request().url().endsWith('/commands')){
   commands.push({operation,input})
   if(operation==='customer_fiscal.set'){customerFiscal=true;fiscalVersion=Number(input.expected_version)+1;await route.fulfill({json:{ok:true,receipt:{contract_version:'billing.v1',operation,command_id:input.command_id,id:ids.customer,version:fiscalVersion,status:'profile',number:null}}});return}
   if(operation!=='invoice.create_draft'||denied){await deny(route);return}
   invoiceCreated=true
   if(mode==='uncertain'&&firstCreate){firstCreate=false;await route.abort('failed');return}
   await route.fulfill({json:{ok:true,receipt:{contract_version:'billing.v1',operation,command_id:input.command_id,id:ids.invoice,version:1,status:'draft',number:null}}});return
  }
  reads.push({operation,input})
  if(operation==='work.get'){
   if(denied){await deny(route);return}
   if(hold){held.push(route);return}
   await fulfill(route,{contract_version:'product.v1',kind:'opportunity',record:opportunity()});return
  }
  if(operation==='portfolio.get'){if(denied){await deny(route);return}await fulfill(route,{contract_version:'portfolio.v1',kind:input.kind,record:input.kind==='service'?service():contract()});return}
  if(operation==='customer.editor'){await fulfill(route,customer());return}
  if(operation==='configuration.get'){await fulfill(route,configuration(input.customer_id));return}
  if(operation==='invoice.list'){const r=invoice(),summary=Object.fromEntries(['id','version','status','customer_id','issue_on','due_on','series','currency','number','totals','overdue'].map(k=>[k,r[k as keyof typeof r]]));await fulfill(route,{contract_version:'billing.v1',operation,items:mode==='late_previous'?[{...summary,id:ids.previous}]:[],next_id:null});return}
  if(operation==='invoice.financial_summary'){await fulfill(route,{contract_version:'billing.v1',operation,period:'month',from:'2026-10-01',to:'2026-11-01',as_of:'2026-10-26',currencies:[]});return}
  if(operation==='invoice.get'){
   if(mode==='late_previous'&&input.id===ids.previous){heldPrevious.push(route);return}
   if(mode==='late_readback'&&invoiceCreated){heldInvoices.push(route);return}
   if(denied){await deny(route);return}
   if(invoiceCreated&&failReadback){failReadback=false;await route.fulfill({status:503,json:{ok:false,error:'unavailable'}});return}
   await fulfill(route,{contract_version:'billing.v1',operation,invoice:invoice()});return
  }
  if(operation==='opportunity.stages'){await fulfill(route,{contract_version:'product.v1',items:[{id:ids.stage,code:'new',display_name:'Nueva',position:0,outcome:null,status:'active'}],next_id:null});return}
  if(['contract.list','service.list','opportunity.list'].includes(operation)){
   let row:Input
   if(operation==='contract.list'){const {signed_date:ignored,...rest}=contract();void ignored;row=rest}
   else if(operation==='service.list'){const {status_effective_on:ignored,...rest}=service();void ignored;row=rest}
   else {const r=opportunity();row={id:r.id,version:r.version,customer_id:r.customer_id,title:r.title,status:r.status,stage_id:r.stage_id,owner_user_id:null,currency:'EUR',amount_minor:'120000',expected_close_date:null,next_follow_up_at:null,has_next_action:false,source:'manual',links:r.links}}
   await fulfill(route,{contract_version:'telecom.collections.v1',operation,items:!input.after_id||String(row.id)>String(input.after_id)?[row]:[],next_id:null});return
  }
  if(['assignee.list','customer.list'].includes(operation)){await fulfill(route,{contract_version:'telecom.collections.v1',operation,items:[],next_id:null});return}
  await route.fulfill({status:404,json:{ok:false,error:'not_found'}})
 })
 await page.setViewportSize({width,height:960})
 const url=fixture.url+'/facturacion?opportunity='+ids.opportunity+'&role='+role
 await page.goto(url)
 const panel=()=>page.getByRole('region',{name:'Preparación desde oportunidad',exact:true})
 const ready=async()=>{await expect(panel().getByText('Synthetic63 Company',{exact:true})).toBeVisible();await expect(page.getByLabel('Confirmo los datos fiscales de esta operación',{exact:true})).toBeEnabled()}
 const prepare=async()=>{await ready();await page.getByLabel('Confirmo los datos fiscales de esta operación',{exact:true}).check();await page.getByRole('button',{name:'Preparar borrador de esta oportunidad',exact:true}).click();await expect(page.getByRole('dialog',{name:'Revisar borrador',exact:true})).toBeVisible()}
 const fill=async()=>{await page.getByLabel('Concepto 1',{exact:true}).fill('Synthetic63 connectivity');await page.getByLabel('Precio 1',{exact:true}).fill('300');await page.getByLabel('IVA % 1',{exact:true}).fill('21');await page.getByLabel('Fecha de emisión',{exact:true}).fill('2026-10-26');for(const kind of ['contractId','serviceId','opportunityId'])await expect(page.locator(`[data-invoice-relation-current="${kind}"]`)).toBeVisible();await page.getByRole('dialog',{name:'Revisar borrador',exact:true}).getByRole('checkbox').check()}
 const save=()=>page.getByRole('button',{name:'Guardar borrador',exact:true}).click()
 return{commands,reads,held,heldInvoices,heldPrevious,panel,url,ready,prepare,fill,save,invoice,
  change(){version++},changeFiscal(){fiscalVersion++},deny(){denied=true},badService(){badService=true},mismatch(kind:string){if(kind==='customer')invoiceCustomer=ids.foreign;else invoiceOpportunity=ids.foreign},
  async release(){hold=false;for(const route of held)await fulfill(route,{contract_version:'product.v1',kind:'opportunity',record:opportunity()})},
  async releaseInvoices(){for(const route of heldInvoices)await fulfill(route,{contract_version:'billing.v1',operation:'invoice.get',invoice:invoice()})},
  async releasePrevious(){for(const route of heldPrevious)await fulfill(route,{contract_version:'billing.v1',operation:'invoice.get',invoice:{...invoice(),id:ids.previous,opportunity_id:null}})},
  async finish(){await page.close();await fixture.close()}}
}
