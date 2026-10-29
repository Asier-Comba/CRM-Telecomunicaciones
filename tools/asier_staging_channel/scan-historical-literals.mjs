import {createHash} from 'node:crypto'
import {open,lstat,realpath} from 'node:fs/promises'
import {constants} from 'node:fs'
import {resolve,join,sep} from 'node:path'
import {Readable,Transform} from 'node:stream'
import {createGunzip} from 'node:zlib'
import {registryImageEvidence} from './oci-evidence.mjs'
import {openPrivateScanInputV1,isPrivateScanInputV1} from './private-scan-input.mjs'

// Inactive library: no CLI, network, subprocess, registry, provider or deployment.
// Only exact ORIGINAL literal bytes are compared. Encoded/nested payloads and
// generic/vulnerability scans require separate evidence; this is not release authority.
const hash=b=>createHash('sha256').update(b).digest('hex')
class ScanFailure extends Error{}
const fail=code=>{throw new ScanFailure(code)}
const SHA=/^sha256:[a-f0-9]{64}$/
const META=1024*1024
const defaults=Object.freeze({compressed:1024**3,totalCompressed:4*1024**3,expanded:4*1024**3,totalExpanded:12*1024**3,entry:1024**3,entries:1000000,milliseconds:120000})
const rows=[
 ['029c404ea72bfa8a664d823ef131d0b3f10920ee54177ca7279ee96c83dea0db','cef391a6c05d45a88d3d3b07a5a114d1648607bd',20,'7bc6c631c4e94481e87a5cb9a799d4d25240f1a08d593f3e8438e0d0801779e9',3,50],
 ['10a76c432e5cf37e6e5a48c380d77a37a3ece7201a27cd7cb697281f5e1bd0f2','cef391a6c05d45a88d3d3b07a5a114d1648607bd',18,'ce8a7296e283301c753474de3f391c7e5a7adb544564d69d326fc2bc0e468b2e',3,54],
 ['12e712000e4439ab51c92a7685210ae60fd0394fac21de62bad198c395d1097d','cef391a6c05d45a88d3d3b07a5a114d1648607bd',17,'905504d61c3877b44603ddf4dea408ce370f2c99dc5b3b6a8b927547ee16e6c3',3,49],
 ['621bbaeb04c61d12fce592d2e146936e5e898b23f25519eb6d094fae80bffd5e','cef391a6c05d45a88d3d3b07a5a114d1648607bd',19,'d4dac003064393abce68a950fc9bfbb0299ccdaeacda4a6267184aebed97b921',3,55],
 ['6e8425975686128e2a6c210f9e657921b491cc5aa2dd813ed327c4c80c3542bb','cef391a6c05d45a88d3d3b07a5a114d1648607bd',22,'4bbc6daf931365004782fef6e5a4a13430da5e2c7716b5352b1a88e7bc1cb857',3,46],
 ['9c9adcd5a05457464cd5937a3e21d885ed760e6dd0d40cd770f14cbc51bbef91','69ab3ef7852b178ac27d4da6b8789d89bafb2e81',64,'7d763a9f5021fc7ed191c7da137b13bfa561bffb9ad80e30349f3582db8063ce',71,85],
 ['b69b7b483433dc70b46d8395e2fa02aa40a7647b21ca88541a1d995ed4b4bc2f','dc40e3aa6b0ce07169bd25fa34bbef3f2dc1523f',9,'528ff060cff6a06250d11773bd0c65e7ffd10c757980ffe206dbc725e1c91ce1',16,38],
 ['c1fa2dd54c0efc2fbefa782ee48af44420bb325c2efc34dad87d6fb2e87c2cf6','cef391a6c05d45a88d3d3b07a5a114d1648607bd',21,'4147477dee65a4ce47435dc458e1240e8c43b1208b77fcab5d91e18ddf54603f',3,44],
 ['e55ccd8a834d16f99a15b2ef525ef51f45a083501b983fbeabdd4bd4313b4f4e','cef391a6c05d45a88d3d3b07a5a114d1648607bd',9,'fd8d2e399087587bed790e715915fb98b76ef54313947e3a57acf7a416845ed1',3,65],
 ['ef3a54a5582bc0050ba76eee40c04eaab1677725839fde06554d3f275fdd01b9','cef391a6c05d45a88d3d3b07a5a114d1648607bd',14,'bb4f3278f63ed7ca26f941f150ac0fcf5caf7aa37140e00cf32ae609e68f21a5',3,70]
]
export const historicalLiteralDescriptorsV1=Object.freeze(rows.map(([id,blob,line,line_sha256,start,end])=>Object.freeze({id,blob,line,line_sha256,start,end})))
export const historicalLiteralDescriptorSha256V1=hash(Buffer.from(JSON.stringify(historicalLiteralDescriptorsV1)))

