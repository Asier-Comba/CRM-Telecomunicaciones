import {expect} from '@playwright/test'
import {resolve} from 'node:path'
import {parseImportJobListV1,parseImportJobListResultV1} from '../../../src/lib/server/importjob-runtime-v1.ts'

const states={uploaded:'Cargado',mapping:'Asignación de columnas',validating:'En validación',ready:'Preparado',applying:'En aplicación',completed:'Completado',failed:'Fallido',cancelled:'Cancelado'}
const kinds={customers:'Clientes',contacts:'Contactos',operators:'Operadores',plans:'Tarifas',plan_versions:'Versiones de tarifa',contracts:'Contratos',services:'Servicios',lines:'Líneas',entitlements:'Prestaciones',bundle_components:'Componentes de paquete',renewals:'Renovaciones',permanences:'Permanencias',sims:'SIM/eSIM',portabilities:'Portabilidades',cases:'Incidencias',service_locations:'Ubicaciones de servicio',equipment:'Equipos',protected_identifiers:'Identificadores protegidos'}

/** Ordinary current read only; DTO admission precedes per-row presentation checks. */
export async function importCurrentRowsBrowser({page,origin,width,screenshotDir,report,requiredJob}){
 const step=name=>{if(report)report.w2_ui_action_step='layout:portfolio:'+width+':import_current:'+name}
 const panel=page.getByRole('region',{name:'Gestión de importaciones',exact:true})
 step('request');await expect(panel).toHaveCount(1)
 await expect(panel.getByLabel('Estado de importaciones',{exact:true})).toHaveValue('')
 const [request]=await Promise.all([
  page.waitForRequest(request=>{
   if(request.method()!=='POST'||request.url()!==origin+'/api/import/v1')return false
   try{const body=request.postDataJSON();return body&&Object.keys(body).sort().join(',')==='input,operation'&&body.operation==='importjob.list'&&body.input&&Object.keys(body.input).join(',')==='limit'&&body.input.limit===20&&!!parseImportJobListV1(body.input)}catch{return false}
  }),
  panel.getByRole('button',{name:'Actualizar importaciones',exact:true}).click(),
 ])
 step('response');const response=await request.response()
 if(!response||response.status()!==200)throw Error('IMPORT_CURRENT_HTTP_REFUSED')
 let body;try{body=await response.json()}catch{throw Error('IMPORT_CURRENT_BODY_UNAVAILABLE')}
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).sort().join(',')!=='data,ok'||body.ok!==true)throw Error('IMPORT_CURRENT_ENVELOPE_INVALID')
 const value=parseImportJobListResultV1({limit:20},body.data)
 if(!value)throw Error('IMPORT_CURRENT_DTO_INVALID')
 if(!value.items.some(row=>row.id===requiredJob.id&&row.kind===requiredJob.kind&&row.status===requiredJob.status))throw Error('IMPORT_CURRENT_REQUIRED_JOB_MISMATCH')
 step('rows');await expect(panel.getByRole('button',{name:'Actualizar importaciones',exact:true})).toBeEnabled()
 await expect(panel.locator('article[data-import-id]')).toHaveCount(value.items.length)
 for(const record of value.items){
  const row=panel.locator(`article[data-import-id="${record.id}"]`)
  await row.scrollIntoViewIfNeeded()
  await expect(row.getByText('Trabajo '+record.id.slice(0,8)+' · '+kinds[record.kind],{exact:true})).toBeInViewport({ratio:1})
  await expect(row.getByText(states[record.status],{exact:true})).toBeInViewport({ratio:1})
  await expect(row.getByText(record.total_rows+' filas',{exact:true})).toBeInViewport({ratio:1})
  await expect(row.getByRole('button',{name:'Ver trabajo',exact:true})).toBeInViewport({ratio:1})
  if(!await row.evaluate(el=>{const r=el.getBoundingClientRect(),m=el.closest('main').getBoundingClientRect();return r.left>=m.left-1&&r.right<=m.right+1&&r.top>=m.top-1&&r.bottom<=m.bottom+1}))throw Error('IMPORT_CURRENT_ROW_OUTSIDE_MAIN')
 }
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('IMPORT_CURRENT_HORIZONTAL_OVERFLOW')
 step('capture');await panel.scrollIntoViewIfNeeded()
 await page.screenshot({path:resolve(screenshotDir,'import-current-rows-'+width+'.png'),fullPage:true})
 return {rows:value.items.length}
}
