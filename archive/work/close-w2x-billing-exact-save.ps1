$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-billing-exact-save';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=50210}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(billing): require exact preview before saving drafts'
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
$body='HANDOFF W2-X58 — guardar borrador con previsión exacta. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', base '+$cp.base+'. CLAIM6251720544.'+$nl+'Original: 2 FAIL / 1 PASS en50,6 s. Precio con precisión excesiva y total fuera del límite muestran previsión no disponible, pero revisar habilitaba Guardar. El positivo válido pasa. No se reproduce escritura SQL inválida; repositorio y validación intactos. Dos expresiones reutilizan exact para disabled y callback, sin cálculo/contrato/estado/efecto nuevos ni cambiar la demostración. Reversión textual devuelve exactamente el padre.'+$nl+'Propios63/63 PASS en1,7 min: 18 nuevos, 18 recibos, 18 lectura registrada y nueve revisión de propuesta. Crear/editar en390/768/1440. Inválidos no envían comando; corregir resetea revisión, exige marcarla otra vez y después confirma484 con un comando manual simulado, payload y versión esperados. Build66; lint sin errores y tres warnings conservados; scan/diff/cola/bundle. No emisión ni modelo vivo.'+$nl+'Seis capturas realmente vistas de creación con precisión inválida/edición con exceso de total en390/768/1440: conceptos/importes, totales no disponibles, aviso, revisión marcada y Guardar deshabilitado. Zona superior fiscal/cliente/fechas fuera de estas capturas; fondo de fixture excluido. HTTP/DTO controlado, componentes/repositorio/parsers reales; AuthDB/JWT/RLS/Next integrado/modelo vivo NOT_RUN/API0.'+$nl+'Global1479 fuente53 y1575 fuente57 separados, sin esta corrección ni PASS heredado. Matriz342/27 PARTIAL/315 sin reconciliar/0 READY. Cinco HIGH/W4 pendientes, IA writes OFF, issue10 OPEN, release NOT_ACCEPTED; originalesF736/B9/981/1266/fixtures preservados. Fuentes ajenas/PR38/142/153/main/W3/W4/W5/recurso intactos. Siguiente: actualizar solo revisión PAR-105 con esta fuente y alcance exactos, sin promoción masiva ni aceptación de backend/seguridad.'
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}


