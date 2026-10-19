$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
Set-Location $root
if(Test-Path work/w2x-portability-parent-read-controls-requested.json){throw 'CONTROLS_ALREADY_REQUESTED'}
@{state='WAITING_SOURCE15';utc=(Get-Date).ToUniversalTime().ToString('o')}|ConvertTo-Json|Set-Content work/w2x-portability-parent-read-controls-requested.json
$watch=[Diagnostics.Stopwatch]::StartNew()
do{
 $p=Get-Content work/w2x-service-parent-read-checkpoint.json -Raw|ConvertFrom-Json
 if($p.published -and $p.publication -eq 'PUBLISHED'){break}
 if($watch.Elapsed.TotalMinutes -gt 35){throw 'NO_PUBLISHED15_NO_CONTROLS'}
 Start-Sleep -Seconds 5
}while($true)
if((git -C $repo branch --show-current) -ne 'codex/w2x-portability-parent-read-lifetime-20261015'){throw 'BRANCH_CHANGED'}
$before=git -C $repo rev-parse HEAD
if($before -ne 'a4ef01b90025614ff5e42cff10225e9b5bc11e1f'){throw 'BASE_CHANGED'}
$remote=git -C $repo ls-remote --heads origin refs/heads/codex/w2x-service-parent-read-lifetime-20261015
if($LASTEXITCODE -or -not $remote.StartsWith($p.sha)){throw 'PUBLISHED15_REMOTE_MISMATCH'}
git -C $repo merge --ff-only $p.sha
if($LASTEXITCODE){throw 'FF_COMPOSITION_FAILED'}
python work/checkpoint-w2x-portability-composition.py
if($LASTEXITCODE){throw 'COMPOSITION_GUARD_FAILED'}
Set-Location $repo
$ErrorActionPreference='Continue'
npx playwright test --config ../playwright-w2x-portability-parent-read-final.config.cjs --list *> ../w2x-portability-parent-read-collection.txt
if($LASTEXITCODE -or (Get-Content ../w2x-portability-parent-read-collection.txt -Tail 1) -ne 'Total: 36 tests in 3 files'){throw 'COLLECTION_NOT36'}
npm run lint *> ../w2x-portability-parent-read-lint.txt
Set-Content ../w2x-portability-parent-read-lint-exit.txt $LASTEXITCODE
npm run build *> ../w2x-portability-parent-read-build.txt
Set-Content ../w2x-portability-parent-read-build-exit.txt $LASTEXITCODE
npx playwright test --config ../playwright-w2x-portability-parent-read-final.config.cjs *> ../w2x-portability-parent-read-browser.txt
Set-Content ../w2x-portability-parent-read-browser-exit.txt $LASTEXITCODE
Get-Content ../w2x-portability-parent-read-browser.txt -Tail 12
