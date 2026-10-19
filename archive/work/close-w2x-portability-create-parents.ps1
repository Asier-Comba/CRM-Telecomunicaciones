$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-portability-create-parents';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=26218}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(portabilities): preserve confirmed creation read lifetime'
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
$body='HANDOFF W2-X57 — padres de línea tras el recibo de creación. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', base '+$cp.base+'. CLAIM 6251598765.'+$nl+'Original: 1 FAIL / 1 PASS en 27,4 s. Tras recibo válido y portability.get se retiene el punto de línea. Retirar el formulario todavía iniciaba padres antiguos al liberarlo; el control vigente pasa. Se entrega el predicado mounted existente al readLineContext confirmado. La reversión del único argumento devuelve el padre; helper, comandos, recibos, CAS y controles54/55 intactos.'+$nl+'Propios114/114 PASS en3,7 min: 30 ventana nueva, 60 recuperación de alta, 18 selección de línea y seis de dirección. Build66; lint sin errores y tres warnings conservados; scan/diff/cola/bundle. Entrada/salida y recurso/empresa/actor/rol en390/768/1440. Retirados no encadenan los dos padres concretos; vigentes sí. Una acción manual simulada por caso nuevo. No cancelación de solicitud enviada ni prueba de persistencia/ausencia SQL, autoridad o durabilidad.'+$nl+'Seis capturas realmente vistas de entrada/salida vigentes en390/768/1440: aviso/enlace registrados, número enmascarado, operadores, dirección, fechas, estado y paginación. Contextos retirados sin aceptación visual individual; navegación/contexto del fixture excluidos. HTTP/DTO controlado con componentes/repositorio/parsers reales; AuthDB/JWT/RLS/Next integrado/modelo vivo NOT_RUN/API0.'+$nl+'Matriz342/27 PARTIAL/315 sin reconciliar/0 READY. Global1479 fuenteAgenda separado; global1575 tiene único waiter93249, espera esta publicación y1479 terminal/PUBLISHED/PASS, no lanzarlo de nuevo. Cinco HIGH/W4 pendientes, IA writes OFF, issue10 OPEN, release NOT_ACCEPTED. F736/B9/981/1266 y fallos históricos preservados. Fuentes ajenas/PR38/142/153/main/W3/W4/W5/recurso intactos. Siguiente unidad independiente: reproducir disponibilidad de guardar borrador cuando no existe previsión exacta; corregir solo si se demuestra, conservando validación del repositorio.'
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}

