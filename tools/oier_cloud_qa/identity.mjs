/** Read-only evidence from the server-rendered ProductProvider, never JWT metadata.
 * The candidate layout resolves these props with getUser + active DB membership.
 * No raw Flight payload, actor/workspace IDs or auth artifacts leave this helper.
 * Unknown/changed Flight encoding is refused, not guessed or treated as permission.
 */
export function flightFramesFromScripts(scripts) {
 if(!Array.isArray(scripts))return []
 const frames=[]
 for(const script of scripts){
  if(typeof script!=='string')continue
  const match=/^self\.__next_f\.push\(([\s\S]*)\);?$/.exec(script.trim())
  if(!match)continue
  try{const frame=JSON.parse(match[1]);if(Array.isArray(frame)&&frame[0]===1&&typeof frame[1]==='string')frames.push(frame)}catch{/* Never evaluate scripts. */}
 }
 return frames
}
export function serverIdentity(frames) {
 if (!Array.isArray(frames)) return null
 const wire=frames.filter(v=>Array.isArray(v)&&v[0]===1&&typeof v[1]==='string').map(v=>v[1]).join('')
 if (!wire||wire.length>4*1024*1024) return null
 const imports=new Set(),records=[]
 for(const row of wire.split('\n')){
  const match=/^([0-9a-f]+):(.*)$/.exec(row)
  if(!match)continue
  try{
   if(match[2].startsWith('I')){
    const imported=JSON.parse(match[2].slice(1))
    if(Array.isArray(imported)&&imported.at(-1)==='ProductProvider')imports.add(match[1])
   }else records.push(JSON.parse(match[2]))
  }catch{/* Other typed Flight records are not identity evidence. */}
 }
 const providers=[]
 function visit(value,depth=0){
  if(depth>80||!value||typeof value!=='object')return
  if(Array.isArray(value)&&value[0]==='$'&&typeof value[1]==='string'&&imports.has(value[1].replace(/^\$L?/,'')))providers.push(value[3])
  for(const child of Object.values(value))visit(child,depth+1)
 }
 records.forEach(v=>visit(v))
 if(providers.length!==1)return null
 const p=providers[0]
 return p?{integrated:p.integrated,actorId:p.actorId,workspaceId:p.workspaceId,role:p.role}:null
}
export function matchesServerIdentity(frames, expected) {
 const p=serverIdentity(frames)
 return !!p&&p.integrated===true&&p.actorId===expected.id&&p.workspaceId===expected.workspaceId&&p.role===expected.role
}
