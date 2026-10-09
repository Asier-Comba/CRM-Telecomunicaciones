const digest = /^sha256:[a-f0-9]{64}$/
const advisory = /^[A-Za-z0-9_-]{1,150}$/
const packageName = /^(?:@[A-Za-z0-9_.-]+\/)?[A-Za-z0-9_./:+~-]{1,220}$/
const version = /^[A-Za-z0-9_./:+~<>=, -]{1,250}$/
export function imageEvidence(data, {source_sha, target, requested_image, inspected_image_id, expected_image_id}) {
  if (!/^[a-f0-9]{40}$/.test(source_sha ?? '') || !['app','n8n','postgres'].includes(target) || !digest.test(inspected_image_id ?? '')) throw new Error('IMAGE_IDENTITY_INVALID')
  if (target === 'app' ? requested_image !== 'crm-w5-package:test' : !/^docker\.io\/[A-Za-z0-9/._-]+:[A-Za-z0-9._-]+@sha256:[a-f0-9]{64}$/.test(requested_image ?? '')) throw new Error('IMAGE_REFERENCE_INVALID')
  if (target !== 'app' && !digest.test(expected_image_id ?? '')) throw new Error('PINNED_CONFIG_REQUIRED')
  if (expected_image_id && inspected_image_id !== expected_image_id) throw new Error('PINNED_CONFIG_DIGEST_MISMATCH')
  if (data?.Metadata?.ImageID !== inspected_image_id) throw new Error('SCANNED_IMAGE_ID_MISMATCH')
  if (!Array.isArray(data.Results) || !data.Results.length) throw new Error('IMAGE_SCAN_NO_RESULTS')
  const vulnerabilities = [], secretCounts = []
  for (const result of data.Results) {
    if (!result || !['os-pkgs','lang-pkgs','secret','config'].includes(result.Class)) throw new Error('IMAGE_SCAN_RESULTS_INVALID')
    if (result.Vulnerabilities !== undefined && !Array.isArray(result.Vulnerabilities) || result.Secrets !== undefined && !Array.isArray(result.Secrets)) throw new Error('IMAGE_SCAN_RESULTS_INVALID')
    secretCounts.push(result.Secrets?.length ?? 0)
    for (const v of result.Vulnerabilities ?? []) {
      if (!['HIGH','CRITICAL'].includes(v.Severity)) continue
      if (typeof v.VulnerabilityID !== 'string' || !advisory.test(v.VulnerabilityID) || typeof v.PkgName !== 'string' || !packageName.test(v.PkgName) || typeof v.InstalledVersion !== 'string' || !version.test(v.InstalledVersion) || v.FixedVersion && (typeof v.FixedVersion !== 'string' || !version.test(v.FixedVersion))) throw new Error('VULNERABILITY_COORDINATES_INVALID')
      vulnerabilities.push({id:v.VulnerabilityID,package:v.PkgName,installed:v.InstalledVersion,fixed:v.FixedVersion || null,severity:v.Severity})
    }
  }
  const secret_findings = secretCounts.reduce((a,b) => a+b, 0)
  return {result:vulnerabilities.length || secret_findings ? 'FAIL' : 'PASS',scanner:'trivy-0.75.0',source_sha,target,requested_image,image:inspected_image_id,high_critical:vulnerabilities,secret_findings,raw_results_retained:false,company_runtime_accepted:false}
}
