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
  const output = await mkdtemp(resolve(tmpdir(), 'crm-customer-domain-'))
  try {
   await new Promise((accept, reject) => {
    const compiler = webpack({mode:'development',context:root,target:'web',devtool:false,
     entry:resolve(root,'tests/e2e-preview/fixtures/customer-domain-entry.tsx'),
     output:{path:output,filename:'component.js'},optimization:{minimize:false},
     plugins:[new webpack.DefinePlugin({'process.env':JSON.stringify({NODE_ENV:'development'})}),new webpack.NormalModuleReplacementPlugin(/Provider$/, resource=>{
      if(resource.context.replaceAll('\\','/').includes('/src/features/product'))resource.request=resolve(root,'tests/e2e-preview/fixtures/pipeline-current-provider.tsx')
     })],
     resolve:{extensions:['.tsx','.ts','.js'],alias:{'@/features/product/integration/Provider$':resolve(root,'tests/e2e-preview/fixtures/pipeline-current-provider.tsx'),'@':resolve(root,'src')}},
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
   if(!resolve(output).startsWith(resolve(tmpdir())+sep)||!output.startsWith(resolve(tmpdir(),'crm-customer-domain-')))throw Error('OWNED_TEMP_OUTPUT_REQUIRED')
   await rm(output,{recursive:true,force:true})
  }
 })()
 return assets
}
exports.startCustomerDomainFixture = async function startCustomerDomainFixture() {
 const compiled=await build()
 const server=createServer((request,response)=>{
  if(request.url==='/component.js'){response.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8'});response.end(compiled.js);return}
  if(request.url==='/styles.css'){response.writeHead(200,{'Content-Type':'text/css; charset=utf-8'});response.end(compiled.css);return}
  if(request.url.split('?')[0]!=='/'){response.writeHead(404);response.end();return}
  response.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});response.end('<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/styles.css"><style>body{font-family:Arial,sans-serif}.fixture-header{height:64px;background:white}#main-content{height:calc(100vh - 64px);overflow:auto;padding:24px;overflow-anchor:none}#app{max-width:1200px;margin:auto}</style><header class="fixture-header">CRM synthetic customer domain fixture</header><main id="main-content"><div id="app"></div></main><script src="/component.js"></script>')
 })
 await new Promise(accept=>server.listen(0,'127.0.0.1',accept))
 const address=server.address();if(!address||typeof address==='string')throw Error('FIXTURE_ADDRESS')
 return {url:`http://127.0.0.1:${address.port}`,async close(){server.closeAllConnections();await new Promise((accept,reject)=>server.close(error=>error?reject(error):accept()))}}
}
