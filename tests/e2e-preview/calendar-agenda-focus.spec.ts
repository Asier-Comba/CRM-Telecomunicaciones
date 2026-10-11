import {expect,test} from '@playwright/test'
import {startCalendarFocusFixture} from './fixtures/calendar-focus-server.cjs'
// Actual shared Calendar/React/Tailwind presentation; no Auth/DB acceptance claim.
for(const width of [390,768,1440])test(`calendar agenda stays primary and filters remain usable at ${width}`,async({page},info)=>{
 const fixture=await startCalendarFocusFixture(),errors:string[]=[]
 page.on('pageerror',error=>errors.push(error.message))
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url)
  const week=page.getByRole('button',{name:'Semana',exact:true})
  await expect(week).toHaveAttribute('aria-pressed','true')
  const agenda=page.locator('section').filter({has:week}),box=await agenda.boundingBox()
  expect(box).not.toBeNull();expect(box!.y,'agenda must begin within the first viewport').toBeLessThan(600)
  await expect(agenda.getByText(/^dom.*11$/)).toBeInViewport({ratio:0.9})
  const initial=info.outputPath(`calendar-agenda-initial-${width}.png`);await page.screenshot({path:initial,fullPage:false});await info.attach(`calendar-agenda-initial-${width}`,{path:initial,contentType:'image/png'})
  const filters=page.locator('aside'),toggle=page.getByRole('button',{name:'Fecha y filtros',exact:true})
  if(width<1280){await expect(filters).toBeHidden();await expect(toggle).toHaveAttribute('aria-expanded','false');await toggle.click();await expect(filters).toBeVisible();await expect(toggle).toHaveAttribute('aria-expanded','true');await expect(toggle).toHaveAttribute('aria-controls',await filters.getAttribute('id')??'')}
  else{await expect(filters).toBeVisible();await expect(toggle).toBeHidden()}
  await page.getByRole('combobox',{name:'Tipo de evento',exact:true}).selectOption('task')
  if(width<1280){await toggle.click();await expect(filters).toBeHidden();await expect(toggle).toBeFocused();await expect(toggle).toContainText('Aplicados')}
  await page.getByRole('button',{name:'Agenda',exact:true}).click()
  await expect(agenda.getByRole('button').filter({hasText:'Synthetic task'})).toHaveCount(1)
  await expect(agenda.getByRole('button').filter({hasText:'Synthetic meeting'})).toHaveCount(0)
  if(width<1280)await toggle.click()
  await expect(page.getByRole('combobox',{name:'Tipo de evento',exact:true})).toHaveValue('task')
  await page.getByRole('combobox',{name:'Tipo de evento',exact:true}).selectOption('')
  await page.getByRole('button',{name:'Ir al 2026-10-12',exact:true}).click()
  await expect(page.getByRole('button',{name:'Ir al 2026-10-12',exact:true})).toHaveAttribute('aria-pressed','true')
  if(width<1280)await toggle.click()
  await page.getByRole('button',{name:'Hoy',exact:true}).click()
  await expect(agenda.getByRole('button').filter({hasText:'Synthetic meeting'})).toHaveCount(1)
  await expect(agenda.getByRole('button').filter({hasText:'Synthetic task'})).toHaveCount(1)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);expect(errors).toEqual([])
  const screenshot=info.outputPath(`calendar-agenda-focus-${width}.png`);await page.screenshot({path:screenshot,fullPage:false});await info.attach(`calendar-agenda-focus-${width}`,{path:screenshot,contentType:'image/png'})
 }finally{await fixture.close()}
})
