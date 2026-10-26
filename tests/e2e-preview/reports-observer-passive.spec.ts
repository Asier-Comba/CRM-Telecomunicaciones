import {expect,test} from '@playwright/test'
import {observeReports59} from '../../tools/asier_reports59/observe-initial-read.mjs'

test('passive report observer correlates DOM states without logging values or changing export',async({page})=>{
 const origin='http://127.0.0.1:31998',report={w2_ui_action_step:'unchanged',private_marker:'synthetic-private-marker'}
 await page.route(origin+'/**',route=>route.fulfill({contentType:'text/html',body:'<select aria-label="Periodo"><option value="month">Mes</option></select><select aria-label="Ámbito del informe"><option value="my">Personal</option></select><button disabled>Exportar resumen CSV</button><p>synthetic-private-marker</p>'}))
 const observer=observeReports59({page,origin,report})
 try{
  await observer.attachUi();observer.report.w2_ui_action_step='reports:initial_read';await page.goto(origin+'/reports')
  await expect.poll(()=>observer.snapshot().events.some(e=>e.kind==='ui_state'&&e.button==='disabled'&&e.view==='loading')).toBe(true)
  await page.evaluate(()=>{document.querySelector('button')!.disabled=false;const count=document.createElement('dd');count.dataset.reportCount='customers';count.textContent='999999-private-value';document.body.append(count)})
  await expect.poll(()=>observer.snapshot().events.some(e=>e.kind==='ui_state'&&e.button==='enabled'&&e.view==='loaded')).toBe(true)
  const serialized=JSON.stringify(observer.snapshot());expect(serialized).not.toContain('synthetic-private-marker');expect(serialized).not.toContain('999999-private-value');expect(report.w2_ui_action_step).toBe('reports:initial_read')
  await expect(page.getByRole('button',{name:'Exportar resumen CSV',exact:true})).toBeEnabled()
 }finally{await observer.detachUi();observer.stop()}
})

test('detached observer cannot turn a disabled export into a successful check',async({page})=>{
 const origin='http://127.0.0.1:31998'
 await page.route(origin+'/**',route=>route.fulfill({contentType:'text/html',body:'<button disabled>Exportar resumen CSV</button>'}))
 const observer=observeReports59({page,origin})
 await observer.attachUi();await page.goto(origin+'/reports');await observer.detachUi();const snapshot=observer.stop()
 await expect(page.getByRole('button',{name:'Exportar resumen CSV',exact:true})).toBeDisabled();expect(snapshot.reads).toEqual([])
})
