const {readFile,mkdtemp,rm}=process.getBuiltinModule('node:fs/promises')
const {createServer}=process.getBuiltinModule('node:http')
const {tmpdir}=process.getBuiltinModule('node:os')
const {resolve,dirname,sep}=process.getBuiltinModule('node:path')
const root=resolve(__dirname,'../..')
let assets
async function build(){
 if(assets)return assets
 assets=(async()=>{
  const webpackImport=await import('next/dist/compiled/webpack/webpack.js'),{webpack}=webpackImport.default??webpackImport
  const {compile}=await import('@tailwindcss/node'),{Scanner}=await import('@tailwindcss/oxide')
  const output=await mkdtemp(resolve(tmpdir(),'crm-documents-pro-'))
  const before=process.env.DOCUMENTS_PRO_BEFORE_SOURCE
  const globalBefore=process.env.DOCUMENTS_PRO_GLOBAL_BEFORE_SOURCE
  if(before&&!resolve(before).startsWith(resolve(root,'../../outputs')+sep))throw Error('OWNED_BEFORE_SOURCE_REQUIRED')
  if(globalBefore&&!resolve(globalBefore).startsWith(resolve(root,'../../outputs')+sep))throw Error('OWNED_GLOBAL_BEFORE_SOURCE_REQUIRED')
  try{
   await new Promise((accept,reject)=>{
    const compiler=webpack({mode:'development',context:root,target:'web',devtool:false,
     entry:resolve(__dirname,'fixture-entry.tsx'),output:{path:output,filename:'component.js'},optimization:{minimize:false},
     plugins:[new webpack.DefinePlugin({'process.env':JSON.stringify({NODE_ENV:'development'})}),...(before?[new webpack.NormalModuleReplacementPlugin(/IntegratedDocuments$/,resource=>{resource.request=resolve(before)}),new webpack.NormalModuleReplacementPlugin(/^\.\//,resource=>{if(resource.context===dirname(resolve(before)))resource.request=resolve(root,'src/features/documents',resource.request)})]:[]),...(globalBefore?[new webpack.NormalModuleReplacementPlugin(/IntegratedDocumentLibrary$/,resource=>{resource.request=resolve(globalBefore)}),new webpack.NormalModuleReplacementPlugin(/^\.\//,resource=>{if(resource.context===dirname(resolve(globalBefore)))resource.request=resolve(root,'src/features/documents',resource.request)})]:[])],
     resolve:{extensions:['.tsx','.ts','.js'],modules:[resolve(root,'node_modules'),'node_modules'],alias:{'@':resolve(root,'src')}},
     module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:resolve(root,'tests/e2e-preview/fixtures/billing-focus-loader.cjs')}]}})
    compiler.run((error,stats)=>compiler.close(closeError=>{if(error||closeError||stats?.hasErrors())reject(error??closeError??Error(stats.toString({all:false,errors:true})));else accept()}))
   })
   const compiled=await compile(await readFile(resolve(root,'src/app/globals.css'),'utf8'),{base:resolve(root,'src/app'),onDependency(){}})
   const scanner=new Scanner({sources:[{base:resolve(root,'src'),pattern:'**/*.{ts,tsx}',negated:false}]})
   return{js:await readFile(resolve(output,'component.js')),css:compiled.build(scanner.scan())}
  }finally{
   if(!resolve(output).startsWith(resolve(tmpdir())+sep)||!output.startsWith(resolve(tmpdir(),'crm-documents-pro-')))throw Error('OWNED_TEMP_OUTPUT_REQUIRED')
   await rm(output,{recursive:true,force:true})
  }
 })()
 return assets
}
exports.startDocumentsFixture=async function({library=false,strict=false}={}){
 const files=await build()
 const server=createServer((request,response)=>{
  if(request.url==='/component.js'){response.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8'});response.end(files.js);return}
  if(request.url==='/styles.css'){response.writeHead(200,{'Content-Type':'text/css; charset=utf-8'});response.end(files.css);return}
  if(!['/','/documents'].includes(request.url.split('?')[0])){response.writeHead(404);response.end();return}
  response.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});response.end('<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/styles.css"><style>body{font-family:Arial,sans-serif}header.fixture{height:64px;padding:20px;background:white}main{height:calc(100vh - 64px);overflow:auto;padding:16px;overflow-anchor:none}#app{max-width:1240px;margin:auto}</style><header class="fixture">CRM · Documentación sintética</header><main><div id="app"></div></main><script>window.crmDocumentsLibraryFixture='+JSON.stringify(library)+';window.crmDocumentsStrictFixture='+JSON.stringify(strict)+'</script><script src="/component.js"></script>')
 })
 await new Promise(accept=>server.listen(0,'127.0.0.1',accept))
 const address=server.address();if(!address||typeof address==='string')throw Error('LOOPBACK_REQUIRED')
 return{url:`http://127.0.0.1:${address.port}`,async close(){server.closeAllConnections();await new Promise((accept,reject)=>server.close(error=>error?reject(error):accept()))}}
}
