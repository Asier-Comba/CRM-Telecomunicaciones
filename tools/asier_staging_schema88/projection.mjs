import {createHash} from 'node:crypto'
import {lstatSync,mkdirSync,readdirSync,readFileSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {loadOwnedConsumerHistoricalD1V1} from '../../scripts/security/native-postgres/owned-consumer-migrations-d1-v1.mjs'

export const storage88=Object.freeze({source:'d9799f6610c9841528040c6437f3a51cea4ee386',path:'supabase/migrations/20261021090000_document_object_read_server_fetch.sql',git_blob:'381cfb530a98676806eda2bb89504475b8acbd00',sha256:'64bc484e1e80db1766e5265e1f96e4040d995086c3067682791146cbe5ab6fcc'})
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
export function prepareProjection(root,destination,project){
 if(!/^crm-telecom-p0-schema88-[0-9]{1,20}$/.test(project))throw Error('DISPOSABLE_PROJECT_REQUIRED')
 const stat=lstatSync(destination)
 if(!stat.isDirectory()||stat.isSymbolicLink()||readdirSync(destination).length)throw Error('EMPTY_OWNED_DIRECTORY_REQUIRED')
 // Validate the COMPLETE current D1 source before explicitly excluding its forward migration.
 const historical=loadOwnedConsumerHistoricalD1V1(root,87)
 const fixture=readFileSync(new URL('./storage88.sql',import.meta.url),'utf8').replaceAll('\r\n','\n')
 if(hash(fixture)!==storage88.sha256)throw Error('STORAGE88_FIXTURE_PIN_MISMATCH')
 const config=readFileSync(new URL('supabase/config.toml',root),'utf8')
 if(!config.includes('project_id = "crm-telecom-local"')||!config.includes('major_version = 15'))throw Error('CANONICAL_CONFIG_MISMATCH')
 const directory=join(destination,'supabase','migrations');mkdirSync(directory,{recursive:true})
 for(const row of historical.migrations)writeFileSync(join(directory,row.name),row.sql,{flag:'wx'})
 writeFileSync(join(directory,storage88.path.split('/').at(-1)),fixture,{flag:'wx'})
 writeFileSync(join(destination,'supabase','config.toml'),config.replace('project_id = "crm-telecom-local"','project_id = "'+project+'"').replace('major_version = 15','major_version = 17'),{flag:'wx'})
 return Object.freeze({contract:'staging.base87-plus-storage88.disposable.v1',count:88,source_validated_count:historical.validatedCompleteCount,excluded_d1:historical.excludedForward,storage88,postgres_major:17,hosted_mutation:false,flags:Object.freeze({library:false,content:false,maintenance:false,ai:false,providers:false})})
}
