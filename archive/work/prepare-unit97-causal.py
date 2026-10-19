from pathlib import Path
w=Path('work');r=w/'crm-w2x-document-upload-uncertain';s=(r/'tests/e2e-preview/customer-list-name-wrap.spec.ts').read_text(encoding='utf-8');s=s.replace("['long','ordinary','denied']","['long','ordinary']").replace('customer inventory name','customer inventory filter priority')
a=s.index("  if(mode==='denied'){\n   await expect(page.getByRole('alert'))");b=s.index("  expect(commands).toEqual([]);",a)
body="""  const row=page.locator('[data-customer-id="'+id+'"]').filter({visible:true}),link=row.getByRole('link',{name:title,exact:true})
  await expect(link).toBeVisible();await page.getByRole('heading',{name:'Clientes',exact:true}).evaluate(el=>el.scrollIntoView({block:'start'}))
  const geometry=await link.evaluate(el=>{const r=el.getBoundingClientRect(),m=document.querySelector('#main-content')!.getBoundingClientRect(),h=document.querySelector('h1')!.getBoundingClientRect();return{top:r.top,bottom:r.bottom,mainTop:m.top,mainBottom:m.bottom,headingTop:h.top,relativeToHeading:r.top-h.top}})
  await writeFile(info.outputPath('observations.json'),JSON.stringify({width,mode,geometry,reads,commands,unexpected,errors},null,2))
  await page.screenshot({path:info.outputPath(`customer-filter-priority-${mode}-${width}.png`),fullPage:false})
  await expect(link,'first customer remains primary after aligning component heading').toBeInViewport({ratio:0.9})
  const toggle=page.getByRole('button',{name:/^Filtros de clientes/}),status=page.getByRole('combobox',{name:'Estado de cliente',exact:true})
  if(width<768){
   await expect(toggle).toBeVisible();await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(status).toBeHidden()
   await toggle.click();await expect(toggle).toHaveAttribute('aria-expanded','true');await expect(status).toBeVisible()
   const controls=await toggle.getAttribute('aria-controls');expect(controls).toBeTruthy();await expect(page.locator('[id="'+controls+'"]')).toBeVisible()
  }else{await expect(toggle).toBeHidden();await expect(status).toBeVisible()}
  await status.selectOption('active');await expect.poll(()=>reads.filter(q=>q.operation==='customer.list'&&q.input.status==='active').length).toBe(1);await expect(link).toBeVisible()
  if(width<768){
   await expect(toggle).toHaveAttribute('aria-expanded','true');await expect(status).toBeVisible();await expect(status).toHaveValue('active')
   await toggle.click();await expect(status).toBeHidden();await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(toggle).toContainText('Aplicados');await expect(toggle).toBeFocused()
   await toggle.click();await expect(status).toHaveValue('active');await expect(toggle).toHaveAttribute('aria-expanded','true')
   await page.screenshot({path:info.outputPath(`customer-filter-expanded-${mode}-${width}.png`),fullPage:false})
  }
  await writeFile(info.outputPath('observations.json'),JSON.stringify({width,mode,geometry,interaction:'FILTER_VALUES_AND_EXPANSION_PRESERVED',reads,commands,unexpected,errors},null,2))
"""
s=s[:a]+body+s[b:];(r/'tests/e2e-preview/customer-list-filter-priority.spec.ts').write_text(s,encoding='utf-8');(w/'w2x-customer-list-filter-priority-causal-bank.ts').write_text(s,encoding='utf-8')
for stage in ['causal','final']:
 (w/f'playwright-w2x-customer-list-filter-priority-{stage}.config.cjs').write_text("const p=require('./playwright-w2x-customer-list-name-wrap-final.config.cjs');module.exports={...p,testMatch:"+("['customer-list-filter-priority.spec.ts']" if stage=='causal' else "[...p.testMatch,'customer-list-filter-priority.spec.ts']")+",outputDir:require('node:path').resolve(__dirname,'w2x-customer-list-filter-priority-"+stage+"-results')}\n",encoding='utf-8')
