$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-proposal-review-commercial';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=70031}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'test(billing): verify editable proposals require renewed manual review'
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
$body='HANDOFF W2-X: recorrido comercial de propuesta editable y revisión manual. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', base '+$cp.base+'. CLAIM6214203401. Solo test/documentación;producto idéntico al padre.'+$nl+'Propuesta sola no guarda ni habilita Guardar;revisar y luego editar notas desmarca revisión ybloquea Guardar;editar concepto,cantidad2,precio200,IVA21% muestra base400/impuesto84/total484 ysolo click manual revisado envía create_draft con esos valores. Recibo ylectura posterior estrictos poridentificador/cliente/versión/estado;ninguna emisión automática.'+$nl+'Primer9:3FAIL/6PASS1.0min preservado. Error de mi fixture usó {ok:true,data} para comando queexige {ok:true,receipt};validador rechaza correctamente,no defecto de producto acreditado. Una corrección exclusiva del sobre ysolo3fallidos repetidos:3PASS10.5s;6verdes intactos,resultado6+3complementarios,no9singlePASS. Igualdad textual fuera del sobre ysrc idéntico verificadas. Build66/lint0errores3warnings/scan/diff/cola/bundle propios.'+$nl+'Cinco capturas realmente vistas:importes/revisión/acciones editadas390/768/1440 yrevisión invalidada390/1440;tramo inferior drawer,cliente/fechas fuera del viewport,visual parcial. Componentes/repositorio/parser local/cálculo reales,HTTP/DTO controlado;guardado backend/AuthDB/JWT/RLS/Next integrado/modelo vivoNOT_RUN,API0. La respuesta simulada no prueba persistencia SQL. Sin cambio de aceptación individual en esta unidad;cola342/24PARTIAL/318sinreconciliar/0READY. No hereda91/1311/1362.'+$nl+'HIGH5/W4 pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. Fallos originalesF736/B9/981/1266 yfixture45 separados intactos;fuentes ajenas/PR38/142/153/main/W3/W4/W5/recurso sin cambios. Siguiente:revisión individual PAR140 respaldada por esta fuente exacta,conCLAIM propio ysin aceptación global ni repetición de verdes.'
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}
