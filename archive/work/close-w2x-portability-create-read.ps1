$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$repo=Join-Path $PSScriptRoot 'crm-w2x-commercial-composition'
Set-Location $root
if(Test-Path work/w2x-portability-create-read-close-requested.json){throw 'CLOSE_ALREADY_REQUESTED'}
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not(Test-Path work/w2x-portability-create-read-browser-exit.txt)){if($watch.Elapsed.TotalMinutes -gt 45){throw 'NO_TERMINAL210'};Start-Sleep -Seconds 5}
@{state='PREFLIGHT210'}|ConvertTo-Json|Set-Content work/w2x-portability-create-read-close-requested.json
python work/checkpoint-w2x-portability-create-read.py preflight
if($LASTEXITCODE){throw 'CONTROL_OR_SOURCE_FAILURE_PRESERVED_NO_COMMIT'}
node work/crm-w2x-commercial-composition/scripts/product/build-release-queue.mjs --check *> work/w2x-portability-create-read-queue.txt
if($LASTEXITCODE){throw 'QUEUE_FAILED'}
$cp=Get-Content work/w2x-portability-create-read-checkpoint.json -Raw|ConvertFrom-Json
$branch=$cp.branch
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints | ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'fix(portabilities): retire creation readback and relationships with context'
if($LASTEXITCODE){throw 'COMMIT_FAILED'}
$sha=(git -C $repo rev-parse HEAD).Trim();$tree=(git -C $repo rev-parse 'HEAD^{tree}').Trim()
@{sha=$sha;tree=$tree;publication='LOCAL_COMMIT_PUSH_PENDING';handoffs=@()}|ConvertTo-Json -Depth 6|Set-Content work/w2x-portability-create-read-publication.json
git -C $repo push origin ('HEAD:refs/heads/'+$branch)
if($LASTEXITCODE){throw 'PUSH_UNCERTAIN_INSPECT'}
$bundle=Join-Path $PSScriptRoot 'w2x-portability-create-read.bundle'
git -C $repo bundle create $bundle HEAD
if($LASTEXITCODE){throw 'BUNDLE_FAILED'}
git -C $repo bundle verify $bundle
if($LASTEXITCODE){throw 'BUNDLE_VERIFY_FAILED'}
. ./work/CrmGitHub.ps1
$body='HANDOFF W2-X altaPortabilidad fuente '+$sha+' / arbol '+$tree+', CLAIM6203863765, rama '+$branch+', padre452b920 SIM165 compuesto FF conpinremotoexactoverificado/archivosdisjuntos. Original8:4FAIL referencia1440 entrada/salida×comando/refresco y4vigentesPASS33.9s,delta0/1:comandoiniciaba primariaretirada,primariainiciaba line.list retirado. Recibodraft/manual/line_effectnull ylineaversion1/proyeccionportabiertavalidos,sinefectoSQLinferido. Guardas antesdeprimaria/relaciones/notificar,sinrecrearhelper/useReviewedCommand ni cancelarelcomandoremitido;retiro dentrodehelperya iniciado noacreditado. Primer210preservado192PASS18FAIL7.1min,fixtureesperabavaciotrasalta confirmada/mockdatasetempresarial;no fallo causal del producto. Fixturecorregido empresanueva sinregistro,actor/lectormismoscopepuedenlistaralta;misma produccion/imagen/limites/asercionesretiro.210/210 finales propias PASS completas,sinheredar192:60altaPortpor2sentidos/2fases/5contextos/3anchos +150regresiones,incluyeSIMCreate30 yCaseCreate15. Build66/lint0errores3warnings visibles/scan,5Nodegatespreview propios(no1430backend),cola342_20PARTIAL_322sinreconciliar_0READY ybundle. VISUAL parcial12capturas corregidas realmente vistas:filas/tarjetasdraft/manuales,mascara,operadores/fechayenlace coherentes,sinoperadorexterno. AuthDB/Storage/modeloNOT_RUN/API0. F736/B9/9816bFAIL979+2complementarios/RCA2no cerrado intactos. HIGH5/W4/ACKprincipal pendientes,IAwritesOFF/issue10OPEN/releaseNOT_ACCEPTED;fuentes38/142/153/main/W3/W4/W5/recurso intactos. Siguiente unglobalnuevo de composicion1266medidosantesdedispatch,yTEL033metadataCLAIM6204084835consumeesta fuente solo tras publicacion;no heredar1155.'

$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$sha;tree=$tree;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 6|Set-Content work/w2x-portability-create-read-publication.json}
@{sha=$sha;tree=$tree;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 6|Set-Content work/w2x-portability-create-read-publication.json
python work/checkpoint-w2x-portability-create-read.py published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
