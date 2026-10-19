$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
Set-Location $root
if(Test-Path work/w2x-portability-parent-read-close-requested.json){throw 'CLOSE_ALREADY_REQUESTED'}
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not(Test-Path work/w2x-portability-parent-read-browser-exit.txt)){if($watch.Elapsed.TotalMinutes -gt 45){throw 'NO_TERMINAL36'};Start-Sleep -Seconds 5}
@{state='PREFLIGHT36';utc=(Get-Date).ToUniversalTime().ToString('o')}|ConvertTo-Json|Set-Content work/w2x-portability-parent-read-close-requested.json
python work/checkpoint-w2x-portability-parent-read.py preflight
if($LASTEXITCODE){throw 'CONTROL_OR_SOURCE_FAILURE_PRESERVED_NO_COMMIT'}
node work/crm-w2x-document-upload-uncertain/scripts/product/build-release-queue.mjs --check *> work/w2x-portability-parent-read-queue.txt
if($LASTEXITCODE){throw 'QUEUE_FAILED'}
if(git -C $repo ls-remote --heads origin refs/heads/codex/w2x-portability-parent-read-lifetime-20261015){throw 'REMOTE_EXISTS'}
git -C $repo add -- src/features/portabilities/Portabilities.tsx tests/e2e-preview/portability-parent-read-lifetime.spec.ts docs/master/W2X_PORTABILITY_PARENT_READ_LIFETIME_20261015.md
git -C $repo commit -m 'fix(portabilities): retire initial relation reads with selection'
if($LASTEXITCODE){throw 'COMMIT_FAILED'}
$sha=(git -C $repo rev-parse HEAD).Trim();$tree=(git -C $repo rev-parse 'HEAD^{tree}').Trim()
@{sha=$sha;tree=$tree;publication='LOCAL_COMMIT_PUSH_PENDING';handoffs=@()}|ConvertTo-Json -Depth 6|Set-Content work/w2x-portability-parent-read-publication.json
git -C $repo push origin HEAD:refs/heads/codex/w2x-portability-parent-read-lifetime-20261015
if($LASTEXITCODE){throw 'PUSH_UNCERTAIN_INSPECT'}
$bundle=Join-Path $PSScriptRoot 'w2x-portability-parent-read.bundle'
git -C $repo bundle create $bundle HEAD
if($LASTEXITCODE){throw 'BUNDLE_FAILED'}
git -C $repo bundle verify $bundle
if($LASTEXITCODE){throw 'BUNDLE_VERIFY_FAILED'}
. ./work/CrmGitHub.ps1
$body='HANDOFF W2-X Portabilidades fuente'+$sha+' / arbol'+$tree+', CLAIM6200377934, rama codex/w2x-portability-parent-read-lifetime-20261015. Padre fuente15 publicada6b4692df7ccc47cf9814beecc09d69c41d333256 por avance directo preservando candidatos. Original portability.getA pendiente/abrirB/liberarA inicia line.listA y clienteA:1FAIL esperado0/observado1 y1positivoPASS52.8s, preservados. Read privado de carga inicial recibe vigencia y la comprueba antes de relaciones y al devolver; readLineContext compartido intacto.36/36 propias PASS:15 nuevas referencia/empresa/actor/lector/vigente por390/768/1440 y21 regresiones servicio/scope. Deltas reales cuando nuevo contexto conservaIDs, sin ceros totales inventados. Build66/lint0errores3warnings visibles/scan/cola342_16PARTIAL_326sinreconciliar_0READY y bundle. VISUAL NOT_REVIEWED hasta inspeccion real. No comandos emitidos; HTTP controlado, AuthDB/Storage/modeloNOT_RUN/API0. No acredita fases internas del helper ni postcomando. Global981 pertenece solo a fuente6b469 y no se hereda a esteSHA. HIGH5/W4/ACK principal pendientes;IAwritesOFF/issue10OPEN/releaseNOT_ACCEPTED. Fuentes38/142/153/main/W3/W4/W5/recurso intactos. Siguiente revision visual y otra unidad comercial independiente autorizada conCLAIM.'

$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$sha;tree=$tree;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 6|Set-Content work/w2x-portability-parent-read-publication.json}
@{sha=$sha;tree=$tree;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 6|Set-Content work/w2x-portability-parent-read-publication.json
python work/checkpoint-w2x-portability-parent-read.py published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
