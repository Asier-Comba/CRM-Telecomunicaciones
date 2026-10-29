import {BlockList,isIP} from 'node:net'
import {stagingSupabaseUrlV1} from '../../src/lib/server/product-staging-admission-v1.ts'
import {privateSupabaseGatewayV1} from '../../src/lib/server/product-private-egress-v1.ts'
export {allowedSupabasePathV1 as allowedSupabasePath,rewriteSupabaseRequestV1 as rewriteSupabaseRequest} from '../../src/lib/server/product-private-egress-v1.ts'

export const supabaseOrigin=stagingSupabaseUrlV1
export const appTarget='http://crm-telecom-staging:3000'
export const gatewayOrigin=privateSupabaseGatewayV1
export const bodyLimit=2*1024*1024
const blocked=new BlockList()
for(const [address,prefix]of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',3]])blocked.addSubnet(address,prefix,'ipv4')
export const publicIpv4=value=>typeof value==='string'&&isIP(value)===4&&!blocked.check(value,'ipv4')
export function canonicalHttpsOrigin(value){try{const url=new URL(value);return typeof value==='string'&&url.origin===value&&url.protocol==='https:'&&!url.username&&!url.password&&publicHostname(url.hostname)}catch{return false}}
const publicHostname=value=>value.includes('.')&&isIP(value)===0&&!value.endsWith('.localhost')&&!value.endsWith('.local')
export function safeIngressRedirect(location,origin){
 if(typeof location!=='string'||location.length>8192||/[\\\u0000-\u0020\u007f]/.test(location)||location.startsWith('//'))return false
 if(!location.startsWith('/')&&location!==origin&&!location.startsWith(origin+'/'))return false
 try{const url=new URL(location,origin);return url.origin===origin&&!url.username&&!url.password}catch{return false}
}
