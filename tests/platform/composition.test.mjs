import {test} from 'node:test'
import assert from 'node:assert/strict'
import {unionMigrations, checkComposition} from '../../scripts/platform/composition.mjs'
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
