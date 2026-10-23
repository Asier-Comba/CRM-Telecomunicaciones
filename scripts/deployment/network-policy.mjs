import {isIP} from 'node:net'

// Reviewable lab policy only; never a hosted deployment authorizer.
export const labImage='node:24.21.0-trixie-slim@sha256:c83040f7e24bacea68e58a0b96a484ba430bf24abb2973eab7ba4701144b7b63'
export function runnerAllowed(env,platform){
 return platform==='linux'&&env.CI==='true'&&env.GITHUB_ACTIONS==='true'&&env.RUNNER_ENVIRONMENT==='github-hosted'&&env.PLATFORM_TARGET==='LOCAL'&&env.NODE_ENV!=='production'&&!env.SUPABASE_ACCESS_TOKEN&&!env.SUPABASE_DB_PASSWORD
}
export function assertEmptyDaemon(snapshot){
 if(snapshot.swarm!=='inactive'||snapshot.containers!==0)throw new Error('EMPTY_DISPOSABLE_DAEMON_REQUIRED')
}
export function authorityAllowed(input,approved){
 if(typeof input!=='string'||typeof approved!=='string'||input.length>253||input!==approved)return false
 const match=/^([a-z0-9](?:[a-z0-9.-]*[a-z0-9])?):([1-9][0-9]{0,4})$/.exec(input)
 return Boolean(match&&!isIP(match[1])&&!match[1].includes('..')&&Number(match[2])<=65535)
}
export function ownedResource(resource,id,nonce){
 return /^[a-f0-9]{64}$/.test(id)&&resource.Id===id&&resource.Labels?.['crm.telecom.networklab']===nonce
}
