$ErrorActionPreference='Stop'
Set-Location $PSScriptRoot
$p='w2x-billing-list-filter-response'
if(Test-Path ($p+'-controls-requested.json')){throw 'ALREADY_REQUESTED'}
if((Get-Content ($p+'-collection.txt') -Tail 1) -ne 'Total: 147 tests in 9 files'){throw 'COLLECTION_MISMATCH'}
@{state='REQUESTED_ONCE';tests=147;files=9;workers=1;retries=0}|ConvertTo-Json|Set-Content ($p+'-controls-requested.json')
Push-Location crm-w2x-document-upload-uncertain
$ErrorActionPreference='Continue'
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-billing-list-filter-response-final.config.cjs *> ('../'+$p+'-browser.txt');$e=$LASTEXITCODE;$e|Set-Content ('../'+$p+'-browser-exit.txt')
if($e){Pop-Location;exit $e}
node --test tests/bootstrap/billing-v1.test.mjs tests/bootstrap/billing-pdf-v1.test.mjs tests/bootstrap/billing-artifact-v1.test.mjs tests/bootstrap/currency-separated-billing-analytics.test.mjs tests/bootstrap/billing-current-invoice-step.test.mjs tests/bootstrap/billing-current-madrid-day.test.mjs tests/bootstrap/product-rebuild.test.mjs *> ('../'+$p+'-functional.txt');$e=$LASTEXITCODE;$e|Set-Content ('../'+$p+'-functional-exit.txt')
if($e){Pop-Location;exit $e}
npm run lint *> ('../'+$p+'-lint.txt');$e=$LASTEXITCODE;$e|Set-Content ('../'+$p+'-lint-exit.txt')
if($e){Pop-Location;exit $e}
npm run build *> ('../'+$p+'-build.txt');$e=$LASTEXITCODE;$e|Set-Content ('../'+$p+'-build-exit.txt')
Pop-Location
exit $e


