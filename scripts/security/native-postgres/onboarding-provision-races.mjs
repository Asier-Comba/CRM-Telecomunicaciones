// Native independent-process evidence for public.provision_workspace, only in the pinned
// disposable CI container. Invariants come from the existing contract and its PGlite
// test (scripts/security/ephemeral-postgres/onboarding.mjs): one workspace per user,
// owner membership, created=true once and created=false on replay, atomic rollback.
// This adds what a single in-process connection cannot prove: real concurrency and a
// real cross-user slug collision (SQLSTATE 23505) between independent backends.
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { isExpectedNativeImage } from './expected-image.mjs'
const container = process.env.TELECOM_NATIVE_TEST_CONTAINER ?? ''
assert.match(container, /^[0-9a-f]{12,64}$/)
const image = spawnSync('docker', ['inspect', '--format={{.Config.Image}}', container], { encoding: 'utf8' })
assert.equal(image.status, 0); assert.ok(isExpectedNativeImage(image.stdout.trim()), 'unexpected PostgreSQL container image')
const database = 'telecom_onboarding_race_test'
function docker(args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', ['exec', '-i', '-u', 'postgres', container, ...args], { stdio: ['pipe', 'pipe', 'pipe'] })
    let out = '', err = '', timer = setTimeout(() => child.kill('SIGKILL'), 45000)
    child.stdout.on('data', b => { out += b; if (out.length > 32768) child.kill('SIGKILL') })
    child.stderr.on('data', b => { err += b; if (err.length > 32768) child.kill('SIGKILL') })
    child.on('error', reject); child.on('close', code => { clearTimeout(timer); resolve({ code, out, err }) })
    child.stdin.end(input)
  })
}
const args = ['psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', database, '--set=VERBOSITY=sqlstate']
async function sql(input) { const r = await docker(args, input); assert.equal(r.code, 0, 'native onboarding SQL failed'); return r.out.trim() }
const uid = n => `c1000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const provision = (user, name, slug) => `begin;set local role authenticated;set local request.jwt.claim.sub='${user}';select row_to_json(p) from public.provision_workspace('${name}','${slug}') p;commit;`
const parse = r => JSON.parse(r.out.trim())
const counts = async user => JSON.parse(await sql(`select json_build_object(
  'members',(select count(*) from public.workspace_members where user_id='${user}'),
  'owner_active',(select count(*) from public.workspace_members where user_id='${user}' and role='owner' and status='active'),
  'profile_ws',(select workspace_id from public.profiles where id='${user}'))`))
let users = 0
async function newUser() { users += 1; const id = uid(users); await sql(`insert into auth.users(id,aud,role,email,email_confirmed_at,created_at,updated_at) values('${id}','authenticated','authenticated','onboarding-race-${users}@example.invalid',now(),now(),now())`); return id }
let createdDatabase = false
try {
  assert.equal((await docker(['createdb', '-U', 'postgres', database])).code, 0)
  createdDatabase = true
  await sql(readFileSync('scripts/security/native-postgres/bootstrap.sql', 'utf8').replace(/create role (anon|authenticated|service_role)[^;]*;/g, ''))
  await sql(readFileSync('scripts/security/ephemeral-postgres/storage-stub.sql', 'utf8'))
  for (const migration of readdirSync('supabase/migrations').filter(x => x.endsWith('.sql')).sort()) await sql(readFileSync('supabase/migrations/' + migration, 'utf8'))

  // A1. Same actor, 12 independent processes, identical input, 3 rounds.
  for (let round = 1; round <= 3; round += 1) {
    const u = await newUser(), slug = `race-same-${round}`
    const runs = await Promise.all(Array.from({ length: 12 }, () => docker(args, provision(u, 'Race Same ' + round, slug))))
    assert.ok(runs.every(r => r.code === 0), 'same-input concurrent provision must not fail')
    const rows = runs.map(parse)
    assert.equal(rows.filter(r => r.created === true).length, 1, 'exactly one creator')
    assert.ok(rows.every(r => r.id === rows[0].id && r.role === 'owner' && r.slug === slug), 'every caller sees the same workspace as owner')
    assert.equal(await sql(`select count(*) from public.workspaces where slug='${slug}'`), '1')
    assert.deepEqual(await counts(u), { members: 1, owner_active: 1, profile_ws: rows[0].id })
  }
  // A2. Same actor, 12 processes with DIFFERENT names and slugs (lost-response retries with edited input).
  for (let round = 1; round <= 3; round += 1) {
    const u = await newUser()
    const runs = await Promise.all(Array.from({ length: 12 }, (_, i) => docker(args, provision(u, `Race Diff ${round}-${i}`, `race-diff-${round}-${i}`))))
    assert.ok(runs.every(r => r.code === 0), 'different-input concurrent provision must not fail')
    const rows = runs.map(parse), winner = rows.find(r => r.created)
    assert.equal(rows.filter(r => r.created).length, 1, 'exactly one creator with different inputs')
    assert.ok(rows.every(r => r.id === winner.id && r.name === winner.name && r.slug === winner.slug), 'losers receive the winner workspace, never their own input')
    assert.equal(await sql(`select count(*) from public.workspaces where slug like 'race-diff-${round}-%'`), '1', 'no orphan workspace from losing inputs')
    assert.deepEqual(await counts(u), { members: 1, owner_active: 1, profile_ws: winner.id })
  }
  // A3. Controlled ordering: hold the per-user advisory lock, queue two calls, release.
  for (const order of ['first', 'second']) {
    const u = await newUser()
    const holder = docker(args, `begin;select pg_advisory_xact_lock(hashtextextended('${u}',0));select pg_sleep(2);commit;`)
    await new Promise(r => setTimeout(r, 400))
    const a = docker(args, provision(u, 'Queued A ' + order, 'queued-a-' + order))
    await new Promise(r => setTimeout(r, 200))
    const b = docker(args, provision(u, 'Queued B ' + order, 'queued-b-' + order))
    const [h, ra, rb] = await Promise.all([holder, a, b])
    assert.equal(h.code, 0); assert.equal(ra.code, 0); assert.equal(rb.code, 0)
    const x = parse(ra), y = parse(rb)
    assert.equal([x, y].filter(r => r.created).length, 1, 'queued calls: exactly one creator')
    assert.equal(x.id, y.id, 'queued calls converge on one workspace')
    assert.equal(await sql(`select count(*) from public.workspaces where slug in ('queued-a-${order}','queued-b-${order}')`), '1')
    assert.deepEqual(await counts(u), { members: 1, owner_active: 1, profile_ws: x.id })
  }
  // A4. Recovery after the race: a new process replays and gets the same workspace, created=false.
  { const u = uid(1), replay = parse(await docker(args, provision(u, 'Replay', 'replay-after-race'))); assert.equal(replay.created, false); assert.equal(replay.slug, 'race-same-1') }

  // B1. Sequential cross-user slug collision: SQLSTATE 23505, no partial rows, no adoption.
  const x = await newUser(), y = await newUser()
  const ok = await docker(args, provision(x, 'Collide X', 'collide-shared')); assert.equal(ok.code, 0); const xw = parse(ok)
  const clash = await docker(args, provision(y, 'Collide Y', 'collide-shared'))
  assert.notEqual(clash.code, 0); assert.match(clash.err, /23505/, 'slug collision surfaces as unique_violation')
  assert.deepEqual(await counts(y), { members: 0, owner_active: 0, profile_ws: null }, 'loser keeps no membership or profile workspace')
  assert.equal(await sql(`select count(*) from public.workspaces where slug='collide-shared'`), '1')
  assert.equal(await sql(`select count(*) from public.workspace_members where workspace_id='${xw.id}'`), '1', 'no adoption of the other tenant')
  assert.equal(await sql(`begin;set local role authenticated;set local request.jwt.claim.sub='${y}';select public.is_workspace_member('${xw.id}')::text||'|'||(select count(*) from public.current_workspace_ids());commit;`), 'false|0')
  // B2. The loser recovers with another slug.
  const retry = await docker(args, provision(y, 'Collide Y', 'collide-y-own')); assert.equal(retry.code, 0)
  const yw = parse(retry); assert.equal(yw.created, true); assert.notEqual(yw.id, xw.id)
  // B3. Concurrent cross-user collision, 5 rounds: one winner, one 23505, no partial rows.
  for (let round = 1; round <= 5; round += 1) {
    const p = await newUser(), q = await newUser(), slug = `collide-race-${round}`
    const [rp, rq] = await Promise.all([docker(args, provision(p, 'P ' + round, slug)), docker(args, provision(q, 'Q ' + round, slug))])
    const winners = [rp, rq].filter(r => r.code === 0), losers = [rp, rq].filter(r => r.code !== 0)
    assert.equal(winners.length, 1, 'exactly one tenant obtains the slug'); assert.equal(losers.length, 1)
    assert.match(losers[0].err, /23505/)
    const loserUser = rp.code === 0 ? q : p, winnerUser = rp.code === 0 ? p : q
    assert.deepEqual(await counts(loserUser), { members: 0, owner_active: 0, profile_ws: null })
    assert.equal((await counts(winnerUser)).owner_active, 1)
    assert.equal(await sql(`select count(*) from public.workspaces where slug='${slug}'`), '1')
  }
  assert.equal(await sql(`select count(*) from public.workspaces w where not exists(select 1 from public.workspace_members m where m.workspace_id=w.id)`), '0', 'no orphan workspace anywhere')
  console.log(`ONBOARDING NATIVE PROCESS RACES PASS: ${users} synthetic users; same-input 3x12, different-input 3x12, lock-queued 2x2, replay; cross-user slug 23505 sequential + 5 concurrent rounds; no duplicates, no orphan, no adoption, loser recovers`)
} finally {
  // A failed create (including an existing database) never grants ownership.
  if (createdDatabase) {
    const result = await docker(['dropdb', '--force', '-U', 'postgres', database])
    assert.equal(result.code, 0, 'disposable onboarding race teardown failed')
    console.log('ONBOARDING NATIVE RACES TEARDOWN PASS')
  }
}
