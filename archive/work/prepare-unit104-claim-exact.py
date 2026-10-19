from pathlib import Path
import re
w=Path('work');s=(w/'claim-unit104.ps1').read_text(encoding='utf-8-sig');body=re.search(r"(?m)^\$body='(.*)'$",s).group(1);(w/'w2x-unit104-claim-exact-body.txt').write_text(body,encoding='utf-8')
s='''$ErrorActionPreference='Stop'
. ./work/CrmGitHub.ps1
$claim=Get-Content work/w2x-domain-operator-label-wrap-claim.json -Raw|ConvertFrom-Json
$body=[IO.File]::ReadAllText((Join-Path (Get-Location) 'work/w2x-unit104-claim-exact-body.txt'),[Text.Encoding]::UTF8)
$c=Invoke-CrmApi ('/issues/comments/'+$claim.claim)
$changed=$false
if($c.body -cne $body){$c=Invoke-CrmApi ('/issues/comments/'+$claim.claim) Patch @{body=$body};$changed=$true}
if($c.body -cne $body){throw 'READBACK_MISMATCH'}
@{claim=$claim.claim;exact_utf8_readback=$true;repaired=$changed}|ConvertTo-Json|Set-Content work/w2x-unit104-claim-encoding-readback.json -Encoding utf8
''';(w/'repair-unit104-claim-exact.ps1').write_text(s,encoding='utf-8-sig')
