$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-case-recovery-close';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=95897}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not(Test-Path ('work/'+$prefix+'-build-exit.txt'))){if($watch.Elapsed.TotalMinutes -gt 45){throw 'NO_TERMINAL_CONTROLS'};Start-Sleep -Seconds 5}
python ('work/checkpoint-'+$prefix+'.py') preflight
if($LASTEXITCODE){throw 'CONTROLS_OR_FINGERPRINT_FAILURE_PRESERVED'}
node work/crm-w2x-document-upload-uncertain/scripts/product/build-release-queue.mjs --check *> ('work/'+$prefix+'-queue.txt')
if($LASTEXITCODE){throw 'QUEUE_FAILED'}
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'fix(cases): reflect recovery locks in close controls'
if($LASTEXITCODE){throw 'COMMIT_FAILED'}
$sha=(git -C $repo rev-parse HEAD).Trim();$tree=(git -C $repo rev-parse 'HEAD^{tree}').Trim()
$publication=@{sha=$sha;tree=$tree;publication='LOCAL_COMMIT_PUSH_PENDING';handoffs=@()}
$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
git -C $repo push origin ('HEAD:refs/heads/'+$cp.branch)
if($LASTEXITCODE){throw 'PUSH_UNCERTAIN_INSPECT_NO_RETRY'}
$bundle=Join-Path $PSScriptRoot ($prefix+'.bundle');git -C $repo bundle create $bundle HEAD
if($LASTEXITCODE){throw 'BUNDLE_FAILED'}
git -C $repo bundle verify $bundle
if($LASTEXITCODE){throw 'BUNDLE_VERIFY_FAILED'}
. ./work/CrmGitHub.ps1
$nl=[string][char]10+[char]10
$body='HANDOFF W2-X82 — Incidencias, controles de recuperación. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', padre '+$cp.base+'. CLAIM6254086824. Causal3FAIL2PASS48,3s conservado:crear incierto,crear conrecibo/lecturafallida yactualizar incierto muestran cierre/cancel habilitados sin efecto;cancelación previa yactualizaciónconfirmada sonpositivos.'+$nl+'Solo3propiedades existentes:DrawerNuevaIncidencia closeDisabled=busy||frozen||reading ycancelDisabled=frozen enambasconfirmaciones. Sin nuevas primitivas,estados,efectos,callbacks,comandos,contratos,recibos oservicios. Reversión exacta reconstruye padre ybanco finalidénticoacausal. Propios81/81browser2,0min:21directos y60regresiones. AbortHTTP trasunefecto sintético,reintento conmisma operación/command_id/input;recibo+503 sololectura/uncomando. Reviewprevio sincomando y403definitivo permiten cancelar/cerrar,efecto0. NoSQLidempotencia acreditada.'+$nl+'Doce capturas vistas:9críticas recuperación3907681440 y3postacción390. Error/reintento legibles,Cancelar/X deshabilitados;recibo guardado muestraformulariofijo yrelectura. Drawerbajomodal soloDOM;headerresultadoactualizaciónconfirmada fueradeviewport,soloDOM. Imágenes de retornoinventory/partesdeeditor noaceptan módulo completo. Build66/lint/scan/diff/cola/bundle propios;funcionalesNOT_RUN_UI_CONTROL_PROPS_ONLY. HTTP/DTO/efectos sintéticos concomponentes/repositorio/parsersreales;AuthDB/JWT/RLS/SQL/Nextintegrado/modelovivoNOT_RUN/API0.'+$nl+'Matrizmetadata81:342/31PARTIAL/311sinreconciliar/0READY.1887source78activo46411/1908source80waiter56843 sin21casos82;no retarget/cancelar/duplicar/heredar. W178revisión/consumopropietario pendiente. HIGH5/W4 pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. F736/B9/981/1266/fixtures/preparaciónconservados;ramas/fuentesajenas/PR38/142/153/main/W3core/W4/W5/recursointactos. Siguiente:reproducir recuperación/cierreSIM/eSIM conhookW2existente ydenegacióndefinitiva;coalescerregresiónglobalposterior.'

foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}








