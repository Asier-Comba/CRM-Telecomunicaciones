'use client'
import {createContext,useContext,useEffect,useMemo,useState,type ReactNode} from 'react'
import {useProduct} from './Provider'
import {loadCollectionLabels,pendingCollectionLabels,type LabelSet,type LabelKind} from './collection-labels'
const Context=createContext<LabelSet|null>(null)
export function ScopedCollectionLabels({rows,children}:{rows:readonly object[];children:ReactNode}){const {repository}=useProduct(),pending=useMemo(()=>pendingCollectionLabels(rows),[rows]),[state,setState]=useState<{rows:readonly object[];labels:LabelSet}|null>(null);useEffect(()=>{let active=true;void loadCollectionLabels(repository,rows,()=>active).then(labels=>{if(active)setState({rows,labels})});return()=>{active=false}},[repository,rows]);return <Context.Provider value={state?.rows===rows?state.labels:pending}>{children}</Context.Provider>}
export function useScopedCollectionLabel(kind:LabelKind,id:string){const labels=useContext(Context),covered=!!labels&&Object.hasOwn(labels[kind],id);return {covered,label:covered?labels![kind][id]:null}}
