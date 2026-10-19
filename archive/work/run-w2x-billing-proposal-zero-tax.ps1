$ErrorActionPreference='Stop'
Set-Location $PSScriptRoot
$p='w2x-billing-proposal-zero-tax'
if(Test-Path ($p+'-controls-requested.json')){throw 'ALREADY_REQUESTED'}
if((Get-Content ($p+'-collection.txt') -Tail 1) -ne 'Total: 144 tests in 3 files'){throw 'COLLECTION_MISMATCH'}
@{state='REQUESTED_ONCE';tests=144;files=3;workers=1;retries=0}|ConvertTo-Json|Set-Content ($p+'-controls-requested.json')
Push-Location crm-w2x-document-upload-uncertain
$ErrorActionPreference='Continue'
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-billing-proposal-zero-tax-final.config.cjs *> ('../'+$p+'-browser.txt');$e=$LASTEXITCODE;$e|Set-Content ('../'+$p+'-browser-exit.txt')
if($e){Pop-Location;exit $e}
node --test tests/bootstrap/product-rebuild.test.mjs tests/bootstrap/billing-current-madrid-day.test.mjs *> ('../'+$p+'-functional.txt');$e=$LASTEXITCODE;$e|Set-Content ('../'+$p+'-functional-exit.txt')
if($e){Pop-Location;exit $e}
npm run lint *> ('../'+$p+'-lint.txt');$e=$LASTEXITCODE;$e|Set-Content ('../'+$p+'-lint-exit.txt')
if($e){Pop-Location;exit $e}
npm run build *> ('../'+$p+'-build.txt');$e=$LASTEXITCODE;$e|Set-Content ('../'+$p+'-build-exit.txt')
Pop-Location
exit $e


