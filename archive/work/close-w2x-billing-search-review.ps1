$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-billing-search-review';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='PREFLIGHT_ONCE'}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
python ('work/checkpoint-'+$prefix+'.py') preflight
if($LASTEXITCODE){throw 'METADATA_GUARDS_FAILED'}
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'docs(billing): reconcile customer search and filters individually'
if($LASTEXITCODE){throw 'COMMIT_FAILED'}
$sha=(git -C $repo rev-parse HEAD).Trim();$tree=(git -C $repo rev-parse 'HEAD^{tree}').Trim()
$publication=@{sha=$sha;tree=$tree;publication='LOCAL_COMMIT_PUSH_PENDING';handoffs=@()};$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
git -C $repo push origin ('HEAD:refs/heads/'+$cp.branch)
if($LASTEXITCODE){throw 'PUSH_UNCERTAIN_INSPECT'}
$bundle=Join-Path $PSScriptRoot ($prefix+'.bundle');git -C $repo bundle create $bundle HEAD
if($LASTEXITCODE){throw 'BUNDLE_FAILED'}
git -C $repo bundle verify $bundle
if($LASTEXITCODE){throw 'BUNDLE_VERIFY_FAILED'}
. ./work/CrmGitHub.ps1
$nl=[string][char]10+[char]10
$body='PAR-103 — listado, búsqueda y filtros: revisión individual parcial. Metadata '+$sha+', árbol '+$tree+', rama '+$cp.branch+', CLAIM6252658014. Evidencia exacta44d807ec2c8b85540e648643eaeecbd8474de967.'+$nl+'Una fila nueva:342/29PARTIAL/313sinreconciliar/0READY.28revisiones previas/341otrasfilas/globales/src/tests idénticos por guardas;queue/diff/scan/bundle propios. RuntimeNOT_RUN metadataSHA,sin verdes repetidos o heredados. Implementación/consumo/visual parciales;backend/navegador integral/seguridad sin aceptar.'+$nl+'Dentro de78browser fuente67,33casos directamente pertinentes:18identidad tardía/búsqueda/selección y15filtro tras identidaddenegada/notfound/transport/malformed/current.45contextuales no certifican toda fila. B conserva nombre/selección/readiness/texto;filtro explícito no se amplía por error,salvo borrado manual;finanzas mantiene alcance del espacio.49funcionales/build66 de67 conservan su fuente. Original1FAIL1PASS23,5s fuente66 preservado.'+$nl+'Seis capturas ya vistas deBseleccionado3907681440 conAactivo/archivado,nombre/Nuevo/texto legibles. Select cerrado no muestraA ni otrasopciones,medidos porHTTPDOM;lista vacía fixture no ausenciaSQL,móvil inferior recortado. Faltan filas reales cargadas,paginación/periodo/estado/búsqueda completos,finanzas reales,roles/AuthDB/JWT/RLS/Next/accesibilidad/W4. Modelo vivoNOT_RUN/API0,parserlocal no IA viva.'+$nl+'Global1773fuente65 activo único76632,sin arreglo67 ni18nuevos;no duplicar/cancelar/heredarPASS. HIGH5/W4 pendientes,IA writesOFF,issue10OPEN,releaseNOT_ACCEPTED. F736/B9/981/1266/fixtures/preparación intactos;fuentes ajenas/PR38/142/153/main/W3/W4/W5/recurso intactos. Siguiente:reproducir búsqueda posterior sin cambiar cliente actual y cambio explícito de cliente,conservando límites de aceptación individual.'
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}



