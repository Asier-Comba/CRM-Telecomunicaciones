const { readFile, mkdtemp, rm } = process.getBuiltinModule('node:fs/promises')
const { createServer } = process.getBuiltinModule('node:http')
const { tmpdir } = process.getBuiltinModule('node:os')
const { resolve, sep } = process.getBuiltinModule('node:path')
const root = resolve(__dirname, '../../..')
let assets
async function build() {
 if (assets) return assets
 assets = (async () => {
  const webpackModule=await import('next/dist/compiled/webpack/webpack.js')
  const {webpack}=webpackModule.default ?? webpackModule
  const {compile}=await import('@tailwindcss/node'),{Scanner}=await import('@tailwindcss/oxide')
  const output = await mkdtemp(resolve(tmpdir(), 'crm-billing-focus-'))
  try {
   await new Promise((accept, reject) => {
    const compiler = webpack({mode:'development',context:root,target:'web',devtool:false,
     entry:resolve(root,'tests/e2e-preview/fixtures/billing-focus-entry.tsx'),
     output:{path:output,filename:'component.js'},optimization:{minimize:false},
     plugins:[new webpack.NormalModuleReplacementPlugin(/Provider$/, resource=>{
      if(resource.context.replaceAll('\\','/').includes('/src/features/product'))resource.request=resolve(root,'tests/e2e-preview/fixtures/billing-focus-provider.ts')
     })],
     resolve:{extensions:['.tsx','.ts','.js'],alias:{'@/features/product/integration/Provider$':resolve(root,'tests/e2e-preview/fixtures/billing-focus-provider.ts'),'@':resolve(root,'src')}},
     module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:resolve(root,'tests/e2e-preview/fixtures/billing-focus-loader.cjs')}]}})
    compiler.run((error, stats) => compiler.close(closeError => {
     if(error || closeError || stats?.hasErrors()) reject(error ?? closeError ?? Error(stats.toString({all:false,errors:true})))
     else accept()
    }))
   })
   const compiled = await compile(await readFile(resolve(root,'src/app/globals.css'),'utf8'),{base:resolve(root,'src/app'),onDependency(){}})
   const scanner = new Scanner({sources:[{base:resolve(root,'src'),pattern:'**/*.{ts,tsx}',negated:false}]})
   return {js:await readFile(resolve(output,'component.js')),css:compiled.build(scanner.scan())}
  } finally {
   if(!resolve(output).startsWith(resolve(tmpdir())+sep)||!output.startsWith(resolve(tmpdir(),'crm-billing-focus-')))throw Error('OWNED_TEMP_OUTPUT_REQUIRED')
   await rm(output,{recursive:true,force:true})
  }
 })()
 return assets
}
exports.startBillingFocusFixture = async function startBillingFocusFixture() {
 const compiled=await build(), requests=[], held=new Set(), heldPdf=new Set()
 const id='10000000-0000-4000-8000-000000000001'
 const profile={legal_name:'Synthetic Company',tax_id:'SYNTHETIC',address:'Synthetic Street',postal_code:'48001',city:'Bilbao',region:'Bizkaia',country:'ES'}
 const invoice={id,version:3,status:'issued',customer_id:id,issue_on:'2026-10-11',due_on:null,series:'A',currency:'EUR',number:{series:'A',year:2026,sequence:8},
  totals:{subtotal_minor:2500,tax_minor:525,withholding_minor:0,total_minor:3025},overdue:false,
  lines:[{description:'Synthetic service',quantity_milli:1000,unit_price_minor:2500,discount_bps:0,tax_bps:2100,withholding_bps:0}],notes:null,contract_id:null,service_id:null,opportunity_id:null,
  issuer:{...profile,currency:'EUR',default_series:'A'},customer_fiscal:profile,issued_at:'2026-10-11T00:00:00.000Z',paid_at:null,fx:null}
 const json=(response,value,status=200)=>{response.writeHead(status,{'Content-Type':'application/json'});response.end(JSON.stringify(value))}
 const server=createServer(async(request,response)=>{
  if(request.method==='GET'&&request.url==='/component.js'){response.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8'});response.end(compiled.js);return}
  if(request.method==='GET'&&request.url==='/styles.css'){response.writeHead(200,{'Content-Type':'text/css; charset=utf-8'});response.end(compiled.css);return}
  if(request.method==='GET'&&request.url==='/'){response.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});response.end('<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/styles.css"><style>body{font-family:Arial,sans-serif}#main-content{height:calc(100vh - 64px);overflow:auto;padding:24px;overflow-anchor:none}header{height:64px;background:white}#app{max-width:1200px;margin:auto}</style><header>CRM synthetic billing fixture</header><main id="main-content"><div id="app"></div></main><script src="/component.js"></script>');return}
  let body='';for await(const chunk of request){body+=chunk;if(body.length>10000){json(response,{ok:false,error:'validation'},400);return}}
  const query=JSON.parse(body||'{}');requests.push({method:request.method,url:request.url,operation:query.operation})
  if(request.method!=='POST'||request.url.includes('/commands')){json(response,{ok:false,error:'access_denied'},403);return}
  if(query.operation==='invoice.list'){held.add(response);response.once('close',()=>held.delete(response));return}
  if(query.operation==='invoice.get'){json(response,{ok:true,data:{contract_version:'billing.v1',operation:query.operation,invoice}});return}
  if(query.operation==='invoice.financial_summary'){json(response,{ok:true,data:{contract_version:'billing.v1',operation:query.operation,period:'month',from:'2026-10-01',to:'2026-11-01',as_of:'2026-10-11',currencies:[]}});return}
  if(query.operation==='configuration.get'){json(response,{ok:true,data:{contract_version:'billing.v1',operation:query.operation,issuer:{version:1,profile,currency:'EUR',default_series:'A'},customer:null}});return}
  if(query.operation==='invoice.private_pdf_reference'){heldPdf.add(response);response.once('close',()=>heldPdf.delete(response));return}
  json(response,{ok:false,error:'access_denied'},403)
 })
 await new Promise(accept=>server.listen(0,'127.0.0.1',accept))
 const address=server.address();if(!address||typeof address==='string')throw Error('FIXTURE_ADDRESS')
 return {url:`http://127.0.0.1:${address.port}`,requests,invoice,
  releaseList(){const summary=Object.fromEntries(['currency','customer_id','due_on','id','issue_on','number','overdue','series','status','totals','version'].map(key=>[key,invoice[key]]));for(const response of [...held])json(response,{ok:true,data:{contract_version:'billing.v1',operation:'invoice.list',items:Array.from({length:50},(_,index)=>({...summary,id:`10000000-0000-4000-8000-${String(index+2).padStart(12,'0')}`,number:{series:'A',year:2026,sequence:index+9}})),next_id:null}})},
  releasePdf(){for(const response of [...heldPdf])json(response,{ok:false,error:'not_found'},404)},
  async close(){server.closeAllConnections();await new Promise((accept,reject)=>server.close(error=>error?reject(error):accept()))}}
}