// Low-level byte extractor, not evidence authority. Caller must use pinned rows.
// No regex or JS evaluation, decoding, guessing or surrounding excerpt is returned.
export function extractPinnedHistoricalLiteralV1(blob,descriptor){
 if(!Buffer.isBuffer(blob)||blob.length===0||blob.length>META)fail('HISTORY_BLOB_INVALID')
 if(createHash('sha1').update(Buffer.from('blob '+blob.length+'\0')).update(blob).digest('hex')!==descriptor.blob)fail('HISTORY_BLOB_MISMATCH')
 const lines=blob.toString('utf8').split(/\r?\n/),text=lines[descriptor.line-1]
 if(text===undefined||hash(Buffer.from(text))!==descriptor.line_sha256||!/^[\x00-\x7f]*$/.test(text))fail('HISTORY_LINE_MISMATCH')
 const {start,end}=descriptor
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<1||end<=start||end>=text.length||text[start-1]!=="'"||text[end]!=="'"||/['\\\r\n]/.test(text.slice(start,end)))fail('HISTORY_EXTRACTION_AMBIGUOUS')
 return Buffer.from(text.slice(start,end))
}

// Pure streaming matcher exported for synthetic unit tests. No acceptance flag.
export function literalByteMatcherV1(needles){
 if(!Array.isArray(needles)||!needles.length||needles.length>10||needles.some(n=>!n||!Buffer.isBuffer(n.bytes)||n.bytes.length<10||n.bytes.length>4096||typeof n.id!=='string'))fail('NEEDLES_INVALID')
 const overlap=Math.max(...needles.map(n=>n.bytes.length))-1,hits=new Set()
 let tail=Buffer.alloc(0),bytes=0
 return {feed(chunk){if(!Buffer.isBuffer(chunk))fail('BYTES_REQUIRED');const window=Buffer.concat([tail,chunk]);bytes+=chunk.length;for(const n of needles)if(window.includes(n.bytes))hits.add(n.id);tail=Buffer.from(window.subarray(Math.max(0,window.length-overlap)))},
 finish(){tail.fill(0);tail=Buffer.alloc(0);return{matched_ids:[...hits].sort(),bytes}}}
}
function limitsV1(overrides={}){
 if(!overrides||typeof overrides!=='object'||Array.isArray(overrides))fail('LIMITS_INVALID')
 const result={...defaults}
 for(const [k,v] of Object.entries(overrides)){if(!Object.hasOwn(defaults,k)||!Number.isSafeInteger(v)||v<1||v>defaults[k])fail('LIMITS_INVALID');result[k]=v}
 return result
}
function parsed(bytes){try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))}catch{fail('METADATA_INVALID')}}
function descriptor(d){if(!d||!SHA.test(d.digest)||!Number.isSafeInteger(d.size)||d.size<1||d.urls!==undefined||d.data!==undefined)fail('DESCRIPTOR_INVALID');return d}
function safeName(name){return typeof name==='string'&&name.length<=4096&&!name.includes('\0')&&!name.includes('\\')&&!name.startsWith('/')&&!/^[A-Za-z]:/.test(name)&&!name.split('/').includes('..')}
const cstr=b=>{const zero=b.indexOf(0);if(zero>=0&&b.subarray(zero).some(v=>v!==0))fail('TAR_HEADER_INVALID');try{return new TextDecoder('utf8',{fatal:true}).decode(zero<0?b:b.subarray(0,zero))}catch{fail('TAR_HEADER_INVALID')}}
function octal(b){const s=b.toString('ascii').replace(/\0.*$/,'').trim();if(!/^[0-7]+$/.test(s))fail('TAR_NUMBER_UNSUPPORTED');const n=parseInt(s,8);if(!Number.isSafeInteger(n)||n<0)fail('TAR_NUMBER_UNSUPPORTED');return n}
function paxFields(buf){
 const result={};let i=0
 while(i<buf.length){const space=buf.indexOf(32,i);if(space<0||space-i>9)fail('PAX_INVALID');const count=buf.subarray(i,space).toString('ascii');if(!/^[1-9][0-9]*$/.test(count))fail('PAX_INVALID');const n=Number(count);if(n<5||i+n>buf.length||buf[i+n-1]!==10)fail('PAX_INVALID');const pair=buf.subarray(space+1,i+n-1);const eq=pair.indexOf(61);if(eq<1)fail('PAX_INVALID');const key=pair.subarray(0,eq).toString('ascii');if(!['path','linkpath','mtime','atime','ctime','uid','gid','uname','gname'].includes(key)||Object.hasOwn(result,key))fail('PAX_UNSUPPORTED');try{result[key]=new TextDecoder('utf8',{fatal:true}).decode(pair.subarray(eq+1))}catch{fail('PAX_INVALID')};i+=n}
 return result
}
// Validates tar framing while scanning ALL uncompressed bytes, including names,
// headers, metadata, deleted/overwritten payload and padding. Never extracts or
// follows any member. PAX size/sparse/GNU extensions fail closed, not skipped.
async function validateLayerTar(chunks,matcher,state){
 const iterator=chunks[Symbol.asyncIterator]();let pending=Buffer.alloc(0),ended=false,total=0
 const take=async n=>{while(pending.length<n&&!ended){const next=await iterator.next();if(next.done){ended=true;break}const b=next.value;state.tick();total+=b.length;state.expanded+=b.length;if(total>state.limits.expanded||state.expanded>state.limits.totalExpanded)fail('EXPANDED_LIMIT');matcher.feed(b);state.diff.update(b);pending=Buffer.concat([pending,b])}
 if(pending.length<n)fail('TAR_TRUNCATED');const b=pending.subarray(0,n);pending=pending.subarray(n);return b}
 let members=0,pax=null
 try{
  while(true){
   const h=await take(512)
   if(h.every(v=>v===0)){
    if(!(await take(512)).every(v=>v===0)||pax!==null)fail('TAR_TRAILER_INVALID')
    while(pending.length||!ended){if(pending.some(v=>v!==0))fail('TAR_TRAILER_INVALID');pending=Buffer.alloc(0);if(!ended){const next=await iterator.next();if(next.done){ended=true;break}state.tick();const b=next.value;total+=b.length;state.expanded+=b.length;if(total>state.limits.expanded||state.expanded>state.limits.totalExpanded)fail('EXPANDED_LIMIT');matcher.feed(b);state.diff.update(b);pending=b}}
    return{members,expanded_bytes:total}
   }
   if(++members>state.limits.entries)fail('TAR_ENTRY_LIMIT')
   const checksum=octal(h.subarray(148,156));let sum=0;for(let i=0;i<512;i++)sum+=i>=148&&i<156?32:h[i];if(sum!==checksum)fail('TAR_CHECKSUM_INVALID')
   const magic=h.subarray(257,263).toString('ascii');if(magic!=='ustar\0'&&magic!=='ustar ')fail('TAR_FORMAT_UNSUPPORTED')
   const type=String.fromCharCode(h[156]||48),size=octal(h.subarray(124,136)),prefix=cstr(h.subarray(345,500))
   let name=(prefix?prefix+'/':'')+cstr(h.subarray(0,100)),link=cstr(h.subarray(157,257))
   if(!safeName(name)||size>state.limits.entry)fail('TAR_ENTRY_INVALID')
   if(type==='x'){
    if(pax!==null||size>META)fail('PAX_INVALID')
    pax=paxFields(await take(size));if((await take((512-size%512)%512)).some(v=>v!==0))fail('TAR_PADDING_INVALID');continue
   }
   if(!['0','1','2','3','4','5','6'].includes(type))fail('TAR_TYPE_UNSUPPORTED')
   if(pax){name=pax.path??name;link=pax.linkpath??link;pax=null}
   if(!safeName(name)||(type==='1'&&!safeName(link))||(type!=='0'&&size!==0))fail('TAR_ENTRY_INVALID')
   // Symlink target text is scanned but never resolved; absolute symlinks in
   // base images are inert metadata, not filesystem operations.
   let remaining=size;while(remaining){const n=Math.min(remaining,65536);await take(n);remaining-=n}
   if((await take((512-size%512)%512)).some(v=>v!==0))fail('TAR_PADDING_INVALID')
  }
 }finally{await iterator.return?.()}
}
async function ownedLayout(root){
 if(isPrivateScanInputV1(root))return root
 if(typeof root!=='string'||resolve(root)!==root)fail('OCI_LAYOUT_DIRECTORY_REQUIRED')
 if(!(await lstat(root)).isDirectory()||(await lstat(root)).isSymbolicLink()||await realpath(root)!==root)fail('OCI_LAYOUT_DIRECTORY_REQUIRED')
 for(const p of ['blobs','blobs/sha256']){const s=await lstat(join(root,p));if(!s.isDirectory()||s.isSymbolicLink())fail('OCI_LAYOUT_SYMLINK')}
 return root
}
async function* fileChunks(root,relative,max,state){
 state.tick()
 if(isPrivateScanInputV1(root)){
  for await(const bytes of root.chunks(relative,max)){state.tick();yield Buffer.from(bytes)}
  return
 }
 const path=join(root,relative)
 if(!path.startsWith(root+sep))fail('OCI_LAYOUT_PATH_INVALID')
 const before=await lstat(path)
 if(!before.isFile()||before.isSymbolicLink()||before.size<1||before.size>max||await realpath(path)!==path)fail('OCI_FILE_INVALID')
 const handle=await open(path,constants.O_RDONLY|(constants.O_NOFOLLOW??0));let stream
 try{
  const stat=await handle.stat();if(!stat.isFile()||stat.dev!==before.dev||stat.ino!==before.ino||stat.size!==before.size)fail('OCI_FILE_CHANGED')
  let count=0;stream=handle.createReadStream({autoClose:false,highWaterMark:65536})
  for await(const b of stream){state.tick();count+=b.length;if(count>max)fail('OCI_FILE_LIMIT');yield b}
  const after=await handle.stat();if(count!==stat.size||after.size!==stat.size||after.mtimeMs!==stat.mtimeMs||after.ctimeMs!==stat.ctimeMs)fail('OCI_FILE_CHANGED')
 }finally{stream?.destroy();await handle.close()}
}
async function smallFile(root,relative,state,d){
 const chunks=[];let size=0
 for await(const b of fileChunks(root,relative,META,state)){size+=b.length;if(size>META)fail('METADATA_LIMIT');chunks.push(b)}
 const bytes=Buffer.concat(chunks)
 if(d&&(bytes.length!==d.size||'sha256:'+hash(bytes)!==d.digest))fail('BLOB_DIGEST_MISMATCH')
 return bytes
}
const blobPath=d=>'blobs/sha256/'+descriptor(d).digest.slice(7)

