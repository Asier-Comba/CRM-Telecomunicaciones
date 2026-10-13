import {integratedLocalAllowed} from '@/features/product/integration/mode'
import {PageHeader} from '@/components/PageHeader'
import {ContractsInventory} from '@/features/contracts/Contracts'
export default function Page(){return <div className="space-y-4"><PageHeader title="Contratos" description="Contratos manuales y versiones comerciales vendidas"/>{integratedLocalAllowed()?<ContractsInventory/>:<p className="text-sm text-slate-500">Los contratos requieren una conexión autorizada.</p>}</div>}
