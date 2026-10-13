import {snapshotProductJsonV1} from '../lib/server/product-query-runtime-v1.ts'
import type {ReadAuthorityV2} from './product-read-executor-v2.ts'

/** Descriptor admission and an immutable copy, never an authorization cache. */
export function snapshotReadAuthorityV2(raw:unknown):ReadAuthorityV2|null{
  try{
    const value=snapshotProductJsonV1(raw)
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='actorId,role,scopeEpoch,workspaceId')return null
    const fields=value as Record<string,unknown>
    if(!['actorId','workspaceId','scopeEpoch'].every(key=>typeof fields[key]==='string'&&fields[key].length>0&&fields[key].length<=512)
      ||typeof fields.role!=='string'||!['owner','admin','member','viewer'].includes(fields.role))return null
    return value as ReadAuthorityV2
  }catch{return null}
}
