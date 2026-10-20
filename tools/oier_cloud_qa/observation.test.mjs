import {test} from 'node:test'
import assert from 'node:assert/strict'
import {safeResponseObservation} from './observation.mjs'
import {origin,projectRef} from './preflight.mjs'
test('failure evidence retains layer/status/type without credential-bearing URL fragments',()=>{
 const credential='never-publish-this-synthetic-marker'
 const response=safeResponseObservation(`https://${projectRef}.supabase.co/auth/v1/token?password=${credential}#${credential}`,'POST',401,'application/json; charset=utf-8')
 assert.deepEqual(response,{service:'SUPABASE_AUTH_OR_DATA',path:'/auth/v1/token',method:'POST',http:401,responseType:'JSON'})
 for(const url of [`${origin}/unknown/${credential}?token=${credential}`,`${origin}/clients/10000000-0000-4000-8000-000000000001?token=${credential}`,`https://app.netlify.com/edge-access?token=${credential}`])assert.equal(JSON.stringify(safeResponseObservation(url,'GET',503,'text/html')).includes(credential),false)
 assert.equal(safeResponseObservation('https://unapproved.example/'+credential,'POST',401,'application/json'),null)
})
