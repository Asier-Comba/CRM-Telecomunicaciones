import {digest,imageRepository} from './contract.mjs'

const manifestTypes=['application/vnd.oci.image.manifest.v1+json','application/vnd.docker.distribution.manifest.v2+json']
const configTypes=['application/vnd.oci.image.config.v1+json','application/vnd.docker.container.image.v1+json']
const layerTypes=['application/vnd.oci.image.layer.v1.tar+gzip','application/vnd.oci.image.layer.v1.tar','application/vnd.docker.image.rootfs.diff.tar.gzip']
const sha256=/^sha256:[a-f0-9]{64}$/
const fixedEnvironment={NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',HOSTNAME:'0.0.0.0',PORT:'3000',TZ:'UTC'}
const optionalBaseEnvironment={PATH:'/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',LANG:'C.UTF-8',HOME:'/home/nonroot',SSL_CERT_FILE:'/etc/ssl/certs/ca-certificates.crt',SSL_CERT_DIR:'/etc/ssl/certs'}
function validRuntimeEnvironment(values){
 if(!Array.isArray(values))return false
 const seen=new Set(),allowed={...fixedEnvironment,...optionalBaseEnvironment}
 for(const value of values){
  if(typeof value!=='string')return false
  const index=value.indexOf('='),name=value.slice(0,index)
  if(index<1||seen.has(name)||!Object.hasOwn(allowed,name)||value.slice(index+1)!==allowed[name])return false
  seen.add(name)
 }
 return Object.keys(fixedEnvironment).every(name=>seen.has(name))
}
function jsonBytes(value){
 if(!Buffer.isBuffer(value)||value.length===0||value.length>1024*1024)throw Error('STAGING_OCI_BYTES_INVALID')
 try{const parsed=JSON.parse(value.toString('utf8'));if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error();return parsed}catch{throw Error('STAGING_OCI_JSON_INVALID')}
}
// Requires actual raw registry response bytes. Labels/structural validation
// bind evidence; they do not prove source authenticity, scan or private access.
// OCI indexes/attestations require a separately reviewed resolver; fail closed.
export function registryImageEvidence({manifestBytes,configBytes,requestedDigest,expected}){
 const manifest=jsonBytes(manifestBytes),config=jsonBytes(configBytes)
 if(!sha256.test(requestedDigest??'')||'sha256:'+digest(manifestBytes)!==requestedDigest)throw Error('STAGING_OCI_MANIFEST_HASH_MISMATCH')
 if(manifest.schemaVersion!==2||!manifestTypes.includes(manifest.mediaType)||!configTypes.includes(manifest.config?.mediaType)||manifest.config?.urls!==undefined||manifest.config?.size!==configBytes.length||manifest.config?.digest!=='sha256:'+digest(configBytes))throw Error('STAGING_OCI_CONFIG_BINDING_INVALID')
 if(!Array.isArray(manifest.layers)||!manifest.layers.length||manifest.layers.some(layer=>!layerTypes.includes(layer.mediaType)||!sha256.test(layer.digest??'')||!Number.isSafeInteger(layer.size)||layer.size<=0||layer.urls!==undefined))throw Error('STAGING_OCI_LAYERS_INVALID')
 if(config.rootfs?.type!=='layers'||!Array.isArray(config.rootfs.diff_ids)||config.rootfs.diff_ids.length!==manifest.layers.length||config.rootfs.diff_ids.some(value=>!sha256.test(value??'')))throw Error('STAGING_OCI_ROOTFS_INVALID')
 const runtime=config.config,labels=runtime?.Labels
 if(config.os!=='linux'||config.architecture!=='amd64'||runtime?.User!=='65532:65532'||JSON.stringify(runtime.Entrypoint)!==JSON.stringify(['/nodejs/bin/node'])||JSON.stringify(runtime.Cmd)!==JSON.stringify(['scripts/platform/entrypoint.mjs'])||!runtime.ExposedPorts||Object.keys(runtime.ExposedPorts).join(',')!=='3000/tcp')throw Error('STAGING_OCI_RUNTIME_INVALID')
 if(!validRuntimeEnvironment(runtime.Env))throw Error('STAGING_OCI_RUNTIME_BINDINGS_FORBIDDEN')
 const names={source:'org.opencontainers.image.revision',tree:'io.crm.source.tree',lockfile_sha256:'io.crm.lockfile.sha256',dockerfile_sha256:'io.crm.dockerfile.sha256',public_build_sha256:'io.crm.public-build.sha256'}
 if(!expected||Object.entries(names).some(([field,label])=>!(field==='source'||field==='tree'?/^[a-f0-9]{40}$/:/^[a-f0-9]{64}$/).test(expected[field]??'')||labels?.[label]!==expected[field]))throw Error('STAGING_OCI_LABEL_BINDING_MISMATCH')
 // Raw OCI bytes cannot establish registry privacy or source authenticity.
 // Do not manufacture the private visibility required by validateReceipt.
 return {version:'staging.oci.structural-evidence.v1',...Object.fromEntries(Object.keys(names).map(key=>[key,expected[key]])),image_config_digest:manifest.config.digest,manifest_digest:requestedDigest,image_reference:imageRepository+'@'+requestedDigest,registry_visibility:'NOT_VERIFIED',source_authenticity:'NOT_VERIFIED',publishable:false}
}
