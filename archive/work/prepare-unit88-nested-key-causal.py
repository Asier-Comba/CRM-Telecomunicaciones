from pathlib import Path
import json,hashlib
w=Path('work');r=w/'crm-w2x-document-upload-uncertain';p='w2x-line-number-recovery-close';bank=(w/(p+'-causal-test.ts')).read_text(encoding='utf-8');f=w/(p+'-first-own-source.ts');f.write_bytes((r/'src/features/portabilities/Portabilities.tsx').read_bytes());(w/(p+'-first-own-test.ts')).write_text(bank,encoding='utf-8')
a=bank.index('for(const mode of');b=bank.index(' const fixture=',a)
header=bank[:a]+"for(const key of ['Escape','Tab'] as const)test('line number nested cancel '+key,async({page},info)=>{\n const mode='uncertain',width=390\n"+bank[b:bank.index(' try{',b)]
header=header.replace("from './fixtures/commercial-resource-server.cjs'","from '../crm-w2x-document-upload-uncertain/tests/e2e-preview/fixtures/commercial-resource-server.cjs'")
header=header.replace("reject=mode==='denied',effectsAfterDenied:number|undefined,controls:unknown","reject=false")
flow=""" let before:unknown,after:unknown,cancelEvents:unknown
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=portability-create-lifetime&reset_scope=1');await page.getByRole('button',{name:'Nueva portabilidad',exact:true}).click();await parent.getByRole('combobox',{name:'Línea de portabilidad',exact:true}).selectOption(id(5,1));await expect(parent.getByRole('button',{name:'Registrar número protegido de la línea',exact:true})).toBeEnabled();await review();await modal.getByRole('button',{name:'Confirmar cambio',exact:true}).click();await expect(modal.getByRole('alert')).toBeVisible();expect(effects).toBe(1);expect(commands).toHaveLength(1)
  await page.evaluate(()=>{const events:unknown[]=[];(window as unknown as {cancelEvents:unknown[]}).cancelEvents=events;document.addEventListener('cancel',e=>{const x={target:(e.target as Element).querySelector('h2')?.textContent,defaultPreventedBefore:e.defaultPrevented,defaultPreventedAfter:false};events.push(x);queueMicrotask(()=>{x.defaultPreventedAfter=e.defaultPrevented})},true)})
  before={parent:await parent.count(),form:await form.count(),modal:await modal.count()};await page.keyboard.press(key);await page.waitForLoadState('networkidle');after={parent:await parent.count(),form:await form.count(),modal:await modal.count()};cancelEvents=await page.evaluate(()=>(window as unknown as {cancelEvents:unknown[]}).cancelEvents)
  await expect(modal).toBeVisible();await expect(form).toBeVisible();await expect(parent).toBeVisible();expect(errors).toEqual([])
 }finally{await writeFile(info.outputPath('observations.json'),JSON.stringify({key,before,after,cancelEvents,effects,commands,errors,scope:'Complementary source87 keyboard event only,not childX or real DB'},null,2));await page.unrouteAll({behavior:'wait'});await page.close();await fixture.close()}
})
"""
d=w/'w2x-line-number-nested-key-bank';d.mkdir(exist_ok=True);(d/'nested-key.spec.ts').write_text(header+flow,encoding='utf-8')
(w/'playwright-w2x-line-number-nested-key-causal.config.cjs').write_text("const p=require('./playwright-w2x-billing-draft-receipt.config.cjs');module.exports={...p,testDir:require('node:path').resolve(__dirname,'w2x-line-number-nested-key-bank'),testMatch:['nested-key.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-line-number-nested-key-causal-results')}\n",encoding='utf-8')
(w/(p+'-first-own-fingerprints.json')).write_text(json.dumps({'source_sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'bank_sha256':hashlib.sha256((w/(p+'-first-own-test.ts')).read_bytes()).hexdigest(),'source_base':'1fd0d94da7687881d073c24b6edd550d2e4a2cdd','change':'childclosepolicyonly','scope':'Firstown186 inprogress50713;no source/test changes while running'},indent=2)+'\n',encoding='utf-8')
