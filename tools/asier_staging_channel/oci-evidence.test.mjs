import {test} from 'node:test'
import assert from 'node:assert/strict'
import {digest,validateReceipt} from './contract.mjs'
import {registryImageEvidence} from './oci-evidence.mjs'
const expected={source:'a'.repeat(40),tree:'b'.repeat(40),lockfile_sha256:'c'.repeat(64),dockerfile_sha256:'d'.repeat(64),public_build_sha256:'e'.repeat(64)}
const config={architecture:'amd64',os:'linux',rootfs:{type:'layers',diff_ids:['sha256:'+'1'.repeat(64)]},config:{User:'65532:65532',WorkingDir:'/app',Entrypoint:['/nodejs/bin/node'],Cmd:['scripts/platform/entrypoint.mjs'],ExposedPorts:{'3000/tcp':{}},Env:['NODE_ENV=production','NEXT_TELEMETRY_DISABLED=1','HOSTNAME=0.0.0.0','PORT=3000','TZ=UTC'],Labels:{'org.opencontainers.image.revision':expected.source,'io.crm.source.tree':expected.tree,'io.crm.lockfile.sha256':expected.lockfile_sha256,'io.crm.dockerfile.sha256':expected.dockerfile_sha256,'io.crm.public-build.sha256':expected.public_build_sha256}}}
const bytes=value=>Buffer.from(JSON.stringify(value))
function fixture(delta={},manifestDelta={}){
 const configBytes=bytes({...config,...delta}),manifest={schemaVersion:2,mediaType:'application/vnd.oci.image.manifest.v1+json',config:{mediaType:'application/vnd.oci.image.config.v1+json',size:configBytes.length,digest:'sha256:'+digest(configBytes)},layers:[{mediaType:'application/vnd.oci.image.layer.v1.tar+gzip',size:123,digest:'sha256:'+'f'.repeat(64)}],...manifestDelta},manifestBytes=bytes(manifest)
 return{manifestBytes,configBytes,requestedDigest:'sha256:'+digest(manifestBytes),expected}
}
test('raw manifest/config bytes bind receipt to a different manifest digest and expected source inputs',()=>{
 const input=fixture(),result=registryImageEvidence(input)
 assert.equal(result.manifest_digest,input.requestedDigest);assert.notEqual(result.manifest_digest,result.image_config_digest)
 assert.equal(result.registry_visibility,'NOT_VERIFIED');assert.equal(result.source_authenticity,'NOT_VERIFIED');assert.equal(result.publishable,false);assert.throws(()=>validateReceipt(result,expected))
 assert.throws(()=>registryImageEvidence({...input,requestedDigest:'sha256:'+digest(input.configBytes)}),/MANIFEST_HASH_MISMATCH/)
 assert.throws(()=>registryImageEvidence({...input,manifestBytes:Buffer.concat([input.manifestBytes,Buffer.from(' ')])}),/MANIFEST_HASH_MISMATCH/)
 assert.throws(()=>registryImageEvidence({...input,configBytes:Buffer.concat([input.configBytes,Buffer.from(' ')])}),/CONFIG_BINDING_INVALID/)
})
test('root, alternate command/platform, extra port and secret/public runtime bindings fail closed',()=>{
 for(const delta of [{User:'0'},{Cmd:['server.js']},{Entrypoint:['/bin/sh']},{ExposedPorts:{'3000/tcp':{},'5432/tcp':{}}},{Env:['SUPABASE_SERVICE_ROLE_KEY=SYNTHETIC']},{Env:['NEXT_PUBLIC_SUPABASE_URL=SYNTHETIC']}])assert.throws(()=>registryImageEvidence(fixture({config:{...config.config,...delta}})))
 assert.throws(()=>registryImageEvidence(fixture({architecture:'arm64'})),/RUNTIME_INVALID/)
 assert.throws(()=>registryImageEvidence(fixture({config:{...config.config,Labels:{...config.config.Labels,'io.crm.source.tree':'f'.repeat(40)}}})),/LABEL_BINDING_MISMATCH/)
})
test('index, external layers and malformed or substituted config objects cannot masquerade as verified image',()=>{
 for(const delta of [{mediaType:'application/vnd.oci.image.index.v1+json'},{layers:[]},{layers:[{mediaType:'application/vnd.oci.image.layer.v1.tar+gzip',size:123,digest:'sha256:'+'f'.repeat(64),urls:['https://unapproved.example.invalid']}]},{config:{mediaType:'application/vnd.oci.image.config.v1+json',size:1,digest:'sha256:'+'f'.repeat(64)}}])assert.throws(()=>registryImageEvidence(fixture({},delta)))
 assert.throws(()=>registryImageEvidence({...fixture(),manifestBytes:Buffer.from('SYNTHETIC_NOT_JSON')}),/JSON_INVALID/)
})
test('required rootfs has ordered uncompressed diff IDs coherent with manifest layer count',()=>{
 for(const rootfs of [undefined,null,{type:'unknown',diff_ids:[]},{type:'layers',diff_ids:[]},{type:'layers',diff_ids:['not-a-digest']},{type:'layers',diff_ids:['sha256:'+'1'.repeat(64),'sha256:'+'2'.repeat(64)]}])assert.throws(()=>registryImageEvidence(fixture({rootfs})),/ROOTFS_INVALID/)
 // A compressed layer digest hashes different bytes than its DiffID. The
 // positive fixture intentionally uses different values; never equate them.
 assert.equal(registryImageEvidence(fixture()).publishable,false)
})
test('runtime environment rejects execution hooks, duplicate bindings, unknown names and changed fixed values',()=>{
 for(const extra of ['NODE_OPTIONS=--require=/app/alternate.cjs','LD_PRELOAD=/app/alternate.so','NODE_PATH=/app/alternate','NODE_ENV=development','PATH=/app/alternate','UNKNOWN=SYNTHETIC','PORT=3000'])assert.throws(()=>registryImageEvidence(fixture({config:{...config.config,Env:[...config.config.Env,extra]}})),/RUNTIME_BINDINGS_FORBIDDEN/)
 assert.throws(()=>registryImageEvidence(fixture({config:{...config.config,Env:config.config.Env.filter(value=>!value.startsWith('NODE_ENV='))}})),/RUNTIME_BINDINGS_FORBIDDEN/)
})
test('OCI digests are strings, never arrays coerced by a regular expression',()=>{
 assert.throws(()=>registryImageEvidence(fixture({rootfs:{type:'layers',diff_ids:[['sha256:'+'1'.repeat(64)]]}})),/ROOTFS_INVALID/)
 assert.throws(()=>registryImageEvidence(fixture({},{layers:[{mediaType:'application/vnd.oci.image.layer.v1.tar+gzip',size:123,digest:['sha256:'+'f'.repeat(64)]}]})),/LAYERS_INVALID/)
})
test('relative platform entrypoint requires exact /app WorkingDir',()=>{
 for(const WorkingDir of [undefined,'/','/tmp','/app/alternate'])assert.throws(()=>registryImageEvidence(fixture({config:{...config.config,WorkingDir}})),/RUNTIME_INVALID/)
})
