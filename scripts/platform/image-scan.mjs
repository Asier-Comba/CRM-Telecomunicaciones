import {spawnSync} from 'node:child_process'
import {run,readJson} from './lib.mjs'
import {imageEvidence} from './image-evidence.mjs'
try{
 if(process.env.CI!=='true'||process.env.GITHUB_ACTIONS!=='true')throw new Error('IMAGE_SCAN_CI_ONLY')
 const version=JSON.parse(run('trivy',['version','--format','json']))
 if(version.Version!=='0.75.0')throw new Error('IMAGE_SCANNER_VERSION_MISMATCH')
 // Raw scanner results can include secret matches. Keep them in memory and emit
 // only vulnerability coordinates/counts, never snippets or credential values.
 const selected=process.argv[2]??'app'
 if(!['app','n8n','postgres'].includes(selected))throw new Error('UNREGISTERED_IMAGE_SCAN_TARGET')
 const pin=selected==='app'?null:readJson('infra/n8n/disposable-image-pins.json')[selected]
 const image=pin?.image??'crm-w5-package:test'
 const inspected_image_id=run('docker',['image','inspect',image,'--format','{{.Id}}']).trim()
 const scan=spawnSync('trivy',['image','--image-src','docker','--scanners','vuln,secret','--image-config-scanners','secret','--format','json','--quiet','--timeout','10m',image],{encoding:'utf8',timeout:660000,maxBuffer:64*1024*1024})
 if(scan.status!==0)throw new Error('IMAGE_SCAN_UNAVAILABLE')
 const data=JSON.parse(scan.stdout)
 const evidence=imageEvidence(data,{source_sha:run('git',['rev-parse','HEAD']).trim(),target:selected,requested_image:image,inspected_image_id,expected_image_id:pin?.verified_linux_amd64_config_digest})
 console.log(JSON.stringify(evidence))
 if(evidence.result!=='PASS')process.exitCode=1
}catch{console.error(JSON.stringify({result:'FAIL',error:'IMAGE_SECURITY_SCAN_NOT_PROVEN',raw_results_retained:false}));process.exitCode=1}
