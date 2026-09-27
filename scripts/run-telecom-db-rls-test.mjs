import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const sqlPath = fileURLToPath(
  new URL('../supabase/tests/telecom-domain-rls.sql', import.meta.url),
)

const preflight = String.raw`do $$
begin
  if current_database() !~ '_test$' then
    raise exception 'RLS harness requires a database ending in _test';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_roles
    where rolname = current_user and (rolsuper or rolbypassrls)
  ) then
    raise exception 'RLS harness requires SUPERUSER or BYPASSRLS';
  end if;
  if inet_server_addr() is null or not (
    inet_server_addr() <<= inet '127.0.0.0/8'
    or inet_server_addr() = inet '::1'
  ) then
    raise exception 'RLS harness requires a loopback PostgreSQL server';
  end if;
end;
$$;
set app.environment = 'test';`

export function readConfig(env) {
  if (env.TELECOM_TEST_DATABASE_URL) {
    throw new Error('opaque database URLs are forbidden; use discrete TELECOM_TEST_DB_* settings')
  }

  const host = env.TELECOM_TEST_DB_HOST || '127.0.0.1'
  const portText = env.TELECOM_TEST_DB_PORT || '5432'
  const database = env.TELECOM_TEST_DB_NAME
  const user = env.TELECOM_TEST_DB_USER
  const password = env.TELECOM_TEST_DB_PASSWORD

  if (host !== '127.0.0.1' && host !== '::1') {
    throw new Error('RLS harness refuses non-loopback database hosts')
  }
  if (!/^\d{1,5}$/.test(portText) || Number(portText) < 1 || Number(portText) > 65535) {
    throw new Error('TELECOM_TEST_DB_PORT must be a valid TCP port')
  }
  if (!database || !/^[A-Za-z0-9_][A-Za-z0-9_-]{0,57}_test$/.test(database)) {
    throw new Error('RLS harness requires a simple TELECOM_TEST_DB_NAME ending in _test')
  }
  if (!user || /[\0\r\n]/.test(user)) {
    throw new Error('TELECOM_TEST_DB_USER is required')
  }
  if (!password) {
    throw new Error('TELECOM_TEST_DB_PASSWORD is required')
  }

  return { host, port: portText, database, user, password }
}

export function buildChildEnv(sourceEnv, password) {
  const childEnv = {}
  for (const [key, value] of Object.entries(sourceEnv)) {
    if (key.toUpperCase().startsWith('PG')) continue
    if (key === 'TELECOM_TEST_DB_PASSWORD') continue
    childEnv[key] = value
  }
  childEnv.PGPASSWORD = password
  return childEnv
}

export function run(env = process.env, spawn = spawnSync) {
  const config = readConfig(env)
  const psql = env.PSQL_PATH || 'psql'
  const args = [
    '-X',
    '--no-password',
    '--host', config.host,
    '--port', config.port,
    '--username', config.user,
    '--dbname', config.database,
    '--set', 'ON_ERROR_STOP=1',
    '--command', preflight,
    '--file', sqlPath,
  ]
  const result = spawn(psql, args, {
    stdio: 'inherit',
    env: buildChildEnv(env, config.password),
  })

  if (result.error) throw result.error
  if (result.status !== 0) return result.status ?? 1
  return 0
}

const isMain = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url
if (isMain) {
  process.exitCode = run()
}
