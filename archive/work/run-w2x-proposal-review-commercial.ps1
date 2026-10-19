$ErrorActionPreference='Stop'
Set-Location $PSScriptRoot
$prefix='w2x-proposal-review-commercial'
if(Test-Path ($prefix+'-controls-requested.json')){throw 'ALREADY_REQUESTED'}
if((Get-Content ($prefix+'-collection.txt') -Tail 1) -ne 'Total: 9 tests in 1 file'){throw 'COLLECTION_MISMATCH'}
@{state='REQUESTED_ONCE';tests=9;files=1;workers=1;retries=0}|ConvertTo-Json|Set-Content ($prefix+'-controls-requested.json')
Push-Location crm-w2x-document-upload-uncertain
$ErrorActionPreference='Continue'
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-proposal-review-commercial.config.cjs *> ('../'+$prefix+'-browser.txt')
$e=$LASTEXITCODE;$e|Set-Content ('../'+$prefix+'-browser-exit.txt')
if($e){Pop-Location;exit $e}
npm run lint *> ('../'+$prefix+'-lint.txt');$e=$LASTEXITCODE;$e|Set-Content ('../'+$prefix+'-lint-exit.txt')
if($e){Pop-Location;exit $e}
npm run build *> ('../'+$prefix+'-build.txt');$e=$LASTEXITCODE;$e|Set-Content ('../'+$prefix+'-build-exit.txt')
Pop-Location
exit $e
