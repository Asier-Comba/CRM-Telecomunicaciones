import {integratedLocalAllowed} from '@/features/product/integration/mode'
import {PageHeader} from '@/components/PageHeader'
import {EquipmentInventory} from '@/features/equipment/EquipmentInventory'
export default async function EquipmentPage({searchParams}:{searchParams:Promise<{id?:string}>}){const p=await searchParams;const id=p.id&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id)?p.id:undefined;return <div className="space-y-4"><PageHeader title="Equipos" description="Asignación, devolución y sustitución de equipos de clientes"/>{integratedLocalAllowed()?<EquipmentInventory key={id??'inventory'} initialId={id}/>:<p className="text-sm text-slate-500">La gestión de equipos requiere una conexión autorizada.</p>}</div>}
