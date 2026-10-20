// Product parser, synthetic phrases only; no replacement parsing implementation.
import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {resolve} from 'node:path'
const root=fileURLToPath(new URL('../../',import.meta.url)),args=process.argv.slice(2)
if(args.length!==4||args[0]!=='--source'||!/^[a-f0-9]{40}$/.test(args[1])||args[2]!=='--output')throw Error('Use --source <exact commit> --output <new report>')
const source=args[1],pins={}
const hash=b=>createHash('sha256').update(b).digest('hex')
for(const file of ['src/features/billing/parse.ts','src/features/billing/model.ts','src/lib/invoicing/calc.ts']){
 const blob=execFileSync('git',['show',source+':'+file],{cwd:root})
 const working=readFileSync(resolve(root,file),'utf8').replace(/\r\n/g,'\n')
 if(hash(working)!==hash(blob))throw Error('SOURCE_MISMATCH: '+file)
 pins[file]=hash(blob)
}
const {parseInvoiceText}=await import(pathToFileURL(resolve(root,'src/features/billing/parse.ts')))
const cases=[
 ['Factura por 300 euros',null],
 ['Factura de 300 euros',null],
 ['Factura por 300 euros por soporte','soporte'],
 ['Factura de 300 euros por instalación de fibra','instalación de fibra'],
 ['Factura por 300 euros + IVA por soporte','soporte'],
 ['Factura por -300 euros',null],
 ['Factura por instalación de fibra de 300 euros','instalación de fibra'],
 ['Factura por soporte, vencimiento en 15 días','soporte'],
 ['Factura por mantenimiento y soporte de 300 euros','mantenimiento y soporte'],
 ['Factura por 24 horas de soporte de 300 euros','24 horas de soporte'],
].map(([text,expected])=>{
 const result=parseInvoiceText(text,[],'2026-10-20'),actual=result.detected.concept,missingConcept=result.missingFields.includes('concepto')
 return{text,expected,actual,missingConcept,pass:actual===expected&&missingConcept===(expected===null)}
})
const report={source,pins,scope:'Actual parser, synthetic input only; no network',cases,passed:cases.filter(r=>r.pass).length,failed:cases.filter(r=>!r.pass).length}
writeFileSync(resolve(root,args[3]),JSON.stringify(report,null,2)+'\n',{flag:'wx'})
console.log(JSON.stringify(report,null,2));if(report.failed)process.exitCode=1