// Low-level OCI reader returns actual byte coverage, NOT history extraction or
// provenance acceptance. Test needles are never accepted by the public wrapper.
export async function scanSavedOciLayersV1({layout,expected,needles,limits}={}){
 const lim=limitsV1(limits),started=Date.now()
 const state={limits:lim,expanded:0,tick(){if(Date.now()-started>lim.milliseconds)fail('SCAN_DEADLINE')}}
 const root=await ownedLayout(layout),metadataMatcher=literalByteMatcherV1(needles),matched=new Set(),coverage=[]
 const layoutBytes=await smallFile(root,'oci-layout',state)
 if(parsed(layoutBytes).imageLayoutVersion!=='1.0.0')fail('OCI_LAYOUT_VERSION_UNSUPPORTED')
 const indexBytes=await smallFile(root,'index.json',state),index=parsed(indexBytes)
 if(index.schemaVersion!==2||!Array.isArray(index.manifests)||index.manifests.length!==1||index.manifests[0].mediaType!=='application/vnd.oci.image.manifest.v1+json')fail('OCI_INDEX_UNSUPPORTED')
 const md=descriptor(index.manifests[0])
 if(md.digest!==expected?.manifest_digest)fail('EXPECTED_MANIFEST_MISMATCH')
 const manifestBytes=await smallFile(root,blobPath(md),state,md),manifest=parsed(manifestBytes)
 const cd=descriptor(manifest.config),configBytes=await smallFile(root,blobPath(cd),state,cd)
 const image=registryImageEvidence({manifestBytes,configBytes,requestedDigest:md.digest,expected})
 if(image.image_config_digest!==expected.image_config_digest)fail('EXPECTED_CONFIG_MISMATCH')
 for(const b of [layoutBytes,indexBytes,manifestBytes,configBytes]){metadataMatcher.feed(b);for(const id of metadataMatcher.finish().matched_ids)matched.add(id)}
 const config=parsed(configBytes)
 let compressedTotal=0
 for(let i=0;i<manifest.layers.length;i++){
  const layer=descriptor(manifest.layers[i]);if(layer.size>lim.compressed)fail('COMPRESSED_LIMIT')
  const matcher=literalByteMatcherV1(needles),compressedHash=createHash('sha256');state.diff=createHash('sha256')
  let compressed=0
  const source=Readable.from(fileChunks(root,blobPath(layer),lim.compressed,state))
  const tap=new Transform({transform(b,_encoding,done){try{state.tick();compressed+=b.length;compressedTotal+=b.length;if(compressed>layer.size||compressedTotal>lim.totalCompressed)fail('COMPRESSED_LIMIT');compressedHash.update(b);done(null,b)}catch(e){done(e)}}})
  let output,zip
  source.on('error',e=>tap.destroy(e));source.pipe(tap)
  if(layer.mediaType.endsWith('+gzip')||layer.mediaType.endsWith('.gzip')){zip=createGunzip({chunkSize:65536});tap.on('error',e=>zip.destroy(e));tap.pipe(zip);output=zip}
  else if(layer.mediaType==='application/vnd.oci.image.layer.v1.tar')output=tap
  else{source.destroy();tap.destroy();fail('LAYER_MEDIA_UNSUPPORTED')}
  try{
   const stats=await validateLayerTar(output,matcher,state)
   if(compressed!==layer.size||'sha256:'+compressedHash.digest('hex')!==layer.digest)fail('LAYER_DIGEST_MISMATCH')
   const diff='sha256:'+state.diff.digest('hex');if(diff!==config.rootfs.diff_ids[i])fail('LAYER_DIFF_ID_MISMATCH')
   const hits=matcher.finish();for(const id of hits.matched_ids)matched.add(id)
   coverage.push({digest:layer.digest,diff_id:diff,...stats})
  }finally{output.destroy();zip?.destroy();tap.destroy();source.destroy()}
 }
 return{scope:'EXACT_ORIGINAL_BYTES_ALL_OCI_LAYERS_CONFIG_HISTORY',identity:image,manifest_layer_count:manifest.layers.length,verified_layer_count:coverage.length,scanned_layer_count:coverage.length,compressed_bytes:compressedTotal,expanded_bytes:state.expanded,matched_ids:[...matched].sort(),layers:coverage,transformed_or_nested_payloads:'NOT_DECODED',source_authenticity:'NOT_VERIFIED'}
}

