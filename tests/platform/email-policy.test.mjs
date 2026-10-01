import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { authLink,safeHeader,redirectAttacks } from '../../scripts/platform/auth-email.mjs'
const link=(redirect)=>'http://127.0.0.1:54321/auth/v1/verify?token=synthetic&type=recovery&redirect_to='+encodeURIComponent(redirect)
test('local Auth link exact allowlist and fallback allowed',()=>{assert.ok(authLink(link('http://127.0.0.1:3000/auth/callback')));assert.ok(authLink(link('http://127.0.0.1:3000')))})
for(const redirect of redirectAttacks)test('reject link redirect '+redirect,()=>assert.throws(()=>authLink(link(redirect))))
for(const bad of ['http://evil.example/auth/v1/verify?token=x','http://127.0.0.1:54321.evil.example/auth/v1/verify?token=x','http://127.0.0.1:54321/auth/v1/verify?token=x&utm_tracking=x','http://127.0.0.1:54321/auth/v1/verify?type=recovery'])test('reject unsafe link '+bad,()=>assert.throws(()=>authLink(bad)))
test('header control rejection',()=>{for(const value of ['sender\r\nBcc: injected','name\n','name\u0000','name\u007f'])assert.equal(safeHeader(value),false);assert.equal(safeHeader('Synthetic sender'),true)})
test('templates use only provider-owned confirmation URL, never Data or raw HTML',()=>{for(const kind of ['confirmation','recovery','invite']){const html=readFileSync('platform/auth-templates/'+kind+'.html','utf8');assert.deepEqual([...html.matchAll(/{{([^}]+)}}/g)].map(m=>m[1].trim()),['.ConfirmationURL']);assert.equal((html.match(/href=/g)||[]).length,1);assert.ok(!/script|img|\.Data|\.Email|SMTP_|SERVICE_ROLE|unsafe|tracking/i.test(html))}})
