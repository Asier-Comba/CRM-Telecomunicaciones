$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$repo=Join-Path $PSScriptRoot 'crm-w2x-commercial-composition'
Set-Location $root
if(Test-Path work/w2x-portability-command-read-close-requested.json){throw 'CLOSE_ALREADY_REQUESTED'}
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not(Test-Path work/w2x-portability-command-read-browser-exit.txt)){if($watch.Elapsed.TotalMinutes -gt 45){throw 'NO_TERMINAL105'};Start-Sleep -Seconds 5}
@{state='PREFLIGHT105'}|ConvertTo-Json|Set-Content work/w2x-portability-command-read-close-requested.json
python work/checkpoint-w2x-portability-command-read.py preflight
if($LASTEXITCODE){throw 'CONTROL_OR_SOURCE_FAILURE_PRESERVED_NO_COMMIT'}
node work/crm-w2x-commercial-composition/scripts/product/build-release-queue.mjs --check *> work/w2x-portability-command-read-queue.txt
if($LASTEXITCODE){throw 'QUEUE_FAILED'}
$cp=Get-Content work/w2x-portability-command-read-checkpoint.json -Raw|ConvertFrom-Json
$branch=$cp.branch
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints | ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'fix(portabilities): retire draft refresh with selected context'
if($LASTEXITCODE){throw 'COMMIT_FAILED'}
$sha=(git -C $repo rev-parse HEAD).Trim();$tree=(git -C $repo rev-parse 'HEAD^{tree}').Trim()
@{sha=$sha;tree=$tree;publication='LOCAL_COMMIT_PUSH_PENDING';handoffs=@()}|ConvertTo-Json -Depth 6|Set-Content work/w2x-portability-command-read-publication.json
git -C $repo push origin ('HEAD:refs/heads/'+$branch)
if($LASTEXITCODE){throw 'PUSH_UNCERTAIN_INSPECT'}
$bundle=Join-Path $PSScriptRoot 'w2x-portability-command-read.bundle'
git -C $repo bundle create $bundle HEAD
if($LASTEXITCODE){throw 'BUNDLE_FAILED'}
git -C $repo bundle verify $bundle
if($LASTEXITCODE){throw 'BUNDLE_VERIFY_FAILED'}
. ./work/CrmGitHub.ps1
$body='HANDOFF W2-X portabilidad refresco borrador fuente '+$sha+' / arbol '+$tree+', CLAIM6203275119, rama '+$branch+', padre3712b2f SIM114final/metadata19PARTIAL. Original4:2FAIL referencia1440(dos fases) y2vigentesPASS34.4s,delta0/1:comando pendiente inicia portability.get retirado;refresco pendiente inicia line.list retirado. Recibo cerrado version2/draft/manual/line_effectnull, linea1;no incremento ni efecto SQL atribuido. Refresco comprueba vigencia antes de primaria,reutiliza guardas entreprimaria/relaciones y protege setCore.105/105 propias PASS:30 dosfases/cinco contextos390/768/1440 +75 regresiones alta/borrador/relaciones/scope/servicio. Vigente muestra operador8/fecha15 desde nueva lectura,cuerpoCAS exacto y una operacion. Build66/lint0errores3warnings visibles/scan/cola342_19PARTIAL_323sinreconciliar_0READY y bundle. VISUAL parcial:seis capturas dosfases390/768/1440 realmente vistas;operador alternativo/fecha actualizados,lado ligado fijo,explicacion y accion legibles;cabecera movil arriba y seguimiento inferior fuera de viewport,no modulo completo. AuthDB/Storage/modeloNOT_RUN/API0. No cambia consulta inicial/sharedhelper/contratos/SQL/permisos/W3/W4/W5/recurso ni fuentes38/142/153/main. Global1065ff5e5a7 independiente,no heredado;original9816b469FAIL979+2complementarios/RCA2no cerrado,F736/B9 intactos. HIGH5/W4/ACKprincipal pendientes,IAwritesOFF/issue10OPEN/releaseNOT_ACCEPTED. Siguiente defecto comercial:validacion de linea al volverAtras seleccionarB en asignacionSIM,solo con nuevoCLAIM/reproduccion;revisionindividualTEL024 basada en75/capturasff5e5a7 pendiente sin promocion masiva.'

$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$sha;tree=$tree;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 6|Set-Content work/w2x-portability-command-read-publication.json}
@{sha=$sha;tree=$tree;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 6|Set-Content work/w2x-portability-command-read-publication.json
python work/checkpoint-w2x-portability-command-read.py published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
