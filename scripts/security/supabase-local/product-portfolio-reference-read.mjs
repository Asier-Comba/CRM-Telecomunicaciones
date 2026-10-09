import {parsePortfolioGetInputV1,parsePortfolioGetV1} from '../../../src/lib/server/portfolio-runtime-v1.ts'

/** Correlate the current navigation's ordinary read before asserting rendering. */
export async function currentPortfolioReference({page,origin,kind,id,report}){
 const input=parsePortfolioGetInputV1({kind,id})
 if(!input)throw Error('PORTFOLIO_REFERENCE_INPUT_INVALID')
 const phase=report?.w2_ui_action_step??'portfolio_reference'
 const step=name=>{if(report)report.w2_ui_action_step=phase+':'+name}
 step('fresh_document');await page.goto('about:blank')
 step('current_request')
 const pending=page.waitForRequest(request=>{
  if(request.method()!=='POST'||request.url()!==origin+'/api/portfolio/v1/queries')return false
  try{const body=request.postDataJSON();return Object.keys(body).sort().join(',')==='input,operation'&&body.operation==='portfolio.get'&&Object.keys(body.input).sort().join(',')==='id,kind'&&body.input.kind===input.kind&&body.input.id===input.id}catch{return false}
 })
 await page.goto(origin+'/portfolio?kind='+input.kind+'&id='+input.id)
 const request=await pending;step('current_response');const response=await request.response()
 if(!response||response.status()!==200)throw Error('PORTFOLIO_REFERENCE_HTTP_REFUSED')
 step('current_body');let body;try{body=await response.json()}catch{throw Error('PORTFOLIO_REFERENCE_BODY_UNAVAILABLE')}
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).sort().join(',')!=='data,ok'||body.ok!==true)throw Error('PORTFOLIO_REFERENCE_ENVELOPE_INVALID')
 const value=parsePortfolioGetV1(input,body.data)
 if(!value)throw Error('PORTFOLIO_REFERENCE_CURRENT_DTO_INVALID')
 step('current_render');return value
}
