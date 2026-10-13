import {DatabaseSync} from 'node:sqlite'
import {closeSync,lstatSync,openSync,realpathSync} from 'node:fs'
import {dirname,isAbsolute,resolve} from 'node:path'

const contract='assistant.eval-budget-ledger.v1',totalLimit=1500000,batchLimit=500000
const unavailable=()=>Error('EVAL_BUDGET_LEDGER_UNAVAILABLE')
const reference=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(v)
const money=v=>Number.isSafeInteger(v)&&v>=0&&v<=batchLimit
function fields(raw,keys){
  try{
    if(!raw||typeof raw!=='object'||Object.getPrototypeOf(raw)!==Object.prototype)return null
    const d=Object.getOwnPropertyDescriptors(raw)
    if(Reflect.ownKeys(d).length!==keys.length||keys.some(k=>!d[k]?.enumerable||!('value'in d[k])))return null
    return Object.fromEntries(keys.map(k=>[k,d[k].value]))
  }catch{return null}
}
function pathFor(raw){
  if(process.env.NODE_ENV==='production'||typeof raw!=='string'||!isAbsolute(raw)||resolve(raw)!==raw)throw unavailable()
  const parent=dirname(raw)
  if(realpathSync(parent)!==parent||!lstatSync(parent).isDirectory())throw unavailable()
  return raw
}
function fileAt(path){
  const s=lstatSync(path)
  if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||process.platform!=='win32'&&(s.mode&0o077)!==0)throw unavailable()
}
function open(path){
  fileAt(path)
  const db=new DatabaseSync(path,{timeout:1000})
  try{db.exec('PRAGMA foreign_keys=ON; PRAGMA trusted_schema=OFF; PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL;');return db}
  catch{db.close();throw unavailable()}
}

/** Trusted local evaluation host only. Explicit one-time creation is separate
 * from reopening: missing/corrupt files never mean a new allowance. No prompts,
 * keys, CRM data, provider requests, production use or per-tenant acceptance.
 * SQLite is accounting storage, unrelated to the owned W5 PostgreSQL resource. */
export function createEvaluationBudgetLedgerV1(rawPath){
  let db
  try{
    const path=pathFor(rawPath),fd=openSync(path,'wx',0o600);closeSync(fd)
    db=open(path)
    db.exec(`BEGIN IMMEDIATE;
      CREATE TABLE policy(id INTEGER PRIMARY KEY CHECK(id=1),contract TEXT NOT NULL,
        total_limit INTEGER NOT NULL CHECK(total_limit=1500000),batch_limit INTEGER NOT NULL CHECK(batch_limit=500000)) STRICT;
      INSERT INTO policy VALUES(1,'assistant.eval-budget-ledger.v1',1500000,500000);
      CREATE TRIGGER immutable_policy_update BEFORE UPDATE ON policy BEGIN SELECT RAISE(ABORT,'immutable_policy'); END;
      CREATE TRIGGER immutable_policy_delete BEFORE DELETE ON policy BEGIN SELECT RAISE(ABORT,'immutable_policy'); END;
      CREATE TABLE calls(call_ref TEXT PRIMARY KEY,batch_ref TEXT NOT NULL,
        maximum INTEGER NOT NULL CHECK(maximum>0 AND maximum<=500000),
        state TEXT NOT NULL CHECK(state IN('pending','unknown','settled')),
        actual INTEGER,CHECK((state='settled' AND actual IS NOT NULL AND actual>=0 AND actual<=maximum)
          OR(state IN('pending','unknown') AND actual IS NULL))) STRICT;
      COMMIT;`)
    db.close();db=undefined
    return openEvaluationBudgetLedgerV1(path)
  }catch{try{db?.close()}catch{}throw unavailable()}
}

