// Disposable lab only. No release entrypoint, private credential or hosted state.
import {createServer} from 'node:http'
import {readFileSync} from 'node:fs'
import {createIngressGateway,createEgressGateway} from './gateway.mjs'
import {stagingEasyPanelOriginV1} from '../../src/lib/server/product-staging-admission-v1.ts'
const role=process.argv[2]
if(process.env.CRM_DISPOSABLE_SWARM_FIXTURE!=='true')throw Error('DISPOSABLE_FIXTURE_REQUIRED')
if(role==='app')createServer((req,res)=>{res.setHeader('x-crm-lab-local-address',req.socket.localAddress);res.end('CRM_LAB_ONLY')}).listen(3000,'0.0.0.0')
else if(role==='canary')createServer((_req,res)=>res.end('OWNED_NETWORK_CANARY')).listen(8081,'0.0.0.0')
else if(role==='egress')createEgressGateway().listen(8080,'0.0.0.0')
else if(role==='ingress'){
 const credentials=JSON.parse(readFileSync('/run/secrets/crm-lab-ingress','utf8'))
 createIngressGateway({origin:stagingEasyPanelOriginV1,...credentials}).listen(8080,'0.0.0.0')
}else throw Error('DISPOSABLE_ROLE_INVALID')
