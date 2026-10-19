$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
Set-Location $root
if(Test-Path work/w2x-case-create-read-close-requested.json){throw 'CLOSE_ALREADY_REQUESTED'}
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not(Test-Path work/w2x-case-create-read-browser-exit.txt)){if($watch.Elapsed.TotalMinutes -gt 45){throw 'NO_TERMINAL63'};Start-Sleep -Seconds 5}
@{state='PREFLIGHT63'}|ConvertTo-Json|Set-Content work/w2x-case-create-read-close-requested.json
python work/checkpoint-w2x-case-create-read.py preflight
if($LASTEXITCODE){throw 'CONTROL_OR_SOURCE_FAILURE_PRESERVED_NO_COMMIT'}
node work/crm-w2x-document-upload-uncertain/scripts/product/build-release-queue.mjs --check *> work/w2x-case-create-read-queue.txt
if($LASTEXITCODE){throw 'QUEUE_FAILED'}
$cp=Get-Content work/w2x-case-create-read-checkpoint.json -Raw|ConvertFrom-Json
$branch=$cp.branch
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints | ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'fix(cases): retire creation readback with customer context'
if($LASTEXITCODE){throw 'COMMIT_FAILED'}
$sha=(git -C $repo rev-parse HEAD).Trim();$tree=(git -C $repo rev-parse 'HEAD^{tree}').Trim()
@{sha=$sha;tree=$tree;publication='LOCAL_COMMIT_PUSH_PENDING';handoffs=@()}|ConvertTo-Json -Depth 6|Set-Content work/w2x-case-create-read-publication.json
git -C $repo push origin ('HEAD:refs/heads/'+$branch)
if($LASTEXITCODE){throw 'PUSH_UNCERTAIN_INSPECT'}
$bundle=Join-Path $PSScriptRoot 'w2x-case-create-read.bundle'
git -C $repo bundle create $bundle HEAD
if($LASTEXITCODE){throw 'BUNDLE_FAILED'}
git -C $repo bundle verify $bundle
if($LASTEXITCODE){throw 'BUNDLE_VERIFY_FAILED'}
. ./work/CrmGitHub.ps1
$body='HANDOFF W2-X altaIncidencia fuente '+$sha+' / arbol '+$tree+', CLAIM6203638233, rama '+$branch+', base63f4fd6 metadata20PARTIAL/src_testsd55fc36. Original5:4FAIL referencia/empresa/actor/lector1440 y1vigentePASS47.1s;tras liberar case.create pendiente iniciaba case.get retirado,delta0/1. Recibo/registro cerrados validos,transporte sintetico,no efectoSQL inferido. CaseCreate comprueba vigencia trasrecibo/antesdelectura/despuesdelectura yantesreintento;comandoyaremitido noseconsideracancelado ni revertido,requiereconsultaautorizadaactual.63/63 propias PASS:15 contextos/anchos +48regresiones detalle/refresco/contratos/scope. Vigente uncomando/cuerpoexacto,lecturaconcuerdaconintento,coleccion/enlaceactualizados. Fixturetelecomexistente opt-inkindcase-create,defaultintacto,sinservidor/factorynuevo. Build66/lint0errores3warnings visibles/scan/cola342_20PARTIAL_322sinreconciliar_0READY ybundle. VISUAL parcial3capturas390/768/1440 realmente vistas,alta consumida yfila/tarjetacargada/filtros/paginacion;camposDTOsinteticos noBD. AuthDB/Storage/modeloNOT_RUN/API0. CASE_NOTE_CURSORB9/F736 causasdesconocidas intactas,sinnotas/cursor tocados. No helper/backend/W3/W4/W5/recurso ni fuentes38/142/153/main. Global1155ddcffe7 separado,noheredado,nocierraregresionesnuevas. HIGH5/W4/ACKprincipal pendientes,IAwritesOFF/issue10OPEN/releaseNOT_ACCEPTED. Siguiente reproducir lectura posterior al altaSIM/eSIM tras retirar contexto con nuevoCLAIM;la validacion de titulos ya devuelve validation antes de API y no se relaja.'

$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$sha;tree=$tree;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 6|Set-Content work/w2x-case-create-read-publication.json}
@{sha=$sha;tree=$tree;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 6|Set-Content work/w2x-case-create-read-publication.json
python work/checkpoint-w2x-case-create-read.py published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
