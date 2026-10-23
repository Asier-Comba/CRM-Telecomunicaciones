import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import tls from 'node:tls'
import {readFileSync} from 'node:fs'
import {pathToFileURL} from 'node:url'
import {authorityAllowed} from './network-policy.mjs'

export function egressServer(approved,dial=(host,port)=>net.connect({host,port})){
 const server=http.createServer({maxHeaderSize:8192},(_req,res)=>{res.writeHead(405);res.end()})
 server.requestTimeout=5000;server.headersTimeout=5000
 server.on('connect',(req,client,head)=>{
  if(!authorityAllowed(req.url,approved)){client.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return}
  const [host,port]=approved.split(':');const remote=dial(host,Number(port))
  remote.setTimeout(5000,()=>remote.destroy())
  client.setTimeout(5000,()=>client.destroy())
  remote.once('connect',()=>{client.write('HTTP/1.1 200 Connection Established\r\n\r\n');if(head.length)remote.write(head);client.pipe(remote);remote.pipe(client)})
  remote.on('error',()=>client.destroy());client.on('error',()=>remote.destroy())
  client.on('close',()=>remote.destroy());remote.on('close',()=>client.destroy())
 })
 return server
}
function relay(target,port,guard=()=>true){
 return http.createServer({maxHeaderSize:8192},(req,res)=>{
  if(!guard(req)){res.writeHead(403);res.end();return}
  // A fixed target, never an arbitrary URL, Host, CONNECT or Upgrade proxy.
  const upstream=http.request({host:target,port,path:'/',method:'GET',headers:{host:'crm.fixture.test'}},response=>{res.writeHead(response.statusCode,{'cache-control':'no-store'});response.pipe(res)})
  upstream.setTimeout(2000,()=>upstream.destroy())
  upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end()});upstream.end()
 })
}
async function get(url,headers={}){
 try{const r=await fetch(url,{headers,signal:AbortSignal.timeout(2000),redirect:'error'});return {reachable:true,status:r.status,body:await r.text()}}
 catch{return {reachable:false}}
}
async function tunnel(authority,servername){
 return new Promise(resolve=>{
  let finished=false
  const done=value=>{if(!finished){finished=true;resolve(value)}}
  const req=http.request({host:'egress',port:8080,method:'CONNECT',path:authority})
  req.setTimeout(3000,()=>{req.destroy();done({connected:false})})
  req.on('error',()=>done({connected:false}))
  req.on('connect',(response,socket)=>{
   if(response.statusCode!==200){socket.destroy();done({connected:false,status:response.statusCode});return}
   const secure=tls.connect({socket,servername,ca:readFileSync('/ca.pem'),rejectUnauthorized:true})
   secure.setTimeout(3000,()=>secure.destroy())
   let bytes=''
   secure.on('secureConnect',()=>secure.write('GET / HTTP/1.1\r\nHost: supabase.fixture.test\r\nConnection: close\r\n\r\n'))
   secure.on('data',b=>bytes+=b.toString())
   secure.on('error',()=>{secure.destroy();done({connected:false,tls_rejected:true})})
   secure.on('end',()=>done({connected:true,tls_authorized:secure.authorized,upstream:bytes.includes('synthetic-supabase')}))
   secure.on('close',()=>done({connected:false}))
  })
  req.end()
 })
}
export async function fixtureMain(args){
 const role=args[0]
 if(role==='tcp'){
  const result=await new Promise(resolve=>{
   const socket=net.connect({host:args[1],port:Number(args[2])})
   socket.setTimeout(2000,()=>socket.destroy())
   let done=false;const finish=value=>{if(!done){done=true;socket.destroy();resolve(value)}}
   socket.on('connect',()=>finish({connected:true}));socket.on('error',()=>finish({connected:false}));socket.on('close',()=>finish({connected:false}))
  })
  console.log(JSON.stringify(result));return
 }
 if(role==='get'){console.log(JSON.stringify(await get(args[1],args[2]==='admitted'?{'x-lab-access':'admitted'}:{})));return}
 if(role==='tunnel'){console.log(JSON.stringify(await tunnel(args[1],args[2])));return}
 let server,port
 if(role==='app'||role==='victim'){port=3000;server=http.createServer((_q,s)=>s.end(role==='app'?'synthetic-crm':'synthetic-victim'))}
 else if(role==='ingress'){port=8080;server=relay('app',3000,req=>req.headers['x-lab-access']==='admitted')}
 else if(role==='front'){port=8081;server=relay('ingress',8080,()=>false)} // Trusted edge fixture is not an open relay.
 else if(role==='egress'){port=8080;server=egressServer('supabase.fixture.test:8443')}
 else if(role==='supabase'){port=8443;server=https.createServer({cert:readFileSync('/cert.pem'),key:readFileSync('/key.pem')},(_q,s)=>s.end('synthetic-supabase'))}
 else throw new Error('UNKNOWN_LAB_ROLE')
 server.listen(port,'0.0.0.0')
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await fixtureMain(process.argv.slice(2))
