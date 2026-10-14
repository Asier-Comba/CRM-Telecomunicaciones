import {chromium} from '@playwright/test'
import {customer360CollectionsBrowser} from '../../../scripts/security/supabase-local/product-customer360-collections-browser.mjs'
const browser=await chromium.launch(),page=await browser.newPage(),failed=[],passed=[],unhandled=[],failureKinds=[]
// No Auth/SQL acceptance: the real consumer sees an intentionally absent UI.
// Each check must fail and remain recorded; only waiter lifetime is measured.
process.on('unhandledRejection',()=>{unhandled.push('UNHANDLED_RESPONSE_REJECTION')})
page.setDefaultTimeout(40)
await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Synthetic absent consumer UI</title>'}))
const id='10000000-0000-4000-8000-000000000001',report={}
try{
 await customer360CollectionsBrowser({page,origin:'http://127.0.0.1:43107',id,wa:id,users:{ownerA:{id}},sql:()=>'',report,screenshotDir:process.cwd(),check:async(name,action)=>{try{await action();passed.push(name)}catch(error){failed.push(name);failureKinds.push({check:name,kind:['TimeoutError','Error','TypeError','AssertionError'].includes(error?.name)?error.name:'UNKNOWN'})}}})
 await new Promise(resolve=>setTimeout(resolve,100))
}finally{await browser.close()}
await new Promise(resolve=>setTimeout(resolve,50))
console.log(JSON.stringify({kind:'C360_RESPONSE_WAITER_FAILURE_LIFETIME_SYNTHETIC_ONLY',failed,passed,unhandled,failureKinds,auth_db:'NOT_RUN'}))
if(unhandled.length||passed.length||failed.length<4)process.exitCode=1
