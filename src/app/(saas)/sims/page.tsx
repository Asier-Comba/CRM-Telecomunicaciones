import {integratedLocalAllowed} from '@/features/product/integration/mode'
import {PageHeader} from '@/components/PageHeader'
import {SimInventory} from '@/features/sims/Sims'
export default function Page(){return <div className="space-y-4"><PageHeader title="SIM y eSIM" description="Preparación, asociaciones y seguimiento de recursos móviles"/>{integratedLocalAllowed()?<SimInventory/>:<p className="text-sm text-slate-500">Las SIM/eSIM requieren una conexión autorizada.</p>}</div>}
