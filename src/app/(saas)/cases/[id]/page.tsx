import {notFound} from 'next/navigation'
import {integratedLocalAllowed} from '@/features/product/integration/mode'
import {CaseDetail} from '@/features/cases/Cases'
export default async function CasePage({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))notFound();return integratedLocalAllowed()?<CaseDetail key={id} id={id}/>:<p className="text-sm text-slate-500">La incidencia requiere una conexión autorizada.</p>}
