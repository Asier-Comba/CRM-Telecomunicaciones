import {expect} from '@playwright/test'
import {resolve} from 'node:path'

export async function teamCompleteRowsBrowser({page,width,screenshotDir,report}){
 const step=name=>{if(report)report.w2_ui_action_step='layout:team:'+width+':'+name}
 const table=page.getByRole('table',{name:'Equipo del espacio',exact:true}),rows=table.locator('tr[data-team-member-id]')
 step('complete_members');await expect(table).toHaveCount(1);await expect(table.getByRole('columnheader')).toHaveCount(4)
 if(!await rows.count())throw Error('TEAM_COMPLETE_ROWS_EMPTY')
 for(const row of await rows.all()){
  await row.scrollIntoViewIfNeeded();await expect(row.getByRole('cell')).toHaveCount(4)
  for(const cell of await row.getByRole('cell').all()){
   await expect(cell).toBeInViewport({ratio:1})
   if(!await cell.evaluate(el=>{const r=el.getBoundingClientRect(),m=el.closest('main').getBoundingClientRect();return r.left>=m.left-1&&r.right<=m.right+1&&r.top>=m.top-1&&r.bottom<=m.bottom+1}))throw Error('TEAM_MEMBER_CELL_OUTSIDE_MAIN')
  }
  for(const control of await row.locator('button,select').all())await expect(control).toBeInViewport({ratio:1})
  if(width===390)for(const name of ['Usuario','Rol','Estado','Acciones'])await expect(row.locator('span[aria-hidden="true"]').filter({hasText:new RegExp('^'+name+'$')})).toBeInViewport({ratio:1})
 }
 if(await table.evaluate(el=>el.parentElement.scrollWidth>el.parentElement.clientWidth+1)||await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('TEAM_COMPLETE_ROWS_HORIZONTAL_CLIPPING')
 step('capture');await page.getByRole('main').evaluate(el=>{el.scrollTop=0});await page.screenshot({path:resolve(screenshotDir,'team-complete-members-'+width+'.png'),fullPage:true})
}
