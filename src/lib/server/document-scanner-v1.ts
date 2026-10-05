export interface DocumentScannerV1{readonly id:string;scan(bytes:Uint8Array):Promise<Readonly<{status:'unavailable'|'fixture_only'|'rejected';engine:string}>>}
export function documentScannerReadinessV1(required:boolean){return{required,status:'unavailable' as const,registered_production_adapters:0,may_claim_clean:false}}
export function createDisposableDocumentScannerV1(env:Readonly<Record<string,string|undefined>>=process.env):DocumentScannerV1{
 if(process.env.NODE_ENV==='production'||env.NODE_ENV!=='test')throw new Error('SCANNER_FIXTURE_TEST_ONLY')
 return{id:'disposable-fixture',scan:async bytes=>({status:Buffer.from(bytes).includes(new TextEncoder().encode('SYNTHETIC_REJECT_FIXTURE'))?'rejected':'fixture_only',engine:'deterministic_fixture_only_no_antivirus'})}
}
