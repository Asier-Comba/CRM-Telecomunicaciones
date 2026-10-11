const phases=new Set(['CREATE_CLICK','CREATE_UPSTREAM','CREATE_LOST_DELIVERY','CREATE_REPLAY_CLICK','CREATE_REPLAY_RESPONSE','CREATE_REPLAY_BODY','CREATE_REPLAY_IDENTITY','CREATE_RECEIPT','CREATE_PERSISTED_THREAD','CREATE_SELECTED_THREAD','CREATE_SEED_START','CREATE_SEED_FINISH'])
const fields=['phase','route_drained','create_attempts','same_first_two_inputs','upstream_status','replay_status','receipt_passed','persisted_thread_count','seeded_turns','display']
const displayFields=['any_page_busy','title_disabled','retry_present','create_present','create_disabled','uncertain_alert','selected_heading_present']
function closed(value,keys){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)return null
 const descriptors=Object.getOwnPropertyDescriptors(value)
 if(Reflect.ownKeys(descriptors).length!==keys.length||keys.some(key=>!descriptors[key]?.enumerable||!Object.hasOwn(descriptors[key],'value')))return null
 return Object.fromEntries(keys.map(key=>[key,descriptors[key].value]))
}
const nullableBoolean=value=>value===null||typeof value==='boolean'
const status=value=>value===null||Number.isSafeInteger(value)&&value>=100&&value<=599

/** Closed telemetry for the synthetic history fixture, never a business receipt. */
export function historyCreateStepObservation(value){
 try{
  const v=closed(value,fields)
  if(!v||!phases.has(v.phase)||v.route_drained!==true||!Number.isSafeInteger(v.create_attempts)||v.create_attempts<0||v.create_attempts>20
   ||!nullableBoolean(v.same_first_two_inputs)||(v.create_attempts<2?v.same_first_two_inputs!==null:typeof v.same_first_two_inputs!=='boolean')
   ||!status(v.upstream_status)||!status(v.replay_status)||!nullableBoolean(v.receipt_passed)
   ||(v.receipt_passed!==null&&v.replay_status===null)||(v.receipt_passed===true&&v.replay_status!==200)
   ||(v.persisted_thread_count!==null&&(!Number.isSafeInteger(v.persisted_thread_count)||v.persisted_thread_count<0||v.receipt_passed!==true))
   ||!Number.isSafeInteger(v.seeded_turns)||v.seeded_turns<0||v.seeded_turns>11
   ||(v.seeded_turns>0&&(v.persisted_thread_count!==1||v.receipt_passed!==true)))return null
  let display=null
  if(v.display!==null){
   display=closed(v.display,displayFields)
   if(!display||displayFields.filter(key=>!['title_disabled','create_disabled'].includes(key)).some(key=>typeof display[key]!=='boolean')
    ||!nullableBoolean(display.title_disabled)||!nullableBoolean(display.create_disabled)
    ||(display.create_present?typeof display.create_disabled!=='boolean':display.create_disabled!==null))return null
   display=Object.freeze(display)
  }
  return Object.freeze({scope:'CURRENT_SYNTHETIC_HISTORY_CREATE_AFTER_ROUTE_DRAIN',...v,display})
 }catch{return null}
}
