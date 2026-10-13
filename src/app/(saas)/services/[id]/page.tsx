import {notFound} from 'next/navigation'
import {integratedLocalAllowed} from '@/features/product/integration/mode'
import {ServiceDetail} from '@/features/services/ServiceDetail'
export default async function ServicePage({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))notFound();return integratedLocalAllowed()?<ServiceDetail key={id} id={id}/>:<p className="text-sm text-slate-500">El servicio requiere una conexión autorizada.</p>}
