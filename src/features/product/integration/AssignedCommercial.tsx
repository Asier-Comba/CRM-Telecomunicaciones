'use client'
import {useScopedCollectionLabel} from './ScopedCollectionLabels'
import {useEffect,useState} from 'react'
import {useProduct} from './Provider'
import {assigneeCollectionIdentity} from '@/features/customers/customer-identity'
export function AssignedCommercial({id}:{id:string|null}){const scoped=useScopedCollectionLabel('assignee',id??''),{repository}=useProduct(),[state,setState]=useState<{id:string;name:string}|null>(null);useEffect(()=>{if(!id||scoped.covered)return;let active=true;void assigneeCollectionIdentity(repository,id).then(r=>{if(active)setState({id,name:r.display_name})}).catch(()=>{if(active)setState({id,name:'Comercial no disponible'})});return()=>{active=false}},[repository,id,scoped.covered]);return <>{!id?'Sin responsable':scoped.covered?scoped.label??'Consultando nombre…':state?.id===id?state.name:'Consultando comercial…'}</>}
