/** Own disposable viewer context. Capture its failure before closing its page.
 * Capture failure must never replace the original acceptance failure. */
export async function withHistoryViewerSession({browser,origin,cookie,run,captureFailure}) {
  let context,page,failed=false
  try {
    context=await browser.newContext({viewport:{width:390,height:960}})
    await context.addCookies(cookie.split('; ').map(part=>{const at=part.indexOf('=');return{name:part.slice(0,at),value:part.slice(at+1),url:origin}}))
    page=await context.newPage();page.setDefaultTimeout(30000)
    return await run(page)
  } catch(error) {
    failed=true
    if(page&&!page.isClosed())await Promise.resolve().then(()=>captureFailure(page)).catch(()=>{})
    throw error
  } finally {
    // Also preserve the original failure if context cleanup itself refuses.
    if(failed)await context?.close().catch(()=>{})
    else await context?.close()
  }
}
