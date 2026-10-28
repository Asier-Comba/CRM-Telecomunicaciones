export async function cleanupOwnedSteps(steps){
 const result={}
 for(const [name,action]of Object.entries(steps)){try{await action();result[name]='PASS'}catch{result[name]='FAIL'}}
 return {result,ok:Object.values(result).every(value=>value==='PASS')}
}

export async function stopOwnedChild(child,{graceMs=5000,killMs=5000}={}){
 if(!child||child.exitCode!==null||child.signalCode!==null)return
 await new Promise((resolve,reject)=>{
  let timer
  const finish=error=>{clearTimeout(timer);child.off('exit',exit);child.off('error',failure);if(error)reject(error);else resolve()}
  const exit=()=>finish(),failure=()=>finish(Error('CHILD_EXIT_UNCONFIRMED'))
  child.once('exit',exit);child.once('error',failure)
  timer=setTimeout(()=>{
   timer=setTimeout(()=>finish(Error('CHILD_EXIT_UNCONFIRMED')),killMs)
   try{child.kill('SIGKILL')}catch{failure()}
  },graceMs)
  try{child.kill('SIGTERM')}catch{failure()}
 })
}
