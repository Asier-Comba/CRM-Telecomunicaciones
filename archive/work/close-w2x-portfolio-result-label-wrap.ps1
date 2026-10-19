$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-portfolio-result-label-wrap';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=53509}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(portfolio): keep full result labels within their cards'
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
$body='HANDOFF W2-X91 — Cartera: nombre completo dentro de la tarjeta de resultado.'+$nl+'Fuente '+$sha+'; árbol '+$tree+'; rama '+$cp.branch+'; padre '+$cp.base+'; CLAIM '+$cp.claim+'. Propios '+$cp.browser_summary+' (9pertinentes y27regresiones del componente),build66,lint,scan,diff,cola ybundle verificado. Funcionales:NOT_RUN_UI_STYLE_ONLY. No237heredados de90.'+$nl+'Causal1FAIL/1PASS23,1s conservado con log,exit,banco y2observaciones. Etiqueta de servicio160válida para search/get:tarjeta llegaba a1720,14px enviewport390,mientras documentWidth seguía390 porrecorte. La etiqueta ordinaria26 abría/cerraba el editor yconservaba relaciones. No bastaba comprobar el ancho de página;la prueba mide tarjeta y título concretos.'+$nl+'Único fragmento:clases del h2 de resultado para envolver el texto completo yreducir su mínimo. No truncado,caracteres invisibles,nueva pantalla,estado,efecto,primitiva,consulta,referencia oacción. Reversión exacta al padre;aserciones idénticas al causal. Seis geometrías positivas acotadas a390/768/1440. Nombres160/26 completos,Ver activo/Añadir línea presentes;el ordinario conserva nombre del editor ylinks exactos acliente/contrato,sin comando.403controlado no muestra tarjeta,nombre ni cuerpo privado;no aceptación AuthDB.'+$nl+'Nueve capturas vistas:largas/ordinarias con tarjeta completa;en403390 el aviso queda bajo elviewport,se verifica porDOM,768/1440 muestran el estado sin tarjeta. Header/tablas/arnés parcialmente desplazados;inventario vacío eImportJobs403 declarados,no ausenciaSQL ni fallo de este cambio. No título largo del editor seleccionado:fuera de esta unidad ypendiente de reproducción independiente. No matriz completa de activos/roles/accesibilidad oaceptación integral de Cartera.'+$nl+'HTTP/DTO con componentes/repositorio/parsers reales,sin escrituras. AuthDB/JWT/RLS/SQL/Nextintegrado/modelo vivoNOT_RUN/API0;sin ausencia/quiescencia/reinicio/handler/full23. Global2007/source86 activo41016 y2043/source88 waiter93361 conservan pines;no acreditan90/91. No otrofull solicitado hasta coalescer backlog. Matriz342/31PARTIAL/311sinreconciliar/0READY,HIGH5/W4pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. F736/B9 yfallos anteriores preservados. Main,PR38/142/153 yW3/W4/W5/recurso intactos;consumo principal pendiente de ACK exacto. Continuar defecto del título seleccionado si se reproduce.'

foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}









