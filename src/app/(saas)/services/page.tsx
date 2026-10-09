import {integratedLocalAllowed} from '@/features/product/integration/mode'
import {PageHeader} from '@/components/PageHeader'
import {CustomerDomainPages} from '@/features/customers/CustomerDomainPages'
export default function ServicesPage(){return <div className="space-y-4"><PageHeader title="Servicios Telecom" description="Instalación y componentes de la tarifa vendida"/>{integratedLocalAllowed()?<CustomerDomainPages area="Servicios"/>:<p className="text-sm text-slate-500">La consulta de servicios requiere una conexión autorizada.</p>}</div>}
