export function estimateCost(policy){
 const errors=[],totals=new Map(),items=[]
 if(policy?.company_approval!=='APPROVED'||!/^[A-Z]{3}$/.test(policy?.currency??''))errors.push('APPROVED_CURRENCY_AND_POLICY_REQUIRED')
 if(!Array.isArray(policy?.items)||!policy.items.length)return {status:'CONFIGURATION_MISSING',errors:['COST_ITEMS_REQUIRED'],purchases_performed:false}
 for(const item of policy.items){
  if(!/^[a-z_]{1,40}$/.test(item?.service??'')||!['fixed_month','GB_month','GB','named_account_month','1000_messages','1000000_tokens'].includes(item.basis)||!Number.isSafeInteger(item.price_minor)||item.price_minor<0||!Number.isSafeInteger(item.quantity)||item.quantity<0){errors.push('PRICE_QUANTITY_OR_UNIT_MISSING');continue}
  const amount=item.price_minor*item.quantity
  if(!Number.isSafeInteger(amount))throw new Error('COST_OVERFLOW')
  const interval=['fixed_month','GB_month','named_account_month'].includes(item.basis)?'MONTHLY':'USAGE_PERIOD'
  const total=(totals.get(interval)??0)+amount;if(!Number.isSafeInteger(total))throw new Error('COST_OVERFLOW');totals.set(interval,total)
  items.push({service:item.service,interval,amount_minor:amount})
 }
 return {status:errors.length?'CONFIGURATION_MISSING':'ESTIMATE_ONLY',currency:errors.length?'UNAPPROVED':policy.currency,items,totals:Object.fromEntries(totals),errors:[...new Set(errors)],taxes_and_provider_prices_verified:false,purchases_performed:false}
}
