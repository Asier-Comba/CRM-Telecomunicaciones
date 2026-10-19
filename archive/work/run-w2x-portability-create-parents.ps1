$ErrorActionPreference='Stop'
Set-Location $PSScriptRoot
$p='w2x-portability-create-parents'
if(Test-Path ($p+'-controls-requested.json')){throw 'ALREADY_REQUESTED'}
if((Get-Content ($p+'-collection.txt') -Tail 1) -ne 'Total: 114 tests in 4 files'){throw 'COLLECTION_MISMATCH'}
@{state='REQUESTED_ONCE';tests=114;files=4;workers=1;retries=0}|ConvertTo-Json|Set-Content ($p+'-controls-requested.json')
Push-Location crm-w2x-document-upload-uncertain
$ErrorActionPreference='Continue'
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-portability-create-parents-final.config.cjs *> ('../'+$p+'-browser.txt');$e=$LASTEXITCODE;$e|Set-Content ('../'+$p+'-browser-exit.txt')
if($e){Pop-Location;exit $e}
npm run lint *> ('../'+$p+'-lint.txt');$e=$LASTEXITCODE;$e|Set-Content ('../'+$p+'-lint-exit.txt')
if($e){Pop-Location;exit $e}
npm run build *> ('../'+$p+'-build.txt');$e=$LASTEXITCODE;$e|Set-Content ('../'+$p+'-build-exit.txt')
Pop-Location
exit $e
