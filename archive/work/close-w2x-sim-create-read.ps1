$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
Set-Location $root
if(Test-Path work/w2x-sim-create-read-close-requested.json){throw 'CLOSE_ALREADY_REQUESTED'}
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not(Test-Path work/w2x-sim-create-read-browser-exit.txt)){if($watch.Elapsed.TotalMinutes -gt 45){throw 'NO_TERMINAL165'};Start-Sleep -Seconds 5}
@{state='PREFLIGHT165'}|ConvertTo-Json|Set-Content work/w2x-sim-create-read-close-requested.json
python work/checkpoint-w2x-sim-create-read.py preflight
if($LASTEXITCODE){throw 'CONTROL_OR_SOURCE_FAILURE_PRESERVED_NO_COMMIT'}
node work/crm-w2x-document-upload-uncertain/scripts/product/build-release-queue.mjs --check *> work/w2x-sim-create-read-queue.txt
if($LASTEXITCODE){throw 'QUEUE_FAILED'}
$cp=Get-Content work/w2x-sim-create-read-checkpoint.json -Raw|ConvertFrom-Json
$branch=$cp.branch
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints | ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'fix(sims): retire creation readback with customer context'
if($LASTEXITCODE){throw 'COMMIT_FAILED'}
$sha=(git -C $repo rev-parse HEAD).Trim();$tree=(git -C $repo rev-parse 'HEAD^{tree}').Trim()
@{sha=$sha;tree=$tree;publication='LOCAL_COMMIT_PUSH_PENDING';handoffs=@()}|ConvertTo-Json -Depth 6|Set-Content work/w2x-sim-create-read-publication.json
git -C $repo push origin ('HEAD:refs/heads/'+$branch)
if($LASTEXITCODE){throw 'PUSH_UNCERTAIN_INSPECT'}
$bundle=Join-Path $PSScriptRoot 'w2x-sim-create-read.bundle'
git -C $repo bundle create $bundle HEAD
if($LASTEXITCODE){throw 'BUNDLE_FAILED'}
git -C $repo bundle verify $bundle
if($LASTEXITCODE){throw 'BUNDLE_VERIFY_FAILED'}
. ./work/CrmGitHub.ps1
$body='HANDOFF W2-X altaSIM/eSIM fuente '+$sha+' / arbol '+$tree+', CLAIM6203802349, rama '+$branch+', base4c9cd97 altaIncidencia63/metadata20PARTIAL. Original10:8FAIL fisica/eSIM referencia/empresa/actor/lector1440 y2vigentesPASS54.9s;recibo pendiente liberado iniciaba sim.get retirado,delta0/1. Recibo prepared/manual/sinasociacion yregistro exactos,ningunefectoSQL/provisioninferido. SimCreate protege lectura posterior/notificacion convida actual,sin modificaruseReviewedCommandcompartido ni primitivas;comandoremitidonosecancelaniseconsiderarevertido.165/165 propias PASS3.1min:30dostipos/cincocontextos390/768/1440 +135regresionesSIM yCaseCreate actuales. Vigente uncomando/cuerpoexacto,consumerecibo/lectura,muestra preparadayenlace;fixturetelecom opt-insim-create,sinfactorynuevo ni cambiardefault. Build66/lint0errores3warnings visibles/scan/cola342_20PARTIAL_322sinreconciliar_0READY ybundle. VISUAL parcial6capturas realmente vistas,filas/tarjetaspreparadas/manuales ydatosNoRegistrado coherentes,sinidentificadoresraw ni activacionexterna. AuthDB/Storage/modeloNOT_RUN/API0. F736/B9/9816b469FAIL979+2complementarios/RCA2no cerrado intactos. HIGH5/W4/ACKprincipal pendientes,IAwritesOFF/issue10OPEN/releaseNOT_ACCEPTED;fuentes38/142/153/main/W3/W4/W5/recurso intactos. ConsumerpropioCLAIM6203863765 espera estapublicacionen23831 ycompondraantesde210propias;nosehereda165/1155,nipublicaencimadechecksactivos. Un globalnuevo solo despuesdeambasaltas,evitandobancosredundantes.'

$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$sha;tree=$tree;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 6|Set-Content work/w2x-sim-create-read-publication.json}
@{sha=$sha;tree=$tree;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 6|Set-Content work/w2x-sim-create-read-publication.json
python work/checkpoint-w2x-sim-create-read.py published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
