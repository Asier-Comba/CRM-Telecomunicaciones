'use client'
import {useState} from 'react'
import {Tabs} from '@/features/product/ui'
import {CustomerDomainPages,type CustomerDomain} from '@/features/customers/CustomerDomainPages'
import {EquipmentInventory} from '@/features/equipment/EquipmentInventory'
const areas:CustomerDomain[]=['Contratos','Servicios','Líneas','SIM/eSIM','Portabilidades','Renovaciones','Permanencias','Incidencias']
export function TelecomPortfolioInventory(){
 const [area,setArea]=useState('Contratos')
 return <div className="space-y-4"><Tabs prefix="inventory-" items={[...areas,'Equipos']} value={area} onChange={setArea}/><section tabIndex={0} role="tabpanel" id={`inventory-panel-${area}`} aria-labelledby={`inventory-tab-${area}`}>{area==='Equipos'?<EquipmentInventory/>:<CustomerDomainPages key={area} area={area as CustomerDomain}/>}</section></div>
}
