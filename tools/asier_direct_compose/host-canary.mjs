// Owned GitHub disposable-runner canary only; never part of the CRM image entrypoint.
import {createServer} from 'node:net'
if(!process.send||process.env.CRM_OWNED_HOST_CANARY!=='true')throw Error('IPC_LAB_CANARY_ONLY')
const sockets=new Set()
const server=createServer(s=>{sockets.add(s);s.once('close',()=>sockets.delete(s));s.end('CRM_DIRECT_OWNED_HOST_CANARY')})
server.listen(0,'0.0.0.0',()=>process.send({port:server.address().port}))
process.on('message',m=>{if(m==='close'){for(const s of sockets)s.destroy();server.close(()=>process.exit(0))}})
process.on('disconnect',()=>{for(const s of sockets)s.destroy();server.close(()=>process.exit(0))})
