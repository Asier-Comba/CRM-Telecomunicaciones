// Each owned cleanup is attempted even if an earlier one throws/rejects. The
// caller must turn failed=true into FAIL; errors are never serialized to logs.
export async function independentCleanup(actions){
 let failed=false
 for(const action of actions){try{await action()}catch{failed=true}}
 return{failed}
}
