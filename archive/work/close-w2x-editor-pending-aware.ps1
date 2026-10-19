$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$repo=Join-Path $PSScriptRoot 'crm-w2x-commercial-composition'
Set-Location $root
if(Test-Path work/w2x-editor-pending-aware-close-requested.json){throw 'CLOSE_ALREADY_REQUESTED'}
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not(Test-Path work/w2x-editor-pending-aware-browser-exit.txt)){if($watch.Elapsed.TotalMinutes -gt 90){throw 'NO_TERMINAL214_MARKER'};Start-Sleep -Seconds 5}
@{utc=(Get-Date).ToUniversalTime().ToString('o');state='CHECKING_ALL214_CONTROLS'}|ConvertTo-Json|Set-Content work/w2x-editor-pending-aware-close-requested.json
python work/checkpoint-w2x-editor-pending-aware.py preflight
if($LASTEXITCODE){throw 'CONTROLS_OR_SOURCE_FAILED_PRESERVED_NO_COMMIT'}
$active=(Get-Content work/w2x-current-execution-unit.json -Raw|ConvertFrom-Json).active_commercial_unit
if($active.claim -ne 6188888730){throw 'ACTIVE_OWNER_CHANGED_NO_COMMIT'}
$remote=git -C $repo ls-remote --heads origin refs/heads/codex/w2x-portfolio-editor-invalid-receipt-20261015
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_BRANCH_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- src/features/portfolio/IntegratedPortfolio.tsx tests/e2e-preview/portfolio-editor-invalid-identity.spec.ts docs/master/W2X_PORTFOLIO_EDITOR_INVALID_RECEIPT_20261015.md
git -C $repo commit -m 'fix(portfolio): bind uncertain editor recovery to pending writes'
if($LASTEXITCODE){throw 'COMMIT_FAILED'}
$sha=git -C $repo rev-parse HEAD
@{sha=$sha;publication='LOCAL_COMMIT_PUSH_PENDING';handoffs=@()}|ConvertTo-Json -Depth 8|Set-Content work/w2x-editor-pending-aware-close-result.json
git -C $repo push origin HEAD:refs/heads/codex/w2x-portfolio-editor-invalid-receipt-20261015
if($LASTEXITCODE){throw 'PUSH_UNCERTAIN_INSPECT_BEFORE_RETRY'}
$bundle=Join-Path $PSScriptRoot 'w2x-editor-pending-aware-published.bundle'
git -C $repo bundle create $bundle HEAD
if($LASTEXITCODE){throw 'BUNDLE_FAILED'}
git -C $repo bundle verify $bundle
if($LASTEXITCODE){throw 'BUNDLE_VERIFY_FAILED'}
. ./work/CrmGitHub.ps1
$cp=Get-Content work/w2x-portfolio-editor-invalid-receipt-checkpoint.json -Raw|ConvertFrom-Json
$body='HANDOFF W2-X fuente funcional publicada'+$sha+', codex/w2x-portfolio-editor-invalid-receipt-20261015, CLAIM6188888730, base9956. Tres causales originales:activar contrato/nombre/responsable cambian command_id tras recibo inválido. PortfolioEditor conserva intención/operación/cuerpo/expected_version en los tres caminos. Regresión del primer205 conservada:una lectura auxiliar fallida se clasificó como escritura incierta sin pending. Ahora la incertidumbre se establece solo al fallar un intento realmente pendiente y se limpia al validar recibo.214/214 propias PASS, build66/lint/scanPASS;36 nuevas(27 de tres caminos por inválido/perdido/403 y tres anchos+9 lecturas auxiliares sin escritura) y178 regresiones actuales. Cierre permitido sin escritura pendiente; fecha válida no desbloquea activación sin contrato verificado. Primer205:PASS'+$cp.first205.passed+'/FAIL'+$cp.first205.failed+' preservados, no heredados. VISUAL NOT_REVIEWED:requiere inspección real antes de cerrar unidad;no aceptación automática. Auth/DB/Storage/modeloNOT_RUN/API0;efectos simulados. HIGH5/W4/ACK principal pendientes, IA writesOFF/issue10OPEN/releaseNOT_ACCEPTED. Fuente/bundle/checkpoint recuperables;fuentes38/142/153/W3/W4/W5 y recurso intactos.876 de9956 conserva su fuente/control propio. Siguiente:inspeccionar capturas actuales214;sin repetir verdes ni promover matriz.'
$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=[pscustomobject]@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$sha;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content work/w2x-editor-pending-aware-close-result.json}
@{sha=$sha;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content work/w2x-editor-pending-aware-close-result.json
python work/checkpoint-w2x-editor-pending-aware.py published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
$posts|ConvertTo-Json -Compress
