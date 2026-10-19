# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: proposal-context.spec.ts >> old proposal is retired after customer removal
- Location: tools\oier_billing_qa\proposal-context.spec.ts:55:32

# Error details

```
Test timeout of 45000ms exceeded.
```

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByLabel('Cliente de factura', { exact: true })
Expected: 0
Received: undefined

```

```
Error: page.unrouteAll: Target page, context or browser has been closed
```

# Test source

```ts
  1  | import {test,expect,type Page} from '@playwright/test'
  2  | import {startBillingFocusFixture} from '../../tests/e2e-preview/fixtures/billing-focus-server.cjs'
  3  | import {calculateBillingV1} from '../../src/lib/server/billing-runtime-v1'
  4  | import type {BillingProposalInputV1} from '../../src/lib/contracts/billing-v1'
  5  | 
  6  | // Read-only controlled HTTP against the existing real component fixture.
  7  | const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000003'
  8  | const clients=[{id:a,name:'Bilbao Telecom Demo SL'},{id:b,name:'Bilbao Redes Demo SL'}]
  9  | const prompt=(index:number)=>`Factura para ${clients[index].name} de 300 euros por soporte`
  10 | let fixture:Awaited<ReturnType<typeof startBillingFocusFixture>>
  11 | test.beforeAll(async()=>{fixture=await startBillingFocusFixture()})
  12 | test.afterAll(async()=>{await fixture?.close()})
  13 | async function scenario(page:Page,oldError=false){
  14 |  let release=()=>{},held=false,done=false
  15 |  const gate=new Promise<void>(resolve=>release=resolve),commands:string[]=[],proposals:BillingProposalInputV1[]=[]
  16 |  const pageErrors:string[]=[];page.on('pageerror',e=>pageErrors.push(e.message))
  17 |  await page.route('**/api/**',async route=>{
  18 |   const body=route.request().postDataJSON()
  19 |   if(new URL(route.request().url()).pathname.includes('/commands')){commands.push(body.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  20 |   if(body.operation==='global.search'){await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:clients.map(c=>({kind:'customer',id:c.id,customer_id:c.id,label:c.name,status:'active'}))}}});return}
  21 |   if(body.operation==='invoice.list'){await route.fulfill({json:{ok:true,data:{contract_version:'billing.v1',operation:body.operation,items:[],next_id:null}}});return}
  22 |   if(body.operation==='invoice.private_pdf_reference'){await route.fulfill({status:404,json:{ok:false,error:'not_found'}});return}
  23 |   if(body.operation==='invoice.propose'){
  24 |    const input=body.input as BillingProposalInputV1;proposals.push(input)
  25 |    const first=proposals.length===1
  26 |    if(first){held=true;await gate}
  27 |    if(first&&oldError)await route.fulfill({status:503,json:{ok:false,error:'unavailable'}})
  28 |    else await route.fulfill({json:{ok:true,data:{contract_version:'billing.v1',operation:body.operation,source:input.source,draft:input.draft,totals:calculateBillingV1(input.draft.lines),requires_review:true,saved:false}}})
  29 |    if(first)done=true
  30 |    return
  31 |   }
  32 |   await route.continue()
  33 |  })
  34 |  await page.goto(fixture.url)
  35 |  await page.getByRole('textbox',{name:'Buscar cliente de factura',exact:true}).fill('Bilbao')
  36 |  await page.getByRole('button',{name:'Buscar cliente',exact:true}).click()
  37 |  await page.getByRole('combobox',{name:'Cliente para facturación',exact:true}).selectOption(a)
  38 |  await expect(page.getByRole('textbox',{name:'Descripción de la factura',exact:true})).toBeVisible()
  39 |  async function generate(text:string){await page.getByRole('textbox',{name:'Descripción de la factura',exact:true}).fill(text);await page.getByRole('button',{name:'Generar propuesta',exact:true}).click()}
  40 |  async function completeOld(){release();await expect.poll(()=>done).toBe(true);await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))}
