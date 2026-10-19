$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$repo=Join-Path $PSScriptRoot 'crm-w2x-commercial-composition'
Set-Location $root
if(Test-Path work/w2x-portability-create-direction-close-requested.json){throw 'CLOSE_ALREADY_REQUESTED'}
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not(Test-Path work/w2x-portability-create-direction-browser-exit.txt)){if($watch.Elapsed.TotalMinutes -gt 45){throw 'NO_TERMINAL45'};Start-Sleep -Seconds 5}
@{state='PREFLIGHT45'}|ConvertTo-Json|Set-Content work/w2x-portability-create-direction-close-requested.json
python work/checkpoint-w2x-portability-create-direction.py preflight
if($LASTEXITCODE){throw 'CONTROL_OR_SOURCE_FAILURE_PRESERVED_NO_COMMIT'}
node work/crm-w2x-commercial-composition/scripts/product/build-release-queue.mjs --check *> work/w2x-portability-create-direction-queue.txt
if($LASTEXITCODE){throw 'QUEUE_FAILED'}
$cp=Get-Content work/w2x-portability-create-direction-checkpoint.json -Raw|ConvertFrom-Json
$branch=$cp.branch
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints | ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'fix(portabilities): bind creation operator to linked line direction'
if($LASTEXITCODE){throw 'COMMIT_FAILED'}
$sha=(git -C $repo rev-parse HEAD).Trim();$tree=(git -C $repo rev-parse 'HEAD^{tree}').Trim()
@{sha=$sha;tree=$tree;publication='LOCAL_COMMIT_PUSH_PENDING';handoffs=@()}|ConvertTo-Json -Depth 6|Set-Content work/w2x-portability-create-direction-publication.json
git -C $repo push origin ('HEAD:refs/heads/'+$branch)
if($LASTEXITCODE){throw 'PUSH_UNCERTAIN_INSPECT'}
$bundle=Join-Path $PSScriptRoot 'w2x-portability-create-direction.bundle'
git -C $repo bundle create $bundle HEAD
if($LASTEXITCODE){throw 'BUNDLE_FAILED'}
git -C $repo bundle verify $bundle
if($LASTEXITCODE){throw 'BUNDLE_VERIFY_FAILED'}
. ./work/CrmGitHub.ps1
$body='HANDOFF W2-X alta portabilidad fuente '+$sha+' / arbol '+$tree+', CLAIM6202876422, rama '+$branch+', baseeb3bc5d9 metadata18PARTIAL. Regla SQL existente: entrada conserva destino de linea; salida conserva origen. Seis originales FAIL390/768/1440 entrada/salida:selector ligado habilitado, contexto parseado valido, antes de comando; preservados. Preflight inicial sin tests por directorio heredado equivocado separado, sin producto. Alta fija solo lado vinculado con explicacion visible y elegibilidad valida operador contra contexto; lado alternativo editable. Fixture comercial existente, inventario optativo, sin nuevo servicio.45/45 propias PASS:6 altas por direccion/ancho con vacio/igual bloqueados, linea/numero enmascarado, cuerpo exacto donor/target/line/number/direction/date/owner y403 controlado cancelable +39 regresiones actuales de borrador/relaciones/scope. Build66/lint0errores3warnings visibles/scan/cola342_18PARTIAL_324sinreconciliar_0READY y bundle. VISUAL NOT_REVIEWED hasta inspeccion real. AuthDB/Storage/modeloNOT_RUN/API0; no acredita persistencia ni operador externo. No cambia SQL/permisos/contratos/dispatcher/helper. Global999d889 PASS16.3min publicado independiente, no heredado; original9816b469FAIL979+2complementarios/RCA2no cerrado intacto. HIGH5/W4/ACK principal pendientes,IAwritesOFF/issue10OPEN/releaseNOT_ACCEPTED;fuentes38/142/153/main/W3/W4/W5/recurso intactos. Siguiente revision visual y unidad comercial independiente con CLAIM.'

$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$sha;tree=$tree;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 6|Set-Content work/w2x-portability-create-direction-publication.json}
@{sha=$sha;tree=$tree;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 6|Set-Content work/w2x-portability-create-direction-publication.json
python work/checkpoint-w2x-portability-create-direction.py published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
