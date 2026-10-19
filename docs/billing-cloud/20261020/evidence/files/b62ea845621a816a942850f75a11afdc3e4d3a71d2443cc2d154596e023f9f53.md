# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: proposal-intent.spec.ts >> a late proposal cannot reopen a manually closed draft
- Location: tools\oier_billing_qa\proposal-intent.spec.ts:40:5

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('dialog', { name: 'Revisar borrador local', exact: true })
Expected: 0
Received: 1
Timeout:  4000ms

Call log:
  - Expect "toHaveCount" with timeout 4000ms
  - waiting for getByRole('dialog', { name: 'Revisar borrador local', exact: true })
    12 × locator resolved to 1 element
       - unexpected value "1"

```

# Test source

```ts
  1  | import {test,expect,type Page} from '@playwright/test'
  2  | import {startBillingFocusFixture} from '../../tests/e2e-preview/fixtures/billing-focus-server.cjs'
  3  | import {calculateBillingV1} from '../../src/lib/server/billing-runtime-v1'
  4  | 
  5  | // Existing component fixture; controlled HTTP, not hosted Auth/DB or persistence.
  6  | let fixture:Awaited<ReturnType<typeof startBillingFocusFixture>>
  7  | test.beforeAll(async()=>{fixture=await startBillingFocusFixture()})
  8  | test.afterAll(async()=>{await fixture?.close()})
  9  | async function pendingProposal(page:Page,refuse=false){
  10 |  let release=()=>{},held=false,done=false
  11 |  const gate=new Promise<void>(resolve=>release=resolve),commands:string[]=[],errors:string[]=[]
  12 |  const customer=fixture.invoice.customer_id
  13 |  page.on('pageerror',e=>errors.push(e.message))
  14 |  await page.route('**/api/**',async route=>{
  15 |   const request=route.request(),body=request.postDataJSON()
  16 |   if(new URL(request.url()).pathname.includes('/commands')){commands.push(body.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  17 |   if(body.operation==='global.search'){await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:[{kind:'customer',id:customer,customer_id:customer,label:'Bilbao Telecom Demo SL',status:'active'}]}}});return}
  18 |   if(body.operation==='invoice.list'){
  19 |    const invoice=Object.fromEntries(['currency','customer_id','due_on','id','issue_on','number','overdue','series','status','totals','version'].map(key=>[key,fixture.invoice[key as keyof typeof fixture.invoice]]))
  20 |    await route.fulfill({json:{ok:true,data:{contract_version:'billing.v1',operation:body.operation,items:[invoice],next_id:null}}});return
  21 |   }
  22 |   if(body.operation==='invoice.private_pdf_reference'){await route.fulfill({status:404,json:{ok:false,error:'not_found'}});return}
  23 |   if(body.operation==='invoice.propose'){
  24 |    held=true;await gate
  25 |    if(refuse)await route.fulfill({status:503,json:{ok:false,error:'unavailable'}})
  26 |    else await route.fulfill({json:{ok:true,data:{contract_version:'billing.v1',operation:body.operation,source:body.input.source,draft:body.input.draft,totals:calculateBillingV1(body.input.draft.lines),requires_review:true,saved:false}}})
  27 |    done=true;return
  28 |   }
  29 |   await route.continue()
  30 |  })
  31 |  await page.goto(fixture.url)
  32 |  await page.getByRole('textbox',{name:'Buscar cliente de factura',exact:true}).fill('Bilbao')
  33 |  await page.getByRole('button',{name:'Buscar cliente',exact:true}).click()
  34 |  await page.getByRole('combobox',{name:'Cliente para facturación',exact:true}).selectOption(customer)
  35 |  await page.getByRole('textbox',{name:'Descripción de la factura',exact:true}).fill('Factura para Bilbao Telecom Demo SL de 300 euros por soporte')
  36 |  await page.getByRole('button',{name:'Generar propuesta',exact:true}).click()
  37 |  await expect.poll(()=>held).toBe(true)
  38 |  return{customer,async complete(){release();await expect.poll(()=>done).toBe(true);await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))},assertNoEffects(){expect(commands).toEqual([]);expect(errors).toEqual([])},async close(){release();await page.unrouteAll({behavior:'wait'})}}
  39 | }
  40 | test('a late proposal cannot reopen a manually closed draft',async({page},info)=>{
  41 |  const r=await pendingProposal(page)
  42 |  try{
  43 |   await page.getByRole('button',{name:'Nuevo borrador local',exact:true}).click()
  44 |   await expect(page.getByRole('dialog',{name:'Revisar borrador local',exact:true})).toBeVisible()
  45 |   await page.keyboard.press('Escape')
  46 |   await expect(page.getByRole('dialog',{name:'Revisar borrador local',exact:true})).toHaveCount(0)
  47 |   await r.complete()
> 48 |   await expect(page.getByRole('dialog',{name:'Revisar borrador local',exact:true})).toHaveCount(0)
     |                                                                                     ^ Error: expect(locator).toHaveCount(expected) failed
  49 |   r.assertNoEffects();await page.screenshot({path:info.outputPath('closed-draft-retained.png')})
  50 |  }finally{await r.close()}
  51 | })
  52 | test('an old proposal error cannot contaminate a new manual draft',async({page},info)=>{
  53 |  const r=await pendingProposal(page,true)
  54 |  try{
  55 |   await page.getByRole('button',{name:'Nuevo borrador local',exact:true}).click()
  56 |   await page.getByLabel('Concepto 1',{exact:true}).fill('Cambio manual vigente')
  57 |   await r.complete()
  58 |   await expect(page.getByRole('alert').filter({hasText:'Esta función no está disponible ahora.'})).toHaveCount(0)
  59 |   await expect(page.getByLabel('Concepto 1',{exact:true})).toHaveValue('Cambio manual vigente')
  60 |   r.assertNoEffects();await page.getByLabel('Concepto 1',{exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('manual-draft-retained.png')})
  61 |  }finally{await r.close()}
  62 | })
  63 | test('a late proposal cannot replace the invoice opened afterwards',async({page},info)=>{
  64 |  const r=await pendingProposal(page)
  65 |  try{
  66 |   await page.getByRole('button',{name:'Abrir factura',exact:true}).click()
  67 |   const detail=page.locator(`section[data-invoice-detail-id="${r.customer}"]`)
  68 |   await expect(detail).toBeVisible()
  69 |   await r.complete()
  70 |   await expect(page.getByRole('dialog',{name:'Revisar borrador local',exact:true})).toHaveCount(0)
  71 |   await expect(detail).toBeVisible()
  72 |   r.assertNoEffects();await detail.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('current-invoice-retained.png')})
  73 |  }finally{await r.close()}
  74 | })
  75 | 
```