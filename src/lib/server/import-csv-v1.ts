export type ImportCsvRowV1=Readonly<{row:number;account_kind:'legal_entity'|'sole_trader';legal_name:string}>
export type ImportCsvPreviewV1=Readonly<{total_rows:number;valid_rows:number;invalid_rows:number;rows:readonly ImportCsvRowV1[];errors:readonly Readonly<{row:number;code:'invalid_account_kind'|'invalid_legal_name'|'invalid_columns'|'unsafe_cell'}>[];has_more:boolean}>
const fail=()=>{throw new Error('IMPORT_CSV_INVALID')}
export function decodeBoundedImportCsvV1(bytes:Uint8Array):string[][]{
 if(!(bytes instanceof Uint8Array)||bytes.length<1||bytes.length>2*1024*1024)fail()
 let text:string;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes)}catch{fail()}
 text=text!.replace(/^\uFEFF/,'');if(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(text))fail()
 const records:string[][]=[];let row:string[]=[],cell='',quoted=false,closed=false
 const pushCell=()=>{if(cell.length>1000||row.length>=20)fail();row.push(cell);cell='';closed=false}
 const pushRow=()=>{pushCell();records.push(row);row=[];if(records.length>1001)fail()}
 for(let i=0;i<text.length;i++){const ch=text[i]
  if(quoted){if(ch==='"'){if(text[i+1]==='"'){cell+='"';i++}else{quoted=false;closed=true}}else cell+=ch}
  else if(ch===',')pushCell()
  else if(ch==='\r'||ch==='\n'){if(ch==='\r'){if(text[i+1]!=='\n')fail();i++}pushRow()}
  else if(ch==='"'){if(cell!==''||closed)fail();quoted=true}
  else{if(closed)fail();cell+=ch}
  if(cell.length>1000)fail()
 }
 if(quoted)fail();if(cell!==''||row.length||closed)pushRow()
 return records
}
export function validateCustomerCsvV1(bytes:Uint8Array,afterRow=0,limit=20):ImportCsvPreviewV1{
 if(!Number.isSafeInteger(afterRow)||afterRow<0||!Number.isSafeInteger(limit)||limit<1||limit>20)fail()
 const records=decodeBoundedImportCsvV1(bytes)
 if(records.length<2||records[0].join(',')!=='account_kind,legal_name'||records[0].length!==2)fail()
 const valid:ImportCsvRowV1[]=[],errors:{row:number;code:'invalid_account_kind'|'invalid_legal_name'|'invalid_columns'|'unsafe_cell'}[]=[]
 records.slice(1).forEach((v,index)=>{const row=index+1;let code:typeof errors[number]['code']|null=null
  if(v.length!==2)code='invalid_columns'
  else if(v.some(c=>/^[=+@-]/.test(c.trimStart())))code='unsafe_cell'
  else if(!['legal_entity','sole_trader'].includes(v[0]))code='invalid_account_kind'
  else if(v[1].trim().length<1||v[1].trim().length>200||/[\r\n]/.test(v[1]))code='invalid_legal_name'
  if(code)errors.push({row,code});else valid.push({row,account_kind:v[0] as ImportCsvRowV1['account_kind'],legal_name:v[1].trim()})
 })
 const candidates=valid.filter(r=>r.row>afterRow)
 return{total_rows:records.length-1,valid_rows:valid.length,invalid_rows:errors.length,rows:candidates.slice(0,limit),errors:errors.filter(r=>r.row>afterRow).slice(0,limit),has_more:candidates.length>limit||errors.filter(r=>r.row>afterRow).length>limit}
}
