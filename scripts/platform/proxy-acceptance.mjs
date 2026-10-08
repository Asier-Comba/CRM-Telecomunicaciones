import {createServer} from 'node:http'
import {request} from 'node:https'
import {spawnSync,spawn} from 'node:child_process'
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {root,hash,run} from './lib.mjs'
if(process.platform!=='linux'||process.env.GITHUB_ACTIONS!=='true')throw new Error('DISPOSABLE_LINUX_RUNNER_ONLY')
const scratch=mkdtempSync(join(tmpdir(),'w5-proxy-')),checks=[],source_sha=run('git',['rev-parse','HEAD']).trim()
let nginx,server
const prove=(ok,name)=>{if(!ok)throw new Error(name);checks.push({name,status:'PASS'})}
const cert=join(scratch,'cert.pem'),key=join(scratch,'key.pem'),log=join(scratch,'metadata.log')
function fetchProxy(path,options={}){return new Promise((resolve,reject)=>{
 const r=request({host:'127.0.0.1',port:18443,servername:'example.invalid',ca:readFileSync(cert),path,headers:{host:'example.invalid',...options.headers},method:options.method??'GET'},response=>{const chunks=[];let first=0;response.on('data',b=>{if(!first)first=Date.now();chunks.push(b)});response.on('end',()=>resolve({status:response.statusCode,headers:response.headers,body:Buffer.concat(chunks).toString(),first,ended:Date.now()}))});r.on('error',reject);r.setTimeout(5000,()=>r.destroy(new Error('PROXY_TIMEOUT')));if(options.body)r.write(options.body);r.end()
})}
try{
 const generated=spawnSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=example.invalid','-addext','subjectAltName=DNS:example.invalid'],{stdio:'ignore',timeout:15000});prove(generated.status===0,'LOCAL_CERT_GENERATED')
 const template=readFileSync(join(root,'infra/deployment/nginx.conf.template'),'utf8'),bindings={APP_HOST:'example.invalid',TLS_CERT_PATH:cert,TLS_KEY_PATH:key,NGINX_METADATA_LOG_PATH:log}
 const rendered=template.replace(/\$\{([A-Z_]+)\}/g,(_s,name)=>{if(!bindings[name])throw new Error('PROXY_BINDING_MISSING');return bindings[name]}).replace('listen 80 default_server','listen 18080 default_server').replace('listen 443 ssl','listen 18443 ssl')
 const config=join(scratch,'nginx.conf');writeFileSync(config,`pid ${scratch}/nginx.pid;\nerror_log stderr crit;\nevents {}\nhttp {\naccess_log off;\nclient_body_temp_path ${scratch}/client_body;\nproxy_temp_path ${scratch}/proxy_temp;\nfastcgi_temp_path ${scratch}/fastcgi_temp;\nuwsgi_temp_path ${scratch}/uwsgi_temp;\nscgi_temp_path ${scratch}/scgi_temp;\n${rendered}\n}\n`)
 const syntax=spawnSync('nginx',['-p',scratch,'-c',config,'-t'],{encoding:'utf8'})
 if(syntax.status!==0)throw new Error(/Permission denied/.test(syntax.stderr??'')?'NGINX_SYNTAX_PERMISSION':/unknown directive|invalid parameter|invalid number/.test(syntax.stderr??'')?'NGINX_SYNTAX_DIRECTIVE':'ACTUAL_NGINX_SYNTAX')
 prove(true,'ACTUAL_NGINX_SYNTAX')
 server=createServer((req,res)=>{
  if(req.url.startsWith('/api/headers')){res.setHeader('Cache-Control','public,max-age=999');res.end(JSON.stringify({host:req.headers.host,forwarded_host:req.headers['x-forwarded-host'],proto:req.headers['x-forwarded-proto'],client:req.headers['x-forwarded-for']}))}
  else if(req.url==='/api/events'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'public'});res.write('data: first\n\n');setTimeout(()=>res.end('data: final\n\n'),2000)}
  else{res.statusCode=503;res.end('synthetic unavailable')}
 });server.on('upgrade',(req,socket)=>{socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n');socket.end(Buffer.from([0x81,2,0x6f,0x6b]))})
 await new Promise(r=>server.listen(3000,'127.0.0.1',r));nginx=spawn('nginx',['-p',scratch,'-c',config,'-g','daemon off;'],{stdio:'ignore'})
 let ready=false;for(let i=0;i<30;i++){try{await fetchProxy('/api/headers');ready=true;break}catch{}await new Promise(r=>setTimeout(r,100))}prove(ready,'TLS_PROXY_STARTED')
 const response=await fetchProxy('/api/headers?canary-private',{headers:{'x-forwarded-for':'private-canary','x-forwarded-host':'wrong.invalid','x-forwarded-proto':'http'}}),headers=JSON.parse(response.body)
 prove(headers.host==='example.invalid'&&headers.forwarded_host==='example.invalid'&&headers.proto==='https'&&headers.client==='127.0.0.1','FORWARDED_HEADERS_REPLACED')
 prove(response.headers['cache-control']==='private, no-store','PRIVATE_NO_STORE')
 const failed=await fetchProxy('/api/error');prove(failed.status===503&&failed.headers['cache-control']==='private, no-store','ERROR_NO_STORE')
 const events=await fetchProxy('/api/events');prove(events.body==='data: first\n\ndata: final\n\n'&&events.ended-events.first>=1500,'ACTUAL_SSE_STREAMING')
 const upgraded=await new Promise((resolve,reject)=>{const r=request({host:'127.0.0.1',port:18443,servername:'example.invalid',ca:readFileSync(cert),path:'/api/socket',headers:{Host:'example.invalid',Upgrade:'websocket',Connection:'Upgrade'}},()=>reject(new Error('UPGRADE_NOT_FORWARDED')));r.on('upgrade',(res,socket,head)=>{let bytes=head;socket.on('data',b=>bytes=Buffer.concat([bytes,b]));socket.on('end',()=>resolve(res.statusCode===101&&bytes.equals(Buffer.from([0x81,2,0x6f,0x6b]))));socket.setTimeout(3000,()=>socket.destroy())});r.on('error',reject);r.end()});prove(upgraded,'ACTUAL_UPGRADE_FORWARDING')
 let unknown=false;try{await fetchProxy('/api/headers',{headers:{Host:'wrong.invalid'}})}catch{unknown=true}prove(unknown,'UNKNOWN_TLS_HOST_REJECTED')
 const tooLarge=await fetchProxy('/api/body',{method:'POST',body:Buffer.alloc(10*1024*1024+1)});prove(tooLarge.status===413,'BODY_LIMIT_ENFORCED')
 await new Promise(r=>setTimeout(r,100));const logs=readFileSync(log,'utf8');prove(!/canary|headers|events|example|127\.0/.test(logs),'METADATA_LOG_NO_REQUEST_PAYLOAD')
 console.log(JSON.stringify({status:'PASS',scope:'DISPOSABLE_ACTUAL_NGINX_TLS_PROXY',source_sha,nginx_version:spawnSync('nginx',['-v'],{encoding:'utf8'}).stderr.trim(),configuration_sha256:hash(template),checks,production_tls:'NOT_PROVEN'}))
}catch(e){console.log(JSON.stringify({status:'FAIL',source_sha,checks,error:/^[A-Z][A-Z0-9_]+$/.test(e.message)?e.message:'PROXY_ACCEPTANCE_FAILURE'}));process.exitCode=1}
finally{if(nginx){nginx.kill('SIGTERM');await new Promise(r=>{if(nginx.exitCode!==null)return r();nginx.once('exit',r);setTimeout(()=>{nginx.kill('SIGKILL');r()},3000).unref()})}if(server){server.closeAllConnections();await new Promise(r=>server.close(r))}rmSync(scratch,{recursive:true,force:true})}