// readHistoricalBlob is an explicit trusted transport capability for the THREE
// pinned blobs only. The scanner computes object/line identity itself. Cleanup
// owns any transfer storage created by that port, and must verify its absence.
// No byte value or caught exception is serialized, even on partial failure.
export async function scanHistoricalLiteralsV1({layout,expected,readHistoricalBlob,cleanupHistory,limits}={}){
 const result={version:'staging.historical-literal-scan.v1',result:'BLOCKED',scope:'EXACT_HISTORICAL_ORIGINAL_BYTES_ONLY',expected_findings:10,resolved_findings:0,matched_finding_count:null,descriptor_sha256:historicalLiteralDescriptorSha256V1,cleanup:'NOT_STARTED',error:null,publishing_authorized:false,deploying_authorized:false,security_accepted:false}
 const owned=[],blobs=new Map(),needles=[];let attempted=false
 try{
  if(typeof readHistoricalBlob!=='function'||typeof cleanupHistory!=='function')fail('HISTORY_PORTS_REQUIRED')
  for(const d of historicalLiteralDescriptorsV1){
   if(!blobs.has(d.blob)){attempted=true;const raw=await readHistoricalBlob(d.blob);if(!Buffer.isBuffer(raw)||raw.length===0||raw.length>META)fail('HISTORY_BLOB_INVALID');const b=Buffer.from(raw);blobs.set(d.blob,b);owned.push(b)}
   const bytes=extractPinnedHistoricalLiteralV1(blobs.get(d.blob),d);owned.push(bytes);needles.push({id:d.id,bytes});result.resolved_findings++
  }
  const coverage=await scanSavedOciLayersV1({layout,expected,needles,limits})
  result.coverage=coverage;result.matched_finding_count=coverage.matched_ids.length
  result.result=coverage.matched_ids.length?'FAIL':'PASS'
 }catch(error){result.error=error instanceof ScanFailure?error.message:'HISTORICAL_SCAN_BLOCKED';result.result='BLOCKED'}
 finally{
  for(const b of owned)b.fill(0)
  if(attempted){try{if(await cleanupHistory()!==true)fail('CLEANUP_NOT_CONFIRMED');result.cleanup='PASS'}catch{result.cleanup='FAIL';result.result='BLOCKED';result.error='HISTORY_CLEANUP_FAILED'}}
 }
 return result
}

