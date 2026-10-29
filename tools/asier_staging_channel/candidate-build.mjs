import {readFileSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {digest,publicBuildIdentity} from './contract.mjs'
import {verifyOciLayoutV1} from './oci-layout.mjs'
import {dockerObjectAbsent} from './runtime-lab.mjs'

export const candidateTag='crm-w5-package:test'
const labels={source:'org.opencontainers.image.revision',tree:'io.crm.source.tree',lockfile_sha256:'io.crm.lockfile.sha256',dockerfile_sha256:'io.crm.dockerfile.sha256',public_build_sha256:'io.crm.public-build.sha256'}

/** Shared by the pull_request lab and the protected publication job, so the
 * publish path runs exactly the build/scan/layout code the lab exercised.
 * Existing Dockerfile only; the scan uses the existing pinned gate unchanged.
 * `call(bin,args,options)` routes docker through the owned local socket config.
 */
export async function buildCandidateLayoutV1({source,bindings,call,own,onBuilt=()=>{}}){
 const head=call('git',['rev-parse','HEAD']);if(head.status!==0||head.stdout.trim()!==source)throw Error('SOURCE_MISMATCH')
 if(call('git',['status','--porcelain','--untracked-files=no']).stdout!=='')throw Error('SOURCE_DIRTY')
 const tree=call('git',['rev-parse','HEAD^{tree}']).stdout.trim();if(!/^[a-f0-9]{40}$/.test(tree))throw Error('TREE_INVALID')
 const expected={source,tree,lockfile_sha256:digest(readFileSync('package-lock.json')),dockerfile_sha256:digest(readFileSync('infra/deployment/Dockerfile')),public_build_sha256:publicBuildIdentity(bindings)}
 if(!dockerObjectAbsent(call('docker',['image','inspect',candidateTag]),'image',candidateTag))throw Error('LAB_TAG_EXISTS_OR_ABSENCE_UNPROVEN')
 onBuilt()
 const build=call('docker',['build','--platform','linux/amd64','--provenance=false','--sbom=false','-f','infra/deployment/Dockerfile','-t',candidateTag,...Object.entries(labels).flatMap(([field,label])=>['--label',label+'='+expected[field]]),...Object.entries(bindings).flatMap(([k,v])=>['--build-arg',k+'='+v]),'.'])
 if(build.status!==0)throw Error('IMAGE_BUILD_FAILED')
 const id=call('docker',['image','inspect',candidateTag,'--format','{{.Id}}']);if(id.status!==0)throw Error('IMAGE_INSPECT_FAILED')
 const imageConfigDigest=id.stdout.trim()
 // Existing scanner/evidence gate. A FAIL is reported to the caller, never waived.
 const scanned=call('node',['scripts/platform/image-scan.mjs'],{env:{...process.env}})
 let scan,scanBytes
 try{scanBytes=Buffer.from(scanned.stdout.trim().split('\n').at(-1));scan=JSON.parse(scanBytes.toString('utf8'))}catch{scan={result:'FAIL',error:'IMAGE_SECURITY_SCAN_NOT_PROVEN'};scanBytes=Buffer.from(JSON.stringify(scan))}
 const archive=join(own('crm-oci-archive-'),'image.tar'),layout=own('crm-oci-layout-')
 if(call('docker',['image','save','--output',archive,candidateTag]).status!==0||call('tar',['-xf',archive,'-C',layout,'--no-same-owner','--no-same-permissions']).status!==0)throw Error('IMAGE_SAVE_FAILED')
 rmSync(archive)
 const verified=await verifyOciLayoutV1({root:layout,expected})
 if(verified.evidence.image_config_digest!==imageConfigDigest)throw Error('LAYOUT_CONFIG_NOT_BUILT_IMAGE')
 return {expected,imageConfigDigest,scan,scanBytes,layout,verified}
}
