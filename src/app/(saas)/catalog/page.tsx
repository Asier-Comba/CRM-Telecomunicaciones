import {integratedLocalAllowed} from '@/features/product/integration/mode'
import {IntegratedCatalog} from '@/features/catalog/IntegratedCatalog'
import {PageHeader} from '@/components/PageHeader'
export default async function CatalogPage({searchParams}:{searchParams:Promise<{operator?:string}>}){const p=await searchParams,id=p.operator&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.operator)?p.operator:undefined;return integratedLocalAllowed()?<IntegratedCatalog key={id??'inventory'} initialOperatorId={id}/>:<PageHeader title="Catálogo Telecom" description="El catálogo requiere una conexión autorizada."/>}
