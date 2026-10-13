/** Keep the first exact current-document read without starting its wait budget. */
export function captureCurrentPortfolioRequest({page,destination,predicate}){
 const url=new URL(destination)
 if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.username||url.password||url.hash||url.pathname!=='/portfolio')throw Error('PORTFOLIO_REFERENCE_DESTINATION_INVALID')
 const main=page.mainFrame();let observed=false,changed=false,first=null,finished=false,navigationRequest=null
 const navigated=frame=>{
  if(frame!==main)return
  // replaceState/pushState can emit this event without replacing the document.
  if(observed&&(navigationRequest!==null||frame.url()!==destination)){changed=true;first=null}
  else if(!observed&&navigationRequest!==null&&frame.url()===destination)observed=true
  navigationRequest=null
 }
 const matches=request=>{
  if(finished||!observed||changed||main.url()!==destination)return false
  try{return request.frame()===main&&predicate(request)}catch{return false}
 }
 const capture=request=>{
  try{if(request.frame()===main&&request.isNavigationRequest()&&request.resourceType()==='document'){navigationRequest=request;return}}catch{/* No detached or service-worker frame evidence. */}
  if(first===null&&matches(request))first=request
 }
 const failed=request=>{if(navigationRequest===request)navigationRequest=null}
 page.on('framenavigated',navigated);page.on('request',capture);page.on('requestfailed',failed)
 return{
  async wait(){
   if(finished)throw Error('PORTFOLIO_REFERENCE_CAPTURE_FINISHED')
   if(changed)throw Error('PORTFOLIO_REFERENCE_DOCUMENT_CHANGED')
   return first??await page.waitForRequest(matches)
  },
  finish(){finished=true;first=null;navigationRequest=null;page.off('framenavigated',navigated);page.off('request',capture);page.off('requestfailed',failed)},
 }
}
