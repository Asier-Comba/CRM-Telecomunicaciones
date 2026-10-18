import { createRoot } from 'react-dom/client'
import { Calendar } from '../../../src/features/calendar/Calendar'
const titleProbe=new URLSearchParams(location.hash.slice(1)).get('titleProbe')
const entries=[
 {id:'synthetic_meeting',title:titleProbe==='long'?'Cita'+ 'X'.repeat(156):'Synthetic meeting',customerId:null,customer:'Synthetic Company',owner:'Synthetic A',type:'meeting' as const,date:'2026-10-11T08:00:00Z',end:null,allDay:false},
 {id:'synthetic_task',title:'Synthetic task',customerId:null,customer:'Synthetic Company',owner:'Synthetic B',type:'task' as const,date:'2026-10-11T09:00:00Z',end:null,allDay:false},
]
createRoot(document.getElementById('app')!).render(<><div className="mb-4 rounded-xl border border-slate-200 bg-white p-4"><label>Estado <select className="rounded-lg border px-3 py-2"><option>Todos los estados</option></select></label><button className="ml-2 rounded-lg border px-3 py-2">Actualizar agenda</button><span className="ml-2 text-xs">Página 1: hasta 100 actividades</span></div><Calendar entries={entries} asOf="2026-10-11T08:00:00Z" onCreate={()=>{}} onSelect={titleProbe ? undefined : ()=>{}} /></>)
