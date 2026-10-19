$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
Set-Location $root
if(Test-Path work/w2x-opportunity-command-read-close-requested.json){throw 'CLOSE_ALREADY_REQUESTED'}
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not(Test-Path work/w2x-opportunity-command-read-browser-exit.txt)){if($watch.Elapsed.TotalMinutes -gt 45){throw 'NO_TERMINAL102'};Start-Sleep -Seconds 5}
@{state='PREFLIGHT102';utc=(Get-Date).ToUniversalTime().ToString('o')}|ConvertTo-Json|Set-Content work/w2x-opportunity-command-read-close-requested.json
python work/checkpoint-w2x-opportunity-command-read.py preflight
if($LASTEXITCODE){throw 'CONTROL_OR_SOURCE_FAILURE_PRESERVED_NO_COMMIT'}
node work/crm-w2x-document-upload-uncertain/scripts/product/build-release-queue.mjs --check *> work/w2x-opportunity-command-read-queue.txt
if($LASTEXITCODE){throw 'QUEUE_FAILED'}
if(git -C $repo ls-remote --heads origin refs/heads/codex/w2x-opportunity-command-read-lifetime-20261015){throw 'REMOTE_EXISTS'}
git -C $repo add -- src/features/opportunities/IntegratedOpportunities.tsx tests/e2e-preview/opportunity-command-read-lifetime.spec.ts docs/master/W2X_OPPORTUNITY_COMMAND_READ_LIFETIME_20261015.md
git -C $repo commit -m 'fix(opportunities): retire post-command reads with scoped view'
if($LASTEXITCODE){throw 'COMMIT_FAILED'}
$sha=(git -C $repo rev-parse HEAD).Trim();$tree=(git -C $repo rev-parse 'HEAD^{tree}').Trim()
@{sha=$sha;tree=$tree;publication='LOCAL_COMMIT_PUSH_PENDING';handoffs=@()}|ConvertTo-Json -Depth 6|Set-Content work/w2x-opportunity-command-read-publication.json
git -C $repo push origin HEAD:refs/heads/codex/w2x-opportunity-command-read-lifetime-20261015
if($LASTEXITCODE){throw 'PUSH_UNCERTAIN_INSPECT'}
$bundle=Join-Path $PSScriptRoot 'w2x-opportunity-command-read.bundle'
git -C $repo bundle create $bundle HEAD
if($LASTEXITCODE){throw 'BUNDLE_FAILED'}
git -C $repo bundle verify $bundle
if($LASTEXITCODE){throw 'BUNDLE_VERIFY_FAILED'}
. ./work/CrmGitHub.ps1
$body='HANDOFF W2-X Oportunidades fuente'+$sha+' / arbol'+$tree+', CLAIM6199848668, rama codex/w2x-opportunity-command-read-lifetime-20261015. Compuesta por avance directo de fuente13 publicada, padre exacto en checkpoint. Dos causales originales: cambio de etapa/guardar editor, recibo tardio tras retirar empresa produce work.get viejo esperado0/observado1. Primer banco3FAIL/1PASS conservado; tercer fallo positivo editor se media antes de cierre UI, refinado solo ese caso1PASS21.6s sin cambiar producto. Ahora scoped view evita lectura y mensajes tras retirada, conserva comandos/recibos/idempotencia/CAS/validacion.102/102 propias PASS:24 nuevas dos flujos por empresa/actor/lector/vigente y390/768/1440 +78 regresiones pipeline/editor. Build66/lint0errores3warnings visibles/cola342_16PARTIAL_326sinreconciliar_0READY/scanPASS. VISUAL NOT_REVIEWED hasta inspeccion real; HTTP controlado, AuthDB/Storage/modeloNOT_RUN/API0. Fuente13_244 y fuente136_214 no se heredan a este SHA. HIGH5/W4/ACK principal pendientes; IA writesOFF/issue10OPEN/releaseNOT_ACCEPTED. Sin cambios38/142/153/W3/W4/W5/recurso. Fuente/bundle/checkpoint recuperables. Siguiente control global nuevo966 de esta composicion, una sola ejecucion, sin publicar encima de checks activos ni cancelar.'

$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$sha;tree=$tree;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 6|Set-Content work/w2x-opportunity-command-read-publication.json}
@{sha=$sha;tree=$tree;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 6|Set-Content work/w2x-opportunity-command-read-publication.json
python work/checkpoint-w2x-opportunity-command-read.py published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
