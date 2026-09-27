import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  buildChildEnv,
  readConfig,
  run,
} from '../../scripts/run-telecom-db-rls-test.mjs'

const sql = await readFile('supabase/tests/telecom-domain-rls.sql', 'utf8')
const runner = await readFile('scripts/run-telecom-db-rls-test.mjs', 'utf8')
const relations = [
  'customers', 'contacts', 'telecom_operators', 'telecom_plans',
  'telecom_plan_versions', 'telecom_contracts', 'telecom_services',
  'telecom_lines', 'telecom_commitments', 'telecom_renewals',
  'opportunity_stages', 'opportunities', 'tasks', 'calendar_events', 'activities',
]

test('database harness is test-only, transactional and synthetic', () => {
  assert.match(sql, /current_setting\('app\.environment', true\) is distinct from 'test'/)
  assert.match(sql, /refusing to run outside app\.environment=test/)
  assert.match(sql, /begin;[\s\S]*rollback;/)
  assert.doesNotMatch(sql, /commit;/i)
  assert.match(sql, /@example\.invalid/)
  assert.match(sql, /Synthetic Customer No Contacts/)
  assert.match(sql, /Synthetic Secondary A/)
  assert.match(sql, /Synthetic Large Customer/)
  assert.match(sql, /Synthetic Customer C/)
  assert.match(sql, /generate_series\(1, 105\)/)
  assert.match(sql, /cross join generate_series\(1, 3\)/)
  assert.match(sql, /current_date \+ 20/)
  assert.match(sql, /current_date \+ 30/)
  assert.doesNotMatch(sql, /service_role|supabase\.co|https?:\/\//i)
})

test('database harness seeds every relation and covers the full read isolation matrix', () => {
  for (const relation of relations) {
    assert.match(sql, new RegExp(`public\\.${relation}`))
    assert.match(sql, new RegExp(`'${relation}'`))
  }
  assert.match(sql, /assert_domain_visibility/)
  assert.match(sql, /assert_no_domain_rows/)
  assert.match(sql, /multi-workspace actor/)
  assert.match(sql, /suspended workspace/)
  assert.match(sql, /suspended membership/)
  assert.match(sql, /removed membership with stale JWT/)
  assert.match(sql, /anonymous access/)
  assert.match(sql, /delete from public\.workspace_members/)
})

test('database harness covers representative authorization and tenant attacks', () => {
  assert.match(sql, /Admin A Allowed Insert/)
  assert.match(sql, /cross-tenant insert was not denied by RLS/)
  assert.match(sql, /cross-tenant upsert was not denied by RLS/)
  assert.match(sql, /cross-tenant composite parent was not denied by FK/)
  assert.match(sql, /cross-tenant upsert changed workspace B/)
  assert.match(sql, /delete without policy removed a row/)
  assert.match(sql, /tenant identity mutation was not denied/)
  assert.match(sql, /member insert was not denied/)
  assert.match(sql, /viewer insert was not denied/)
})

test('temporary grants and fixtures cannot survive the harness', () => {
  assert.match(sql, /Temporary transactional grants/)
  assert.match(sql, /grant select on table[\s\S]*to anon, authenticated;/)
  assert.match(sql, /grant insert, update, delete on table[\s\S]*to authenticated;/)
  assert.match(sql, /reset role;[\s\S]*rollback;/)
})

test('runner refuses opaque, remote or non-test targets before invoking psql', () => {
  let invoked = false
  const spawn = () => { invoked = true; return { status: 0 } }
  const password = 'never-print-this-secret'

  assert.throws(
    () => run({
      TELECOM_TEST_DATABASE_URL: `postgresql://postgres:${password}@localhost/telecom_test?hostaddr=203.0.113.10`,
    }, spawn),
    (error) => !String(error).includes(password) && /opaque database URLs are forbidden/.test(String(error)),
  )
  assert.throws(
    () => run({
      TELECOM_TEST_DB_HOST: '203.0.113.10',
      TELECOM_TEST_DB_NAME: 'telecom_test',
      TELECOM_TEST_DB_USER: 'postgres',
      TELECOM_TEST_DB_PASSWORD: password,
    }, spawn),
    /refuses non-loopback database hosts/,
  )
  assert.throws(
    () => run({
      TELECOM_TEST_DB_NAME: 'production',
      TELECOM_TEST_DB_USER: 'postgres',
      TELECOM_TEST_DB_PASSWORD: password,
    }, spawn),
    /ending in _test/,
  )
  for (const database of [
    'postgresql://attacker.example/prod_test',
    'hostaddr=203.0.113.10 dbname=prod application_name=_test',
  ]) {
    assert.throws(
      () => run({
        TELECOM_TEST_DB_NAME: database,
        TELECOM_TEST_DB_USER: 'postgres',
        TELECOM_TEST_DB_PASSWORD: password,
      }, spawn),
      /simple TELECOM_TEST_DB_NAME/,
    )
  }
  assert.equal(invoked, false)
})

test('runner uses allowlisted args, strips libpq overrides and keeps secrets out of argv', () => {
  const password = 'never-print-this-secret'
  const sourceEnv = {
    PATH: process.env.PATH,
    TELECOM_TEST_DB_HOST: '127.0.0.1',
    TELECOM_TEST_DB_PORT: '54322',
    TELECOM_TEST_DB_NAME: 'telecom_test',
    TELECOM_TEST_DB_USER: 'postgres',
    TELECOM_TEST_DB_PASSWORD: password,
    PGHOSTADDR: '203.0.113.10',
    PGSERVICE: 'production',
    PGSERVICEFILE: '/tmp/production.conf',
    PGDATABASE: 'production',
  }
  let call
  const status = run(sourceEnv, (command, args, options) => {
    call = { command, args, options }
    return { status: 0 }
  })

  assert.equal(status, 0)
  assert.deepEqual(call.args.slice(0, 10), [
    '-X', '--no-password', '--host', '127.0.0.1', '--port', '54322',
    '--username', 'postgres', '--dbname', 'telecom_test',
  ])
  assert.equal(call.args.includes(password), false)
  assert.equal(call.options.env.PGPASSWORD, password)
  for (const key of ['PGHOSTADDR', 'PGSERVICE', 'PGSERVICEFILE', 'PGDATABASE']) {
    assert.equal(key in call.options.env, false)
  }
  assert.match(call.args.join(' '), /current_database\(\)[\s\S]*inet_server_addr\(\)/)
  assert.match(runner, /set app\.environment = 'test'/)
  assert.doesNotMatch(runner, /console\.(log|error)/)
})

test('runner config and environment helpers remain independently fail-closed', () => {
  assert.throws(() => readConfig({}), /TELECOM_TEST_DB_NAME ending in _test/)
  assert.throws(() => readConfig({
    TELECOM_TEST_DB_NAME: 'telecom_test',
    TELECOM_TEST_DB_USER: 'postgres',
  }), /TELECOM_TEST_DB_PASSWORD is required/)
  assert.deepEqual(buildChildEnv({ PGHOST: 'remote', PATH: 'safe' }, 'secret'), {
    PATH: 'safe', PGPASSWORD: 'secret',
  })
  assert.match(runner, /current_database\(\) !~ '_test\$'/)
  assert.match(runner, /rolsuper or rolbypassrls/)
  assert.match(runner, /inet_server_addr\(\) <<= inet '127\.0\.0\.0\/8'/)
  assert.match(runner, /set app\.environment = 'test'/)
})
