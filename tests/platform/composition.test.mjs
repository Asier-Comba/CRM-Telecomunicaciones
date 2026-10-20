import {test} from 'node:test'
import assert from 'node:assert/strict'
import {unionMigrations, checkComposition, checkForwardMigrations, sources} from '../../scripts/platform/composition.mjs'
test('composition preserves both exclusive migrations and requires identical shared migrations', () => {
  const shared = 'supabase/migrations/20260101000000_shared.sql', p = 'supabase/migrations/20260102000000_platform.sql', q = 'supabase/migrations/20260103000000_product.sql'
  const r = unionMigrations({[shared]: 'a', [p]: 'b'}, {[shared]: 'a', [q]: 'c'})
  assert.equal(r.shared, 1); assert.equal(Object.keys(r.union).length, 3)
  assert.deepEqual(r.platform_only, [p]); assert.deepEqual(r.product_only, [q])
  assert.throws(() => unionMigrations({[shared]: 'a'}, {[shared]: 'changed'}), /SHARED_MIGRATION_CHANGED/)
  assert.throws(() => unionMigrations({[shared]: 'a'}, {'supabase/migrations/20260101000000_other.sql': 'b'}), /VERSION_COLLISION/)
})
test('composition rejects modified, missing and extra product or migration blobs', () => {
  const expected = {'src/product.ts': 'a', 'supabase/migrations/20260101000000_shared.sql': 'b'}
  assert.equal(checkComposition(expected, {...expected}).result, 'PASS')
  assert.throws(() => checkComposition(expected, {...expected, 'src/product.ts': 'changed'}), /BLOB_DRIFT/)
  assert.throws(() => checkComposition(expected, {'src/product.ts': 'a'}), /BLOB_DRIFT/)
  assert.throws(() => checkComposition(expected, {...expected, 'src/alternate.ts': 'c'}), /BLOB_DRIFT/)
})
test('HEAD may only add later migrations and must keep every composed blob', () => {
  const a = 'supabase/migrations/20260101000000_a.sql', b = 'supabase/migrations/20260102000000_b.sql', later = 'supabase/migrations/20260103000000_later.sql'
  const composed = {[a]: '1', [b]: '2'}
  assert.deepEqual(checkForwardMigrations(composed, {...composed}), [])
  assert.deepEqual(checkForwardMigrations(composed, {...composed, [later]: '3'}), ['20260103000000_later.sql'])
  assert.throws(() => checkForwardMigrations(composed, {...composed, [b]: 'changed'}), /FORWARD_ONLY_MIGRATION_DRIFT/)
  assert.throws(() => checkForwardMigrations(composed, {[a]: '1', [later]: '3'}), /FORWARD_ONLY_MIGRATION_DRIFT/)
  assert.throws(() => checkForwardMigrations(composed, {...composed, 'supabase/migrations/20260101120000_backdated.sql': '3'}), /FORWARD_ONLY_MIGRATION_DRIFT/)
  assert.throws(() => checkForwardMigrations(composed, {...composed, 'supabase/migrations/20260102000000_b2.sql': '3'}), /FORWARD_ONLY_MIGRATION_DRIFT/)
})
test('the composition proof is bound to one recorded full commit', () => {
  assert.match(sources.composed, /^[0-9a-f]{40}$/)
  assert.ok(![sources.platform, sources.product].includes(sources.composed))
})
