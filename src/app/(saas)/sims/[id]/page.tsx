import {notFound} from 'next/navigation'
import {integratedProductAllowed} from '@/features/product/integration/mode'
import {SimDetail} from '@/features/sims/Sims'
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))notFound();return integratedProductAllowed()?<SimDetail key={id} id={id}/>:<p className="text-sm text-slate-500">El registro requiere una conexión autorizada.</p>}
