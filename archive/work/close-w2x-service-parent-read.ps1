$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$repo=Join-Path $PSScriptRoot 'crm-w2x-commercial-composition'
Set-Location $root
if(Test-Path work/w2x-service-parent-read-close-requested.json){throw 'CLOSE_ALREADY_REQUESTED'}
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not(Test-Path work/w2x-service-parent-read-browser-exit.txt)){if($watch.Elapsed.TotalMinutes -gt 45){throw 'NO_TERMINAL21'};Start-Sleep -Seconds 5}
@{state='PREFLIGHT21';utc=(Get-Date).ToUniversalTime().ToString('o')}|ConvertTo-Json|Set-Content work/w2x-service-parent-read-close-requested.json
python work/checkpoint-w2x-service-parent-read.py preflight
if($LASTEXITCODE){throw 'CONTROL_OR_SOURCE_FAILURE_PRESERVED_NO_COMMIT'}
node work/crm-w2x-commercial-composition/scripts/product/build-release-queue.mjs --check *> work/w2x-service-parent-read-queue.txt
if($LASTEXITCODE){throw 'QUEUE_FAILED'}
if(git -C $repo ls-remote --heads origin refs/heads/codex/w2x-service-parent-read-lifetime-20261015){throw 'REMOTE_EXISTS'}
git -C $repo add -- src/features/services/ServiceDetail.tsx tests/e2e-preview/service-parent-read-lifetime.spec.ts docs/master/W2X_SERVICE_PARENT_READ_LIFETIME_20261015.md
git -C $repo commit -m 'fix(services): stop initial ancestry reads after context retirement'
if($LASTEXITCODE){throw 'COMMIT_FAILED'}
$sha=(git -C $repo rev-parse HEAD).Trim();$tree=(git -C $repo rev-parse 'HEAD^{tree}').Trim()
@{sha=$sha;tree=$tree;publication='LOCAL_COMMIT_PUSH_PENDING';handoffs=@()}|ConvertTo-Json -Depth 6|Set-Content work/w2x-service-parent-read-publication.json
git -C $repo push origin HEAD:refs/heads/codex/w2x-service-parent-read-lifetime-20261015
if($LASTEXITCODE){throw 'PUSH_UNCERTAIN_INSPECT'}
$bundle=Join-Path $PSScriptRoot 'w2x-service-parent-read.bundle'
git -C $repo bundle create $bundle HEAD
if($LASTEXITCODE){throw 'BUNDLE_FAILED'}
git -C $repo bundle verify $bundle
if($LASTEXITCODE){throw 'BUNDLE_VERIFY_FAILED'}
. ./work/CrmGitHub.ps1
$body='HANDOFF W2-X Servicio fuente'+$sha+' / arbol'+$tree+', CLAIM6200094084, rama codex/w2x-service-parent-read-lifetime-20261015. Avance directo sobre fuente14 publicada, padre exacto en checkpoint. Causal original: servicioA pendiente, abrirB, liberarA inicia contratoA y clienteA pese a retirada.1FAIL contrato0/1 y1positivo vigentePASS52.3s, logs conservados. Carga inicial ahora comprueba active antes de dependencias.21/21 propias PASS:15 nuevas referencia/empresa/actor/lector/vigente por390/768/1440 y6 regresiones previas scope comercial. Deltas medidos sobre lecturas del nuevo componente cuando IDs coinciden, sin fabricar ceros totales. No comandos simulados emitidos. Build66/lint0errores3warnings visibles/cola342_16PARTIAL_326sinreconciliar_0READY/scanPASS; bundle integro. VISUAL NOT_REVIEWED hasta inspeccion real. HTTP controlado, AuthDB/Storage/modeloNOT_RUN/API0. Read callback postcomando NO aceptado por esta unidad, requiere escenario separado. No hereda102/244; siguiente un solo control global nuevo981 sobre ultima composicion. HIGH5/W4/ACK principal pendientes; IA writesOFF/issue10OPEN/releaseNOT_ACCEPTED. Ramas38/142/153/W3/W4/W5 y recurso intactos.'

$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$sha;tree=$tree;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 6|Set-Content work/w2x-service-parent-read-publication.json}
@{sha=$sha;tree=$tree;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 6|Set-Content work/w2x-service-parent-read-publication.json
python work/checkpoint-w2x-service-parent-read.py published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
