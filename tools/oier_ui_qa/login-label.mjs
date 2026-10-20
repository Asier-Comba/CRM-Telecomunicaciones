import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {chromium} from '@playwright/test'
const args=process.argv.slice(2),options=new Map()
for(let i=0;i<args.length;i+=2){
 if(!['--html','--source','--output'].includes(args[i])||!args[i+1]||options.has(args[i]))throw Error('EXACT_LOCAL_BUILD_INPUT_REQUIRED')
 options.set(args[i],args[i+1])
}
if(options.size!==3||!/^[a-f0-9]{40}$/.test(options.get('--source')))throw Error('EXACT_LOCAL_BUILD_INPUT_REQUIRED')
const html=readFileSync(options.get('--html'),'utf8')
const report={contract:'oier.login-label.compiled-html.v1',source:options.get('--source'),htmlSha256:createHash('sha256').update(html).digest('hex'),scope:'COMPILED_HTML_STATIC_CHROMIUM_NO_JAVASCRIPT_NO_AUTH_NO_NETWORK',rows:[],cloud:'NOT_RUN',hydratedLogin:'NOT_RUN',release:'NOT_ACCEPTED'}
const browser=await chromium.launch({headless:true})
try{
 const context=await browser.newContext({javaScriptEnabled:false})
 await context.route('**/*',route=>route.abort())
 for(const width of [390,768,1440]){
  const page=await context.newPage();await page.setViewportSize({width,height:960})
  await page.setContent(html,{waitUntil:'domcontentloaded'})
  const password=page.getByLabel('Contraseña',{exact:true})
  const count=await password.count()
  const input=count===1&&await password.evaluate(el=>el.tagName==='INPUT'&&el.type==='password')
  const labels=await page.locator('label').evaluateAll(elements=>elements.filter(el=>el.textContent.trim()==='Contraseña').map(el=>({input:el.control?.tagName==='INPUT'&&el.control?.type==='password',hasButton:el.querySelector('button')!==null})))
  const recoveryButtons=await page.getByRole('button',{name:'¿La has olvidado?',exact:true}).count()
  const passed=input&&labels.length===1&&labels[0].input&&!labels[0].hasButton&&recoveryButtons===1
  report.rows.push({width,passwordLabelMatches:count,associatedPasswordInput:input,labelContainsOnlyItsControl:labels.length===1&&labels[0].input&&!labels[0].hasButton,recoveryButtons,result:passed?'PASS':'FAIL'})
  await page.close()
 }
 await context.close()
}finally{await browser.close()}
report.result=report.rows.every(row=>row.result==='PASS')?'PASS_STATIC_LABEL_ONLY':'FAIL_STATIC_LABEL'
writeFileSync(options.get('--output'),JSON.stringify(report,null,2)+'\n',{flag:'wx'})
console.log(JSON.stringify(report,null,2))
process.exitCode=report.result==='PASS_STATIC_LABEL_ONLY'?0:1
