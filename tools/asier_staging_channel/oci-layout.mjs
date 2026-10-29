import {createHash} from 'node:crypto'
import {createReadStream} from 'node:fs'
import {lstat,open} from 'node:fs/promises'
import {join} from 'node:path'
import {pipeline} from 'node:stream/promises'
import {createGunzip} from 'node:zlib'
import {registryImageEvidence} from './oci-evidence.mjs'
import {validateReceipt} from './contract.mjs'

const isDigest=value=>typeof value==='string'&&/^sha256:[a-f0-9]{64}$/.test(value)
const manifestTypes=['application/vnd.oci.image.manifest.v1+json','application/vnd.docker.distribution.manifest.v2+json']
const gzipTypes=['application/vnd.oci.image.layer.v1.tar+gzip','application/vnd.docker.image.rootfs.diff.tar.gzip']
const maxLayers=128,maxLayerBytes=4*1024*1024*1024

async function blob(root,digest,size){
 if(!isDigest(digest)||!Number.isSafeInteger(size)||size<=0)throw Error('OCI_LAYOUT_DESCRIPTOR_INVALID')
 const path=join(root,'blobs','sha256',digest.slice(7)),stat=await lstat(path).catch(()=>null)
 // Symlinks could select bytes outside the verified layout.
 if(!stat?.isFile()||stat.size!==size)throw Error('OCI_LAYOUT_BLOB_INVALID')
 return path
}
async function smallFile(path){
 const stat=await lstat(path).catch(()=>null)
 if(!stat?.isFile()||stat.size===0||stat.size>1024*1024)throw Error('OCI_LAYOUT_METADATA_INVALID')
 const handle=await open(path,'r');try{return await handle.readFile()}finally{await handle.close()}
}
async function streamDigest(path,gunzip){
 const hash=createHash('sha256')
 await pipeline(createReadStream(path),...(gunzip?[createGunzip()]:[]),async source=>{for await(const chunk of source)hash.update(chunk)})
 return 'sha256:'+hash.digest('hex')
}
const sha=bytes=>'sha256:'+createHash('sha256').update(bytes).digest('hex')
function json(bytes){try{const value=JSON.parse(bytes.toString('utf8'));if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value}catch{throw Error('OCI_LAYOUT_METADATA_INVALID')}}

/** Verifies a local OCI image layout byte-for-byte before any push: one image
 * manifest, every blob hash and size, and every layer's uncompressed diff_id
 * against config.rootfs. Pushing these exact bytes (digest-preserving) is what
 * lets a pre-push provenance subject equal the registry manifest digest.
 * It proves neither scan results, authenticity, privacy nor runtime acceptance.
 */
export async function verifyOciLayoutV1({root,expected}={}){
 if(typeof root!=='string'||!root)throw Error('OCI_LAYOUT_ROOT_INVALID')
 if(json(await smallFile(join(root,'oci-layout'))).imageLayoutVersion!=='1.0.0')throw Error('OCI_LAYOUT_VERSION_INVALID')
 const index=json(await smallFile(join(root,'index.json')))
 if(index.schemaVersion!==2||index.mediaType!==undefined&&index.mediaType!=='application/vnd.oci.image.index.v1+json'||!Array.isArray(index.manifests))throw Error('OCI_LAYOUT_INDEX_INVALID')
 // Nested indexes and attestation manifests need a separately reviewed resolver.
 if(index.manifests.length!==1||!manifestTypes.includes(index.manifests[0]?.mediaType))throw Error('OCI_LAYOUT_SINGLE_IMAGE_REQUIRED')
 const descriptor=index.manifests[0]
 if(descriptor.platform!==undefined&&(descriptor.platform?.os!=='linux'||descriptor.platform?.architecture!=='amd64'))throw Error('OCI_LAYOUT_PLATFORM_INVALID')
 const manifestBytes=await smallFile(await blob(root,descriptor.digest,descriptor.size))
 if(sha(manifestBytes)!==descriptor.digest)throw Error('OCI_LAYOUT_MANIFEST_HASH_MISMATCH')
 const manifest=json(manifestBytes)
 if(manifest.mediaType!==descriptor.mediaType)throw Error('OCI_LAYOUT_MANIFEST_TYPE_MISMATCH')
 const configBytes=await smallFile(await blob(root,manifest.config?.digest,manifest.config?.size))
 // Structural/runtime/label checks are shared with registry readback.
 const evidence=registryImageEvidence({manifestBytes,configBytes,requestedDigest:descriptor.digest,expected})
 const diffIds=json(configBytes).rootfs.diff_ids
 if(manifest.layers.length>maxLayers||manifest.layers.reduce((total,layer)=>total+layer.size,0)>maxLayerBytes)throw Error('OCI_LAYOUT_TOO_LARGE')
 const layers=[]
 for(const [position,layer] of manifest.layers.entries()){
  const path=await blob(root,layer.digest,layer.size)
  if(await streamDigest(path,false)!==layer.digest)throw Error('OCI_LAYOUT_LAYER_HASH_MISMATCH')
  let diffId=layer.digest
  if(gzipTypes.includes(layer.mediaType)){try{diffId=await streamDigest(path,true)}catch{throw Error('OCI_LAYOUT_LAYER_UNREADABLE')}}
  if(diffId!==diffIds[position])throw Error('OCI_LAYOUT_DIFF_ID_MISMATCH')
  layers.push({digest:layer.digest,size:layer.size,diff_id:diffId,media_type:layer.mediaType})
 }
 return Object.freeze({evidence,layers,image:{manifestBytes,configBytes,requestedDigest:descriptor.digest}})
}

/** Lab-only record for a push to an ephemeral runner-local registry. It is
 * deliberately rejected by validateReceipt/composePreflightV1: never consumable.
 */
export function labReceiptV1({evidence,layers,registryManifestDigest,pulledImageId}){
 const receipt={version:'staging.image.lab-receipt.v1',scope:'LAB_ONLY_LOCAL_EPHEMERAL_REGISTRY',source:evidence.source,tree:evidence.tree,lockfile_sha256:evidence.lockfile_sha256,dockerfile_sha256:evidence.dockerfile_sha256,public_build_sha256:evidence.public_build_sha256,image_config_digest:evidence.image_config_digest,manifest_digest:evidence.manifest_digest,layer_digests:layers.map(layer=>layer.digest),registry_manifest_digest:registryManifestDigest,pulled_image_id:pulledImageId,digest_preserved:registryManifestDigest===evidence.manifest_digest&&pulledImageId===evidence.image_config_digest,visibility:'NOT_APPLICABLE_LAB',consumable:false,publishing_authorized:false,deploying_authorized:false}
 try{validateReceipt(receipt,evidence);throw Error('LAB_RECEIPT_CONSUMABLE')}catch(error){if(error?.message==='LAB_RECEIPT_CONSUMABLE')throw error}
 return Object.freeze(receipt)
}