export function openEvaluationBudgetLedgerV1(rawPath){
  let db
  try{
    db=open(pathFor(rawPath))
    const p=db.prepare('SELECT id,contract,total_limit,batch_limit FROM policy').all()
    if(p.length!==1||p[0].id!==1||p[0].contract!==contract||p[0].total_limit!==totalLimit||p[0].batch_limit!==batchLimit)throw unavailable()
    db.prepare('SELECT call_ref,batch_ref,maximum,state,actual FROM calls LIMIT 1').all()
  }catch{try{db?.close()}catch{}throw unavailable()}
  let closed=false
  function atomic(fn){
    if(closed)throw unavailable()
    try{db.exec('BEGIN IMMEDIATE');const value=fn();db.exec('COMMIT');return value}
    catch{try{db.exec('ROLLBACK')}catch{}throw unavailable()}
  }
  function totals(batch){
    const query=`SELECT coalesce(sum(CASE WHEN state='settled' THEN actual ELSE maximum END),0) charged,
      coalesce(sum(CASE WHEN state='settled' THEN actual ELSE 0 END),0) spent,
      coalesce(sum(CASE WHEN state!='settled' THEN maximum ELSE 0 END),0) reserved,
      coalesce(sum(CASE WHEN state!='settled' THEN 1 ELSE 0 END),0) unresolved FROM calls`
    return batch===undefined?db.prepare(query).get():db.prepare(query+' WHERE batch_ref=?').get(batch)
  }
  function state(){
    const t=totals()
    if(!Number.isSafeInteger(t.charged)||t.charged>totalLimit||t.charged<0)throw unavailable()
    return Object.freeze({contract,sharedLimitMicrousd:totalLimit,batchLimitMicrousd:batchLimit,
      knownSpentMicrousd:t.spent,reservedMicrousd:t.reserved,unresolvedCalls:t.unresolved,dispatchAuthorized:false})
  }
  return Object.freeze({
    reserve(raw){
      const r=fields(raw,['batchRef','callRef','maxCostMicrousd'])
      if(!r||!reference(r.batchRef)||!reference(r.callRef)||!money(r.maxCostMicrousd)||r.maxCostMicrousd===0)throw unavailable()
      return atomic(()=>{
        if(db.prepare('SELECT 1 FROM calls WHERE call_ref=?').get(r.callRef))return Object.freeze({status:'duplicate',dispatchAuthorized:false})
        const t=totals(),b=totals(r.batchRef)
        if(t.unresolved)return Object.freeze({status:'unresolved',dispatchAuthorized:false})
        if(t.charged+r.maxCostMicrousd>totalLimit||b.charged+r.maxCostMicrousd>batchLimit)return Object.freeze({status:'budget_exceeded',dispatchAuthorized:false})
        db.prepare("INSERT INTO calls VALUES(?,?,?,'pending',NULL)").run(r.callRef,r.batchRef,r.maxCostMicrousd)
        return Object.freeze({status:'reserved',...state()})
      })
    },
    settle(raw){
      const r=fields(raw,['callRef','knownCostMicrousd'])
      if(!r||!reference(r.callRef)||(r.knownCostMicrousd!==null&&!money(r.knownCostMicrousd)))throw unavailable()
      return atomic(()=>{
        const row=db.prepare('SELECT state,maximum,actual FROM calls WHERE call_ref=?').get(r.callRef)
        if(!row)return Object.freeze({status:'unavailable',dispatchAuthorized:false})
        if(row.state==='settled')return Object.freeze({status:row.actual===r.knownCostMicrousd?'settled':'conflict',dispatchAuthorized:false})
        if(row.state==='unknown')return Object.freeze({status:'unresolved',dispatchAuthorized:false})
        if(r.knownCostMicrousd===null||r.knownCostMicrousd>row.maximum){
          db.prepare("UPDATE calls SET state='unknown' WHERE call_ref=?").run(r.callRef)
          return Object.freeze({status:'unresolved',...state()})
        }
        db.prepare("UPDATE calls SET state='settled',actual=? WHERE call_ref=?").run(r.knownCostMicrousd,r.callRef)
        return Object.freeze({status:'settled',...state()})
      })
    },
    inspect(){return atomic(state)},
    close(){if(!closed){db.close();closed=true}}
  })
}
