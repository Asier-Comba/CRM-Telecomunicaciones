$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$repo=Join-Path $PSScriptRoot 'crm-w2x-commercial-composition'
Set-Location $root
if(Test-Path work/w2x-editor-pending-aware-requested.json){throw 'ALREADY_REQUESTED'}
@{state='WAITING_FIRST205_TERMINAL';expected=214;utc=(Get-Date).ToUniversalTime().ToString('o')}|ConvertTo-Json|Set-Content work/w2x-editor-pending-aware-requested.json
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not (Test-Path work/w2x-portfolio-editor-invalid-browser-exit.txt)){if($watch.Elapsed.TotalMinutes -gt 30){throw 'FIRST205_NO_TERMINAL_MARKER'};Start-Sleep -Seconds 5}
if((git -C $repo rev-parse HEAD) -ne '9956bd10cde0e6d2ff09a3a9f6e6f15a67ce2b56' -or (git -C $repo branch --show-current) -ne 'codex/w2x-portfolio-editor-invalid-receipt-20261015'){throw 'SOURCE_BRANCH_CHANGED'}
python work/apply-w2x-editor-pending-aware-fix.py
if($LASTEXITCODE){throw 'GUARDED_FIX_FAILED'}
Set-Location $repo
npx playwright test --config ../playwright-w2x-editor-pending-aware-final.config.cjs --list *> ../w2x-editor-pending-aware-collection.txt
if($LASTEXITCODE -or (Get-Content ../w2x-editor-pending-aware-collection.txt -Tail 1) -ne 'Total: 214 tests in 8 files'){throw 'COLLECTION_NOT214'}
npm run lint *> ../w2x-editor-pending-aware-lint.txt
$lint=$LASTEXITCODE
Set-Content ../w2x-editor-pending-aware-lint-exit.txt $lint
npm run build *> ../w2x-editor-pending-aware-build.txt
$build=$LASTEXITCODE
Set-Content ../w2x-editor-pending-aware-build-exit.txt $build
npx playwright test --config ../playwright-w2x-editor-pending-aware-final.config.cjs *> ../w2x-editor-pending-aware-browser.txt
$browser=$LASTEXITCODE
Set-Content ../w2x-editor-pending-aware-browser-exit.txt $browser
Get-Content ../w2x-editor-pending-aware-browser.txt -Tail 12
if($lint -ne 0 -or $build -ne 0 -or $browser -ne 0){throw 'PENDING_AWARE_CONTROL_FAILURE_PRESERVED'}
