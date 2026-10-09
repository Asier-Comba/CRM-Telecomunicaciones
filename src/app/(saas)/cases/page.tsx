import {integratedLocalAllowed} from '@/features/product/integration/mode'
import {PageHeader} from '@/components/PageHeader'
import {CaseInventory} from '@/features/cases/Cases'
export default function CasesPage(){return <div className="space-y-4"><PageHeader title="Incidencias Telecom" description="Seguimiento interno y resolución de incidencias de clientes"/>{integratedLocalAllowed()?<CaseInventory/>:<p className="text-sm text-slate-500">Las incidencias requieren una conexión autorizada.</p>}</div>}
