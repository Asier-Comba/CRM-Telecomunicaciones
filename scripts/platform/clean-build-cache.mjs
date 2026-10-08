import {rmSync} from 'node:fs'
import {resolve,sep} from 'node:path'
import {root} from './lib.mjs'
export function cleanBuildCache(){
 // Turbopack's cache can serialize build-process environment canaries. It is
 // disposable optimization state, never part of the deployment artifact.
 const target=resolve(root,'.next','cache'),parent=resolve(root,'.next')
 if(target!==parent+sep+'cache')throw new Error('BUILD_CACHE_CLEANUP_GUARD')
 rmSync(target,{recursive:true,force:true})
}
if(process.argv[1]?.endsWith('clean-build-cache.mjs'))cleanBuildCache()
