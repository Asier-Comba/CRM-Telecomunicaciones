$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
Set-Location $root
if(Test-Path work/w2x-opportunity-command-read-controls-requested.json){throw 'CONTROLS_ALREADY_REQUESTED'}
@{state='WAITING_SOURCE13';utc=(Get-Date).ToUniversalTime().ToString('o')}|ConvertTo-Json|Set-Content work/w2x-opportunity-command-read-controls-requested.json
$watch=[Diagnostics.Stopwatch]::StartNew()
do{
 $p=Get-Content work/w2x-portfolio-command-read-checkpoint.json -Raw|ConvertFrom-Json
 if($p.published -and $p.publication -eq 'PUBLISHED'){break}
 if($watch.Elapsed.TotalMinutes -gt 35){throw 'NO_PUBLISHED13_NO_CONTROLS'}
 Start-Sleep -Seconds 5
}while($true)
if((git -C $repo branch --show-current) -ne 'codex/w2x-opportunity-command-read-lifetime-20261015'){throw 'BRANCH_CHANGED'}
$before=git -C $repo rev-parse HEAD
if($before -ne '2468b2d376d8d1de5a1303e175de4833b312467d'){throw 'BASE_CHANGED'}
$remote=git -C $repo ls-remote --heads origin refs/heads/codex/w2x-portfolio-command-read-lifetime-20261015
if($LASTEXITCODE -or -not $remote.StartsWith($p.sha)){throw 'PUBLISHED13_REMOTE_MISMATCH'}
git -C $repo merge --ff-only $p.sha
if($LASTEXITCODE){throw 'FF_COMPOSITION_FAILED'}
python work/checkpoint-w2x-opportunity-composition.py
if($LASTEXITCODE){throw 'COMPOSITION_GUARD_FAILED'}
Set-Location $repo
npx playwright test --config ../playwright-w2x-opportunity-command-read-final.config.cjs --list *> ../w2x-opportunity-command-read-collection.txt
if($LASTEXITCODE -or (Get-Content ../w2x-opportunity-command-read-collection.txt -Tail 1) -ne 'Total: 102 tests in 7 files'){throw 'COLLECTION_NOT102'}
npm run lint *> ../w2x-opportunity-command-read-lint.txt
Set-Content ../w2x-opportunity-command-read-lint-exit.txt $LASTEXITCODE
npm run build *> ../w2x-opportunity-command-read-build.txt
Set-Content ../w2x-opportunity-command-read-build-exit.txt $LASTEXITCODE
npx playwright test --config ../playwright-w2x-opportunity-command-read-final.config.cjs *> ../w2x-opportunity-command-read-browser.txt
Set-Content ../w2x-opportunity-command-read-browser-exit.txt $LASTEXITCODE
Get-Content ../w2x-opportunity-command-read-browser.txt -Tail 12
