$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-portability-detail-line';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=17103}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(portability): preserve read lifetime through line context'
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
$body='HANDOFF W2-X55 — padres de línea en detalle de portabilidad. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', base '+$cp.base+'. CLAIM 6251454362.'+$nl+'Original: 1 FAIL / 1 PASS, 20,7 s. Tras portability.get, el punto de línea retenido todavía iniciaba contrato/servicio antiguos después de cambiar de referencia. El caso vigente pasa. El lector entrega ahora su isCurrent existente al readLineContext sin modificarlo. Reversión textual del único argumento devuelve el padre; se conserva unidad54. Sin estado, efecto, servicio ni mecanismo de autoridad nuevo; comandos, recibos, CAS y callbacks intactos.'+$nl+'Controles propios: 66/66 PASS en 1,8 min: 18 ventana nueva, 18 frontera inicial y 30 postcomando. Build66; lint sin errores y tres warnings conservados; scan/diff/cola/bundle. Referencia/empresa/actor/rol retirados no encadenan padres anteriores; entrada/salida vigentes consultan los dos. Ningún comando en el banco nuevo; regresiones con comandos manuales simulados. No cancelación de solicitud ya enviada ni prueba de ausencia SQL, permiso real o durabilidad.'+$nl+'Seis capturas realmente vistas: vigente y referencia B en tres anchos, cabecera de cliente/operadores/fechas/enlaces y editor parcial. Controles de contexto/navegación/UUID del fixture excluidos; inferior móvil, otros contextos y salida sin aceptación visual completa. Componentes/repositorio/parsers reales con HTTP/DTO controlado; Auth/DB/JWT/RLS/Next integrado/modelo vivo NOT_RUN; API0.'+$nl+'Matriz342/27 PARTIAL/315 sin reconciliar/0 READY; globales1434 BC3 y1479 Agenda separados, sin incluir esta corrección ni heredar PASS. Cinco HIGH/W4 pendientes; IA writes OFF, issue10 OPEN, release NOT_ACCEPTED. F736/B9/981/1266 y fallos de fixture/preparación anteriores intactos. Fuentes ajenas/PR38/142/153/main/W3/W4/W5/recurso sin cambios. Siguiente: comprobar la ventana equivalente del detalle SIM/eSIM con reproducción y controles propios.'
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}
