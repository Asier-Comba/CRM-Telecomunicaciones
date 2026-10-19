$ErrorActionPreference='Stop'
Set-Location $PSScriptRoot
$p='w2x-sim-identifier-recovery-close'
if(Test-Path ($p+'-controls-requested.json')){throw 'ALREADY_REQUESTED'}
if(-not(Test-Path ('playwright-'+$p+'-final.config.cjs'))){throw 'CONFIG_REQUIRED_BEFORE_MARKER'}
if((Get-Content ($p+'-collection.txt') -Tail 1) -ne 'Total: 237 tests in 9 files'){throw 'COLLECTION_MISMATCH'}
@{state='REQUESTED_ONCE';tests=237;files=9;workers=1;retries=0}|ConvertTo-Json|Set-Content ($p+'-controls-requested.json')
Push-Location crm-w2x-document-upload-uncertain
$ErrorActionPreference='Continue'
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-sim-identifier-recovery-close-final.config.cjs *> ('../'+$p+'-browser.txt');$e=$LASTEXITCODE;$e|Set-Content ('../'+$p+'-browser-exit.txt')
if($e){Pop-Location;exit $e}
npm run lint *> ('../'+$p+'-lint.txt');$e=$LASTEXITCODE;$e|Set-Content ('../'+$p+'-lint-exit.txt')
if($e){Pop-Location;exit $e}
npm run build *> ('../'+$p+'-build.txt');$e=$LASTEXITCODE;$e|Set-Content ('../'+$p+'-build-exit.txt')
Pop-Location
exit $e

