export async function responseForAction(wait,action){
  // Observe first; handle both promises even if the UI action fails before a
  // response exists. The caller's finally closes the page and its waiter.
  const [response]=await Promise.all([wait(),Promise.resolve().then(action)])
  return response
}
