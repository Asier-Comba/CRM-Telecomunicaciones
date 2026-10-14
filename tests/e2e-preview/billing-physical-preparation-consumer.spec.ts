import {expect,test} from '@playwright/test'
import {startBillingFocusFixture} from './fixtures/billing-focus-server.cjs'
import {billingCreateReadLifetimeBrowser} from '../../scripts/security/supabase-local/product-billing-create-read-lifetime-browser.mjs'
const id='10000000-0000-4000-8000-000000000002'
test('physical billing preparation consumer completes with actual repository and controlled HTTP',async({page},info)=>{
 const fixture=await startBillingFocusFixture({preparationCustomer:true})
 const report:{w2_ui_action_step?:string}={}
 try{
  await billingCreateReadLifetimeBrowser({page,origin:fixture.url,customerId:id,wa:'10000000-0000-4000-8000-000000000004',screenshotDir:info.outputDir,report,check:async(_name:string,action:()=>Promise<void>)=>action(),sql:(query:string)=>query.includes('coalesce')?'Synthetic preparation customer':'0'})
  expect(report.w2_ui_action_step).toBe('billing_preparation:positive_no_unreviewed_write')
  expect(fixture.requests.filter((r:{url:string})=>r.url.includes('/commands'))).toEqual([])
 }finally{await page.close();await fixture.close()}
})
