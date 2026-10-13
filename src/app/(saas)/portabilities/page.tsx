import {integratedLocalAllowed} from '@/features/product/integration/mode'
import {PageHeader} from '@/components/PageHeader'
import {PortabilityInventory} from '@/features/portabilities/Portabilities'
export default function Page(){return <div className="space-y-4"><PageHeader title="Portabilidades" description="Solicitudes y resultados confirmados de números de clientes"/>{integratedLocalAllowed()?<PortabilityInventory/>:<p className="text-sm text-slate-500">Las portabilidades requieren una conexión autorizada.</p>}</div>}