// Operational intake for pre-materialized LOCAL private files only. The caller
// explicitly transfers ownership of an exact three-file disposable directory.
// No arbitrary reader/cleanup callback can assert this boundary was verified.
// Existing low-level readers remain test/legacy trusted-port interfaces.
export async function scanPrivateHistoricalLiteralsV1({layout,historyDirectory,consumeHistoryDirectory,expected,limits}={}){
 const blocked={version:'staging.private-historical-input.v1',result:'BLOCKED',input_boundary:'NOT_VERIFIED',resolved_findings:0,cleanup:'NOT_STARTED',error:'PRIVATE_INPUT_BLOCKED',publishing_authorized:false,deploying_authorized:false,security_accepted:false}
 let image,history,result=blocked
 const transfers=[]
 try{
  if(consumeHistoryDirectory!==true||typeof layout!=='string'||typeof historyDirectory!=='string'||layout===historyDirectory||layout.startsWith(historyDirectory+'/')||historyDirectory.startsWith(layout+'/'))fail('PRIVATE_INPUT_BLOCKED')
  image=await openPrivateScanInputV1(layout)
  const names=[...new Set(historicalLiteralDescriptorsV1.map(d=>d.blob))]
  history=await openPrivateScanInputV1(historyDirectory,{historyNames:names})
  result=await scanHistoricalLiteralsV1({layout:image,expected,limits,
   readHistoricalBlob:async id=>{const bytes=await history.read(id,META);transfers.push(bytes);return bytes},
   cleanupHistory:async()=>{let valid=true;try{await history.verify()}catch{valid=false}await history.consumeHistory();if(!valid)fail('PRIVATE_INPUT_BLOCKED');return true}
  })
  await image.verify()
  result.input_boundary='LINUX_FD_PINNED_PRIVATE_LOCAL_INPUT'
 }catch{
  result={...result,result:'BLOCKED',input_boundary:'NOT_VERIFIED',error:'PRIVATE_INPUT_BLOCKED'}
 }finally{
  for(const bytes of transfers)bytes.fill(0)
  // Setup failure after accepting transfer still attempts its owned cleanup.
  if(history&&result.cleanup==='NOT_STARTED')try{await history.consumeHistory();result.cleanup='PASS'}catch{result.cleanup='FAIL'}
  for(const session of [history,image])if(session)try{await session.close()}catch{result.result='BLOCKED';result.error='PRIVATE_INPUT_CLOSE_FAILED'}
 }
 return result
}

