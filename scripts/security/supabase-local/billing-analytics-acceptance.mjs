import{randomUUID}from'node:crypto'
export async function billingAnalyticsAcceptance({rpc,sql,check,http,users,wa,url,anon,appUrl}){
 const{createServerClient}=await import('@supabase/ssr');const cookies={}
 for(const name of['ownerA','adminA','memberA','viewerA','ownerB']){const values=[],c=createServerClient(url,anon,{cookies:{getAll:()=>[],setAll:v=>values.push(...v)}});check(!(await c.auth.setSession({access_token:users[name].token,refresh_token:users[name].refresh})).error,'analytics_cookie_'+name);cookies[name]=values.map(c=>c.name+'='+c.value).join('; ')}
 const post=async(op,input,name='ownerA')=>{const r=await fetch(appUrl+'/api/billing/analytics/v1',{method:'POST',headers:{cookie:cookies[name],origin:appUrl,'content-type':'application/json'},body:JSON.stringify({operation:op,input}),signal:AbortSignal.timeout(30000)});check(r.headers.get('cache-control')==='no-store','analytics_no_store_'+op);return{status:r.status,json:await r.json()}}
 const call=async(name,input,actor='ownerA')=>{const r=await rpc(name,{p_workspace_id:wa,p_input:input},users[actor].token);check(r.status===200,'analytics_normal_'+name);return r.json}
 const customer=await call('product_v1_customer_create',{command_id:randomUUID(),account_kind:'legal_entity',legal_name:'TEL5 Synthetic Currency Cohort'})
 const profile={legal_name:'Synthetic Analytics Fiscal',tax_id:'SYNTHETIC-NOT-VALID-ANALYTICS',address:'Synthetic Street 1',postal_code:'00000',city:'Synthetic',region:'Synthetic',country:'ES'}
 await call('billing_v1_customer_fiscal_set',{command_id:randomUUID(),customer_id:customer.id,expected_version:0,profile})
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));const today=[parts.year,parts.month,parts.day].join('-'),m=new Date(today.slice(0,7)+'-01T00:00:00Z');m.setUTCMonth(m.getUTCMonth()-1);const month=m.toISOString().slice(0,10)
 const issue=async(currency,amount,paid)=>{const d=await call('billing_v1_invoice_create_draft',{command_id:randomUUID(),customer_id:customer.id,issue_on:month,due_on:month,series:'A',currency,lines:[{description:'Synthetic Analytics Charge',quantity_milli:1000,unit_price_minor:amount,discount_bps:0,tax_bps:0,withholding_bps:0}],...(currency==='USD'?{fx_rate_micros:1000000,fx_on:month,fx_source:'synthetic_manual'}:{})});const i=await call('billing_v1_invoice_issue',{command_id:randomUUID(),id:d.id,expected_version:1});if(paid)await call('billing_v1_invoice_mark_paid',{command_id:randomUUID(),id:i.id,expected_version:2})}
 await issue('EUR',100,true);await issue('EUR',250,false);await issue('USD',700,true);await issue('USD',900,false)
 await call('billing_v1_invoice_create_draft',{command_id:randomUUID(),customer_id:customer.id,issue_on:month,due_on:month,series:'A',currency:'EUR',lines:[{description:'Synthetic Draft Excluded',quantity_milli:1000,unit_price_minor:999,discount_bps:0,tax_bps:0,withholding_bps:0}]})
 const observed=[]
 for(const op of['billing.monthly_series','billing.top_customers']){observed.push(op)
 for(const[currency,issued,paid,out]of[['EUR','350','100','250'],['USD','1600','700','900'],['GBP','0','0','0']]){
 const input={currency,from_month:month,to_month:month,customer_id:customer.id},r=await post(op,input);check(r.status===200,'analytics_individually_observed_'+op+'_'+currency)
 const rows=r.json.data.items;check(r.json.data.basis==='issue_month_cohort_current_status'&&r.json.data.currency===currency,'analytics_explicit_basis_currency')
 if(op==='billing.top_customers'&&currency==='GBP')check(rows.length===0,'analytics_empty_currency_top');else check(rows.length===1&&rows[0].issued_minor===issued&&rows[0].paid_minor===paid&&rows[0].outstanding_minor===out&&rows[0].overdue_minor===out,'analytics_exact_separate_money_'+op+'_'+currency)
 check(!JSON.stringify(r.json).includes(profile.tax_id)&&!JSON.stringify(r.json).includes(profile.legal_name),'analytics_no_fiscal_pii')
 for(const actor of['memberA','viewerA'])check((await post(op,input,actor)).status===403,'analytics_role_denied_'+actor+'_'+op)
 check((await post(op,input,'adminA')).status===200,'analytics_admin_allowed_'+op);check((await post(op,input,'ownerB')).status===404,'analytics_foreign_customer_hidden_'+op)
 }
 }
 const base={currency:'EUR',from_month:month,to_month:month,customer_id:customer.id}
 const dense=await post('billing.monthly_series',{...base,to_month:today.slice(0,7)+'-01'});check(dense.status===200&&dense.json.data.items.length===2&&dense.json.data.items[1].issued_minor==='0','analytics_dense_zero_month')
 for(const invalid of[{...base,currency:'ALL'},{from_month:month,to_month:month},{...base,sql:'arbitrary'},{...base,to_month:'2100-12-01'}])check((await post('billing.monthly_series',invalid)).status===400,'analytics_closed_currency_period')
 check((await post('billing.top_customers',{...base,limit:26})).status===400,'analytics_top_limit')
 sql(`update public.workspace_members set status='suspended'where workspace_id='${wa}'and user_id='${users.adminA.id}';`)
 check((await http('/auth/v1/user',users.adminA.token)).status===200,'analytics_revoked_jwt_valid')
 for(const op of observed){check((await post(op,base,'adminA')).status===403,'analytics_same_cookie_revoked_'+op);check((await rpc('billing_analytics_v1_query',{p_workspace_id:wa,p_operation:op,p_input:base},users.adminA.token)).status===403,'analytics_same_jwt_revoked_'+op)}
 sql(`update public.workspace_members set status='active'where workspace_id='${wa}'and user_id='${users.adminA.id}';`)
 return{billing_analytics_operations_individually_observed:observed,billing_analytics:'PASS_EXACT_SEPARATE_CURRENCY_ISSUE_MONTH_CURRENT_STATUS_COHORTS_TOP_BOUNDS_PRIVILEGED_SCOPE_VALID_JWT_REVOCATION',billing_historical_balances:'NOT_RECONSTRUCTED_NO_PAYMENT_LEDGER'}
}
