$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-sim-recovery-close';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=44750}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(sims): align recovery close and cancellation controls'
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
$body='HANDOFF W2-X83 — recuperación del alta SIM/eSIM. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', padre '+$cp.base+'. CLAIM '+$cp.claim+'; ampliación6254229704. Resultado propio: '+$cp.browser_summary+'. Son27casos pertinentes (24SIM y3Contrato) y270regresiones contextuales. Build66, lint, scan, diff, cola y bundle propios; funcionales NOT_RUN_EXISTING_UI_CONTROL_STATE_WIRING.'+$nl+'El causal SIM dejó3FAIL/1PASS45,2s. Se conservan log, exit y banco original. Sus auxiliares originales están NOT_AVAILABLE_OVERWRITTEN: un intento adicional reutilizó por error la carpeta de resultados. El primer fallo de Contrato era un selector dependiente del texto cambiante del botón; se conservan sus artefactos. Corregir solo el selector, manteniendo las aserciones y una carpeta distinta, dejó1FAIL real por Cancelar habilitado. Efecto de Contrato NOT_MEASURED; recibo NOT_RUN. Ningún PASS posterior borra estos fallos ni la pérdida señalada.'+$nl+'Se conectan cancelDisabled y una política closeBlocked derivada de estados existentes; solo SimCreate consume el cierre. No hay otra primitiva, estado, efecto, algoritmo, SQL o servicio. locked, callbacks, órdenes y recibos se conservan. El reintento incierto SIM mantiene la misma orden y un efecto sintético; recibo+503 solo consulta;403 permite cancelar, cerrar y reabrir para enviar una nueva orden explícita. La reversión reconstruye el padre y las24aserciones originales. Dieciocho capturas vistas:12SIM de recuperación,3postacción y3Contrato. El panel raíz de Contrato/Portabilidad no está probado aquí; las3deContrato solo cubren la confirmación.'+$nl+'HTTP/DTO/efectos sintéticos con componentes, repositorio y parsers reales. AuthDB/JWT/RLS/SQL/Next integrado y modelo vivo NOT_RUN/API0. No se acredita SQL idempotente, ausencia, autoridad, durabilidad ni W4. Matriz342/31PARTIAL/311sin reconciliar/0READY; HIGH5/W4 pendientes, IA writesOFF, issue10OPEN, releaseNOT_ACCEPTED.1887source78 activo46411 y1908source80 waiter56843 conservan sus pines.1956/113 preparado, NO_SOLICITADO: coalescer con la siguiente unidad de Contrato antes de otro full. Sin herencia, retarget, cancelación o duplicación. Semántica78 pendiente de revisión y consumo W1. F736/B9/981/1266 y demás fallos preservados; fuentes ajenas y PR38/142/153/main/W3core/W4/W5/recurso intactos.'

foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}








