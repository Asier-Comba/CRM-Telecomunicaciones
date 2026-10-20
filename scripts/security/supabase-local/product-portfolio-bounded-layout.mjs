import {observePortfolioBoundedSearchV1} from './portfolio-bounded-search-observation-v1.mjs'

/** The original three actions and budgets, with passive, value-free diagnostics.
 * A completed button wait does not assert that every result has rendered. */
export async function portfolioBoundedLayout({page,expect,origin,width,expectedContractId,report}){
 const prefix='layout:portfolio:'+width+':bounded_search',started=performance.now()
 let phase='fill',completed=false,observed=null
 const phases=[]
 const mark=name=>{phase=name;phases.push({phase:name,elapsed_ms:Math.round(performance.now()-started)});if(report)report.w2_ui_action_step=prefix+':'+name}
 try{
  try{observed=observePortfolioBoundedSearchV1({page,origin,query:'W2 UI',expectedContractId})}catch{/* Diagnostics cannot replace the original assertion. */}
  mark('fill');await page.getByLabel('Consultar cartera local',{exact:true}).fill('W2 UI')
  mark('click');await page.getByRole('button',{name:'Consultar cartera',exact:true}).click()
  mark('button_enabled');await expect(page.getByRole('button',{name:'Consultar cartera',exact:true})).toBeEnabled()
  completed=true
 }finally{
  try{
   const transport=observed?.finish()??null
   if(report){report.w2_portfolio_bounded_layout_observations??=[];report.w2_portfolio_bounded_layout_observations.push({
    contract:'w2.portfolio-bounded-layout.v1',width,phase,completed,elapsed_ms:Math.round(performance.now()-started),phases,
    transport,render_acceptance:'NOT_MEASURED_BUTTON_ENABLED_IS_NOT_RESULT_READBACK',
   })}
  }catch{/* Preserve the original exception, including timeout and call log. */}
 }
}
