import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync,readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {gzipSync} from 'node:zlib'
import {digest,validateReceipt} from './contract.mjs'
import {verifyOciLayoutV1,labReceiptV1} from './oci-layout.mjs'

// Synthetic layouts only; this is not evidence about a real built image.
const expected={source:'a'.repeat(40),tree:'b'.repeat(40),lockfile_sha256:'c'.repeat(64),dockerfile_sha256:'d'.repeat(64),public_build_sha256:'e'.repeat(64)}
const json=value=>Buffer.from(JSON.stringify(value))
function layout({gzip=true,before,after}={}){
 const root=mkdtempSync(join(tmpdir(),'crm-oci-layout-test-')),blobs=join(root,'blobs','sha256');mkdirSync(blobs,{recursive:true})
 const put=bytes=>{const d=digest(bytes);writeFileSync(join(blobs,d),bytes);return {digest:'sha256:'+d,size:bytes.length}}
 const tar=Buffer.from('synthetic-layer-tar-bytes'),layerBytes=gzip?gzipSync(tar):tar,layer=put(layerBytes)
 const labels={'org.opencontainers.image.revision':expected.source,'io.crm.source.tree':expected.tree,'io.crm.lockfile.sha256':expected.lockfile_sha256,'io.crm.dockerfile.sha256':expected.dockerfile_sha256,'io.crm.public-build.sha256':expected.public_build_sha256}
 const config={architecture:'amd64',os:'linux',rootfs:{type:'layers',diff_ids:['sha256:'+digest(tar)]},config:{User:'65532:65532',WorkingDir:'/app',Entrypoint:['/nodejs/bin/node'],Cmd:['scripts/platform/entrypoint.mjs'],ExposedPorts:{'3000/tcp':{}},Env:['NODE_ENV=production','NEXT_TELEMETRY_DISABLED=1','HOSTNAME=0.0.0.0','PORT=3000','TZ=UTC'],Labels:labels}}
 const state={config,layer,layerMediaType:gzip?'application/vnd.oci.image.layer.v1.tar+gzip':'application/vnd.oci.image.layer.v1.tar',extraManifests:[]}
 before?.(state)
 const configDescriptor=put(json(state.config))
 const manifest={schemaVersion:2,mediaType:'application/vnd.oci.image.manifest.v1+json',config:{mediaType:'application/vnd.oci.image.config.v1+json',...configDescriptor},layers:[{mediaType:state.layerMediaType,...state.layer}]}
 const manifestDescriptor=put(json(manifest))
 writeFileSync(join(root,'oci-layout'),json({imageLayoutVersion:'1.0.0'}))
 writeFileSync(join(root,'index.json'),json({schemaVersion:2,mediaType:'application/vnd.oci.image.index.v1+json',manifests:[{mediaType:'application/vnd.oci.image.manifest.v1+json',...manifestDescriptor},...state.extraManifests]}))
 after?.({root,blobs,layer:state.layer,manifestDescriptor})
 return {root,manifestDescriptor,layerBytes}
}
const rejects=async(options,code)=>{const l=layout(options);try{await assert.rejects(verifyOciLayoutV1({root:l.root,expected}),{message:code})}finally{rmSync(l.root,{recursive:true})}}

test('compressed and uncompressed layouts verify every blob and diff_id before any push',async()=>{
 for(const gzip of [true,false]){
  const l=layout({gzip})
  try{
   const result=await verifyOciLayoutV1({root:l.root,expected})
   assert.equal(result.evidence.manifest_digest,l.manifestDescriptor.digest);assert.equal(result.layers.length,1)
   assert.equal(result.layers[0].diff_id===result.layers[0].digest,!gzip);assert.equal(result.evidence.publishable,false)
  }finally{rmSync(l.root,{recursive:true})}
 }
})
test('a modified layer byte, truncated layer or wrong diff_id cannot reach a push',async()=>{
 await rejects({after:({blobs,layer})=>{const p=join(blobs,layer.digest.slice(7)),b=readFileSync(p);b[b.length-1]^=1;writeFileSync(p,b)}},'OCI_LAYOUT_LAYER_HASH_MISMATCH')
 await rejects({after:({blobs,layer})=>{const p=join(blobs,layer.digest.slice(7));writeFileSync(p,readFileSync(p).subarray(1))}},'OCI_LAYOUT_BLOB_INVALID')
 await rejects({before:state=>{state.config.rootfs.diff_ids=['sha256:'+'9'.repeat(64)]}},'OCI_LAYOUT_DIFF_ID_MISMATCH')
 await rejects({gzip:false,before:state=>{state.layerMediaType='application/vnd.oci.image.layer.v1.tar+gzip'}},'OCI_LAYOUT_LAYER_UNREADABLE')
})
test('indexes, extra images, changed manifests and symlinked blobs fail closed',async()=>{
 await rejects({before:state=>{state.extraManifests.push({mediaType:'application/vnd.oci.image.manifest.v1+json',digest:'sha256:'+'1'.repeat(64),size:2})}},'OCI_LAYOUT_SINGLE_IMAGE_REQUIRED')
 await rejects({after:({root,manifestDescriptor})=>writeFileSync(join(root,'index.json'),json({schemaVersion:2,manifests:[{mediaType:'application/vnd.oci.image.index.v1+json',...manifestDescriptor}]}))},'OCI_LAYOUT_SINGLE_IMAGE_REQUIRED')
 await rejects({after:({blobs,manifestDescriptor})=>{const p=join(blobs,manifestDescriptor.digest.slice(7)),b=readFileSync(p);b[b.length-2]=0x20;writeFileSync(p,b)}},'OCI_LAYOUT_MANIFEST_HASH_MISMATCH')
 await rejects({before:state=>{state.config.config.Labels['io.crm.source.tree']='f'.repeat(40)}},'STAGING_OCI_LABEL_BINDING_MISMATCH')
 let linked=true
 await rejects({after:({blobs,layer})=>{const p=join(blobs,layer.digest.slice(7)),outside=p+'.outside';writeFileSync(outside,readFileSync(p));rmSync(p);try{symlinkSync(outside,p)}catch{linked=false;writeFileSync(p,'x')}}},'OCI_LAYOUT_BLOB_INVALID')
 assert.ok(linked||process.platform==='win32')
})
test('a lab receipt can never satisfy the consumable staging receipt contract',async()=>{
 const l=layout()
 try{
  const v=await verifyOciLayoutV1({root:l.root,expected})
  const receipt=labReceiptV1({evidence:v.evidence,layers:v.layers,registryManifestDigest:v.evidence.manifest_digest,pulledImageId:v.evidence.image_config_digest})
  assert.equal(receipt.digest_preserved,true);assert.equal(receipt.consumable,false);assert.equal(receipt.deploying_authorized,false)
  assert.throws(()=>validateReceipt(receipt,expected),{message:'STAGING_RECEIPT_SHAPE_INVALID'})
  assert.equal(labReceiptV1({evidence:v.evidence,layers:v.layers,registryManifestDigest:'sha256:'+'0'.repeat(64),pulledImageId:v.evidence.image_config_digest}).digest_preserved,false)
 }finally{rmSync(l.root,{recursive:true})}
})
