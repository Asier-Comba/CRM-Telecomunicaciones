import {spawnSync} from 'node:child_process'
import {run} from './lib.mjs'
try{
 if(process.env.CI!=='true'||process.env.GITHUB_ACTIONS!=='true')throw new Error('IMAGE_SCAN_CI_ONLY')
 const version=JSON.parse(run('trivy',['version','--format','json']))
 if(version.Version!=='0.75.0')throw new Error('IMAGE_SCANNER_VERSION_MISMATCH')
 // Raw scanner results can include secret matches. Keep them in memory and emit
 // only vulnerability coordinates/counts, never snippets or credential values.
 const scan=spawnSync('trivy',['image','--scanners','vuln,secret','--format','json','--quiet','--timeout','10m','crm-w5-package:test'],{encoding:'utf8',timeout:660000,maxBuffer:32*1024*1024})
 if(scan.status!==0)throw new Error('IMAGE_SCAN_UNAVAILABLE')
 const data=JSON.parse(scan.stdout)
 if(!Array.isArray(data.Results)||!data.Results.length)throw new Error('IMAGE_SCAN_NO_RESULTS')
 const vulnerabilities=data.Results.flatMap(r=>(r.Vulnerabilities??[]).filter(v=>['HIGH','CRITICAL'].includes(v.Severity)).map(v=>({id:v.VulnerabilityID,package:v.PkgName,installed:v.InstalledVersion,fixed:v.FixedVersion??null,severity:v.Severity})))
 const secrets=data.Results.reduce((sum,r)=>sum+(r.Secrets?.length??0),0)
 console.log(JSON.stringify({result:vulnerabilities.length||secrets?'FAIL':'PASS',scanner:'trivy-0.75.0',image:run('docker',['image','inspect','crm-w5-package:test','--format','{{.Id}}']).trim(),high_critical:vulnerabilities,secret_findings:secrets,raw_results_retained:false}))
 if(vulnerabilities.length||secrets)process.exitCode=1
}catch{console.error(JSON.stringify({result:'FAIL',error:'IMAGE_SECURITY_SCAN_NOT_PROVEN',raw_results_retained:false}));process.exitCode=1}
