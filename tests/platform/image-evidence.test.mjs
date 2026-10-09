import {test} from 'node:test'
import assert from 'node:assert/strict'
import {imageEvidence} from '../../scripts/platform/image-evidence.mjs'
const image='sha256:'+'a'.repeat(64), context={source_sha:'b'.repeat(40),target:'n8n',requested_image:'docker.io/n8nio/n8n:2.42.6@'+image,inspected_image_id:image,expected_image_id:image}
const clean=()=>({Metadata:{ImageID:image},Results:[{Class:'os-pkgs',Vulnerabilities:[]}]})
test('image evidence binds requested, installed and actually scanned content; mismatches fail',()=>{
 assert.equal(imageEvidence(clean(),context).result,'PASS')
 assert.throws(()=>imageEvidence({...clean(),Metadata:{ImageID:'sha256:'+'c'.repeat(64)}},context),/SCANNED_IMAGE_ID_MISMATCH/)
 assert.throws(()=>imageEvidence(clean(),{...context,expected_image_id:'sha256:'+'c'.repeat(64)}),/CONFIG_DIGEST_MISMATCH/)
 assert.throws(()=>imageEvidence({Metadata:{ImageID:image},Results:[]},context),/NO_RESULTS/)
})
test('high/critical and secret findings remain blocking while raw snippets never enter evidence',()=>{
 const report=clean();report.Results[0].Vulnerabilities=[{VulnerabilityID:'CVE-2026-12345',PkgName:'library',InstalledVersion:'1.0',FixedVersion:'1.1',Severity:'HIGH',Title:'private-canary',Description:'private-canary'}]
 report.Results[0].Secrets=[{Match:'private-canary',Secret:'private-canary',StartLine:1}]
 const r=imageEvidence(report,context);assert.equal(r.result,'FAIL');assert.equal(r.secret_findings,1);assert.equal(r.high_critical.length,1);assert.equal(JSON.stringify(r).includes('private-canary'),false)
 assert.equal(r.company_runtime_accepted,false)
 const secretOnly=clean();secretOnly.Results[0].Secrets=report.Results[0].Secrets;assert.equal(imageEvidence(secretOnly,context).result,'FAIL')
})
test('malformed scanner data cannot be treated as a clean scan',()=>{
 assert.throws(()=>imageEvidence({Metadata:{ImageID:image},Results:[{}]},context),/RESULTS_INVALID/)
 const malformed=clean();malformed.Results[0].Secrets={};assert.throws(()=>imageEvidence(malformed,context),/RESULTS_INVALID/)
 const malformedCoordinates=clean();malformedCoordinates.Results[0].Vulnerabilities=[{Severity:'CRITICAL',VulnerabilityID:'unexpected private payload'}];assert.throws(()=>imageEvidence(malformedCoordinates,context),/COORDINATES_INVALID/)
 assert.throws(()=>imageEvidence(clean(),{...context,requested_image:'https://user:private-canary@example.invalid/image'}),/REFERENCE_INVALID/)
 const emailPackage=clean();emailPackage.Results[0].Vulnerabilities=[{Severity:'HIGH',VulnerabilityID:'CVE-2026-12345',PkgName:'private@example.invalid',InstalledVersion:'1.0'}];assert.throws(()=>imageEvidence(emailPackage,context),/COORDINATES_INVALID/)
})
