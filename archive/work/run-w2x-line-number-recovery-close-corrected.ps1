$ErrorActionPreference='Stop'
Set-Location $PSScriptRoot
$p='w2x-line-number-recovery-close'
if(Test-Path ($p+'-corrected-controls-requested.json')){throw 'ALREADY_REQUESTED'}
if(-not(Test-Path ('playwright-'+$p+'-corrected.config.cjs'))){throw 'CONFIG_REQUIRED_BEFORE_MARKER'}
if((Get-Content ($p+'-corrected-collection.txt') -Tail 1) -ne 'Total: 189 tests in 8 files'){throw 'COLLECTION_MISMATCH'}
@{state='REQUESTED_ONCE';tests=189;files=8;workers=1;retries=0}|ConvertTo-Json|Set-Content ($p+'-corrected-controls-requested.json')
Push-Location crm-w2x-document-upload-uncertain
$ErrorActionPreference='Continue'
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-line-number-recovery-close-corrected.config.cjs *> ('../'+$p+'-browser-corrected.txt');$e=$LASTEXITCODE;$e|Set-Content ('../'+$p+'-browser-corrected-exit.txt')
if($e){Pop-Location;exit $e}
npm run lint *> ('../'+$p+'-lint-corrected.txt');$e=$LASTEXITCODE;$e|Set-Content ('../'+$p+'-lint-corrected-exit.txt')
if($e){Pop-Location;exit $e}
npm run build *> ('../'+$p+'-build-corrected.txt');$e=$LASTEXITCODE;$e|Set-Content ('../'+$p+'-build-corrected-exit.txt')
Pop-Location
exit $e

