$ErrorActionPreference='Stop'
Set-Location $PSScriptRoot
$p='w2x-billing-loaded-pages'
if(Test-Path ($p+'-corrected-requested.json')){throw 'ALREADY_REQUESTED'}
if(-not(Test-Path ($p+'-fixture-failure.json'))){throw 'ORIGINAL_CAUSE_REQUIRED'}
@{state='ONLY_ORIGINAL18_FAILED_RECHECK_ON_UNCHANGED_PRODUCT';tests=18;workers=1;retries=0}|ConvertTo-Json|Set-Content ($p+'-corrected-requested.json')
Push-Location crm-w2x-document-upload-uncertain
$ErrorActionPreference='Continue'
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-billing-loaded-pages-corrected.config.cjs *> ('../'+$p+'-corrected-browser.txt');$e=$LASTEXITCODE;$e|Set-Content ('../'+$p+'-corrected-browser-exit.txt')
if($e){Pop-Location;exit $e}
npm run lint *> ('../'+$p+'-lint.txt');$e=$LASTEXITCODE;$e|Set-Content ('../'+$p+'-lint-exit.txt')
if($e){Pop-Location;exit $e}
npm run build *> ('../'+$p+'-build.txt');$e=$LASTEXITCODE;$e|Set-Content ('../'+$p+'-build-exit.txt')
Pop-Location
exit $e
