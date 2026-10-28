// Audit only the public PostgREST namespace. Consume the WHOLE qualified name
// before choosing its schema: private_schema.object is not a public object
// called private_schema. This is a DDL-name recognizer, not a SQL parser.
const identifier='(?:"(?:[^"]|"")*"|[a-z_][a-z0-9_$]*)'
const value=name=>name.startsWith('"')?name.slice(1,-1).replaceAll('""','"'):name.toLowerCase()
export function collectPublicSqlNames(source,prefix){
 const pattern=new RegExp(`${prefix}(${identifier})(?:\\s*\\.\\s*(${identifier}))?(?![a-z0-9_$"]|\\s*\\.)`,'gi')
 const names=new Set()
 for(const match of source.matchAll(pattern)){
  const schema=match[2]===undefined?'public':value(match[1]),name=value(match[2]??match[1])
  if(schema==='public')names.add(name)
 }
 return names
}