> 41 |  return {generate,release,completeOld,commands,proposals,pageErrors,waitHeld:()=>expect.poll(()=>held).toBe(true),async close(){release();await page.unrouteAll({behavior:'wait'})}}
     |                                                                                                                                           ^ Error: page.unrouteAll: Target page, context or browser has been closed
  42 | }
  43 | test('held proposal still opens when customer context is unchanged',async({page},info)=>{
  44 |  const r=await scenario(page)
  45 |  try{
  46 |   await r.generate(prompt(0));await r.waitHeld()
  47 |   await expect(page.getByLabel('Cliente de factura',{exact:true})).toHaveCount(0)
  48 |   await r.completeOld()
  49 |   await expect(page.getByLabel('Cliente de factura',{exact:true})).toHaveValue(a)
  50 |   await expect(page.getByLabel('Concepto 1',{exact:true})).toHaveValue('soporte')
  51 |   expect(r.commands).toEqual([]);expect(r.pageErrors).toEqual([])
  52 |   await info.attach('observed-proposals',{body:JSON.stringify(r.proposals),contentType:'application/json'})
  53 |  }finally{await r.close()}
  54 | })
  55 | for(const target of [b,''])test(`old proposal is retired after customer ${target?'switch':'removal'}`,async({page},info)=>{
  56 |  const r=await scenario(page)
  57 |  try{
  58 |   await r.generate(prompt(0));await r.waitHeld()
  59 |   await page.getByRole('combobox',{name:'Cliente para facturación',exact:true}).selectOption(target)
  60 |   await expect(page.getByRole('combobox',{name:'Cliente para facturación',exact:true})).toHaveValue(target)
  61 |   await r.completeOld()
  62 |   await info.attach('context-and-proposals',{body:JSON.stringify({selected:target,proposals:r.proposals,editorCustomer:await page.getByLabel('Cliente de factura',{exact:true}).inputValue().catch(()=>null)}),contentType:'application/json'})
  63 |   await expect.soft(page.getByLabel('Cliente de factura',{exact:true})).toHaveCount(0)
  64 |   expect(r.commands).toEqual([]);expect(r.pageErrors).toEqual([])
  65 |  }finally{await r.close()}
  66 | })
  67 | test('failure from old customer does not contaminate a newer accepted proposal',async({page},info)=>{
  68 |  const r=await scenario(page,true)
  69 |  try{
  70 |   await r.generate(prompt(0));await r.waitHeld()
  71 |   await page.getByRole('combobox',{name:'Cliente para facturación',exact:true}).selectOption(b)
  72 |   await r.generate(prompt(1))
  73 |   await expect(page.getByLabel('Cliente de factura',{exact:true})).toHaveValue(b)
  74 |   await expect(page.getByRole('alert').filter({hasText:'Esta función no está disponible ahora.'})).toHaveCount(0)
  75 |   await r.completeOld()
  76 |   await expect.soft(page.getByRole('alert').filter({hasText:'Esta función no está disponible ahora.'})).toHaveCount(0)
  77 |   await expect(page.getByLabel('Cliente de factura',{exact:true})).toHaveValue(b)
  78 |   expect(r.commands).toEqual([]);expect(r.pageErrors).toEqual([])
  79 |   await info.attach('observed-proposals',{body:JSON.stringify(r.proposals),contentType:'application/json'})
  80 |  }finally{await r.close()}
  81 | })
  82 | test('original comma concept opens an editable support proposal',async({page},info)=>{
  83 |  const r=await scenario(page)
  84 |  try{
  85 |   await r.generate(`Factura para ${clients[0].name} de 300 euros por soporte, vencimiento en 15 días`)
  86 |   r.release()
  87 |   await expect.soft(page.getByLabel('Concepto 1',{exact:true})).toHaveValue('soporte')
  88 |   await info.attach('observed-proposals',{body:JSON.stringify(r.proposals),contentType:'application/json'})
  89 |   expect(r.commands).toEqual([]);expect(r.pageErrors).toEqual([])
  90 |  }finally{await r.close()}
  91 | })
  92 | 
```