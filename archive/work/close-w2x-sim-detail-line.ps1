$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-sim-detail-line';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=97315}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(sims): preserve read lifetime through assigned line context'
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
$body='HANDOFF W2-X56 — padres de línea asignada en detalle SIM/eSIM. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', base '+$cp.base+'. CLAIM 6251524669.'+$nl+'Original: 1 FAIL / 1 PASS en 19,3 s. Tras sim.get, el punto de línea retenido iniciaba padres antiguos después de cambiar de recurso. El control vigente pasa. Se entrega isCurrent existente al readLineContext, sin modificar helper, servicio, estado, efecto, comando, recibo ni CAS. Reversión textual del único argumento devuelve el padre; selección de asignación intacta.'+$nl+'Propios120/120 PASS en3,1 min: 30 ventana nueva física/eSIM, 30 frontera inicial y60 postcomando. Build66; lint sin errores y tres warnings conservados; scan/diff/cola/bundle. Recurso/empresa/actor/rol retirados no encadenan dos padres antiguos; positivos vigentes sí consultan ambos. Banco nuevo sin comandos; regresiones con acciones manuales simuladas. No se cancela solicitud ya enviada ni se acredita ausencia SQL, autoridad, permiso real o durabilidad.'+$nl+'Seis capturas realmente vistas: física/eSIM vigentes en390/768/1440, cliente/operador/estado/ICCID-EID enmascarados/fechas/enlace. Sustitución/historial e inferior móvil parciales; otros contextos sin aceptación visual individual. Controles de contexto/navegación/UUID del fixture excluidos. HTTP/DTO controlado con componentes/repositorio/parsers reales; Auth/DB/JWT/RLS/Next integrado/modelo vivo NOT_RUN, API0.'+$nl+'Matriz342/27 PARTIAL/315 sin reconciliar/0 READY; global1479 Agenda separado, sin incluir esta corrección ni heredar PASS. Cinco HIGH/W4 pendientes, IA writes OFF, issue10 OPEN, release NOT_ACCEPTED. F736/B9/981/1266 y fallos de fixture/preparación anteriores preservados. Fuentes ajenas/PR38/142/153/main/W3/W4/W5/recurso intactos. Siguiente: comprobar punto de línea después del recibo válido de creación de portabilidad, manteniendo separadas lectura de interfaz y durabilidad.'
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}
