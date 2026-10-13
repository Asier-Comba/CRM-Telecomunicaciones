import type {PermanenceRowV1,RenewalRowV1} from '@/lib/contracts/telecom-collections-v1'

const renewalAttention:Record<RenewalRowV1['attention_state'],string>={open:'Plazo abierto',completed:'Renovación completada',dismissed:'Descartada',not_applicable:'No aplica',overdue:'Vencida',upcoming:'Próxima'}
const permanenceTiming:Record<PermanenceRowV1['timing_state'],string>={cancelled:'Cancelada',expired:'Finalizada',upcoming:'Próxima',current:'Vigente'}

export function portfolioTimingLabel(field:'attention_state'|'timing_state',value:string){
 const labels:Readonly<Record<string,string>>=field==='attention_state'?renewalAttention:permanenceTiming
 return Object.hasOwn(labels,value)?labels[value]:value
}
