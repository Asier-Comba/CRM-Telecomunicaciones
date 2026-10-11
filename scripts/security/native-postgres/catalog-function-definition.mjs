/** pg_get_functiondef returns DDL without a guaranteed final statement delimiter.
 * Preserve every definition byte while separating the following fixture SQL. */
export function terminatedCatalogFunctionDefinition(definition) {
  if (typeof definition !== 'string' || !definition.startsWith('CREATE OR REPLACE FUNCTION')) throw Error('native_catalog_definition_invalid')
  const original = definition.trimEnd()
  return original + (original.endsWith(';') ? '' : ';') + '\n'
}
