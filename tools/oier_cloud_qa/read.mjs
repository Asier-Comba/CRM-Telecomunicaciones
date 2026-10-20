/** Browser-context read only; no credentials or raw bodies are returned. */
export async function browserRead({operation,id}){

   const response=await fetch(operation==='customer.editor'?'/api/product/v1/queries':'/api/billing/v1',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation,input:{id}})})
   const data=await response.json()
   if(!response.ok)return{http:response.status,denied:[403,404].includes(response.status)&&Object.keys(data).sort().join(',')==='error,ok'&&data.ok===false&&['access_denied','not_found'].includes(data.error)}
   const record=operation==='customer.editor'?data.data:data.data?.invoice
   const valid=data.ok===true&&(operation==='customer.editor'?data.data?.contract_version==='product.v1':data.data?.contract_version==='billing.v1'&&data.data?.operation==='invoice.get')
   const line=record?.lines?.[0]
   return{http:response.status,denied:false,valid,id:record?.id,legalName:record?.legal_name,customerId:record?.customer_id,version:record?.version,status:record?.status,currency:record?.currency,number:record?.number,totals:record?.totals,issue:record?.issue_on,due:record?.due_on,lineCount:record?.lines?.length,description:line?.description,quantity:line?.quantity_milli,price:line?.unit_price_minor,discount:line?.discount_bps,tax:line?.tax_bps,withholding:line?.withholding_bps}

}
