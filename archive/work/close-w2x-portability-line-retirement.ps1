$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-portability-line-retirement';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=10269}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(portability): stop retired selection before reading line parents'
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
$body='HANDOFF W2-X54 — lecturas de línea retiradas en nueva portabilidad. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', base '+$cp.base+'. CLAIM 6251383126.'+$nl+'Original: 2 FAIL / 1 PASS, 34,2 s. Con el punto de B retenido, volver a A o cerrar todavía iniciaba las consultas de servicio B y contrato B al llegar la respuesta. El caso B vigente pasa. El efecto entrega ahora su predicado active al readLineContext existente. Se reutiliza su control de vigencia; no cambian helper, servicios, contratos, comandos, recibos ni lectura postcomando. La reversión textual del único argumento devuelve exactamente el padre.'+$nl+'Controles propios: 84/84 PASS en 2,4 min: 18 retirada/cierre/vigente en entrada y salida, 60 recuperación de creación y 6 dirección. Build 66; lint sin errores, con tres warnings conservados; scan, diff, cola y bundle verificados. Banco nuevo: cero peticiones nuevas a los dos padres concretos de B tras retiro/cierre y dos con B vigente; ningún comando. La consulta de línea ya enviada permanece en vuelo. Esto no demuestra cancelación de red, ausencia SQL, autoridad ni permisos reales.'+$nl+'Seis capturas realmente vistas: entrada, A tras retirar B y B vigente, en 390/768/1440. Selección, operador fijo y acciones visibles; nota inferior móvil parcial. Cierre/salida sin aceptación visual individual. Componentes/repositorio/parsers reales, HTTP/DTO controlado; Auth/DB/JWT/RLS/Next integrado/modelo vivo NOT_RUN, API de pago 0.'+$nl+'Matriz 342/27 PARTIAL/315 sin reconciliar/0 READY. Globales 1434 BC3 y 1479 Agenda separados, sin incluir esta corrección ni heredar PASS. Cinco HIGH/W4 pendientes, IA writes OFF, issue10 OPEN, release NOT_ACCEPTED. Fallos originales F736/B9/981/1266 y fixtures anteriores conservados. Fuentes ajenas, PR38/142/153/main, W3/W4/W5 y recurso nativo intactos. Siguiente: comprobar ventanas equivalentes en lecturas de detalle, usando los controles existentes y una reproducción propia.'
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}
