'use client'
import {useScopedCollectionLabel} from './ScopedCollectionLabels'
import {useEffect,useState} from 'react'
import {useProduct} from './Provider'
import {stageCollectionIdentity} from '@/features/customers/customer-identity'
export function NamedStage({id}:{id:string}){const scoped=useScopedCollectionLabel('stage',id??''),{repository}=useProduct(),[state,setState]=useState<{id:string;name:string}|null>(null);useEffect(()=>{if(scoped.covered)return;let active=true;void stageCollectionIdentity(repository,id).then(r=>{if(active)setState({id,name:r.display_name})}).catch(()=>{if(active)setState({id,name:'Etapa no disponible'})});return()=>{active=false}},[repository,id,scoped.covered]);return <>{scoped.covered?scoped.label??'Consultando nombre…':state?.id===id?state.name:'Consultando etapa…'}</>}
