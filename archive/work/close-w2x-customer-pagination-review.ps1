$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-customer-pagination-review';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='METADATA_PREFLIGHT_DONE_PUBLISH_ONCE'}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'docs(product): reconcile customer pagination evidence individually'
if($LASTEXITCODE){throw 'COMMIT_FAILED'}
$sha=(git -C $repo rev-parse HEAD).Trim();$tree=(git -C $repo rev-parse 'HEAD^{tree}').Trim()
$pub=@{sha=$sha;tree=$tree;publication='LOCAL_COMMIT_PUSH_PENDING';handoffs=@()}
$pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
git -C $repo push origin ('HEAD:refs/heads/'+$cp.branch)
if($LASTEXITCODE){throw 'PUSH_UNCERTAIN_INSPECT_NO_RETRY'}
$bundle=Join-Path $PSScriptRoot ($prefix+'.bundle')
git -C $repo bundle create $bundle HEAD
if($LASTEXITCODE){throw 'BUNDLE_FAILED'}
git -C $repo bundle verify $bundle
if($LASTEXITCODE){throw 'BUNDLE_VERIFY_FAILED'}
. ./work/CrmGitHub.ps1
$body=@"
HANDOFF W2-X100 — Revisión individual PAR-030 Clientes: Paginación.

Fuente de metadata $sha; árbol $tree; rama $($cp.branch); padre f40091a9f0e03d52ae9792ba002721c1709a0e66; CLAIM6256323517. Runtime/build/AuthDB/modelo en este SHA:NOT_RUN. Fuente99 conserva78 propios1,7min/build66/lint0errores3avisos/scan/visual12/PUBLISHED; ningún78 se hereda a metadata100.

Solo nueva revisión PAR030, cola derivada y documento. Las341otras filas,32revisiones previas,metadata global/accepted/candidate/blockers,src ytests permanecen idénticos. Matriz342/33PARTIAL/309sinreconciliar/0READY. Implementación/consumo/navegador/visual PARTIAL; Backend/SecurityNOT_RECONCILED,externalBLOCKED,RELEASE_READYfalse. Sin promoción masiva o de release.

Doce casos pertinentes dentro de78:éxito,403,foco elegido yfiltro que sustituye página pendiente en390/768/1440;66son contexto. Registros originales revalidados: consulta posterior exactamentelimit20/sortid_asc/after_id terminado en20. Fixture válido20+1, no recuento real ni prueba individual de todos los registros. Enter activa página,retira filas durante espera,orienta al resultado/error,respetando otrocontrol,yrecupera página1 tras denegación. Filtro descarta página antigua ysu intención de foco.

Doce imágenes originales99 realmente vistas yhashes revalidados en el documento nuevo,que solo indexa evidencia99. La imagen de error precede a la recuperación por teclado (DOM posterior);registro filtrado390 queda debajo del cuadro con filtros abiertos (DOM). No todos los campos/columnas/roles/accesibilidad/táctil ni navegaciónNext integrada. Original2FAIL1PASS49,6s ytodos los demás fallos conservados, sin nuevas causas paraF736/B9.

Sin aceptación de AuthDB/JWT/RLS/roles/membresía físicos,dataset arbitrario,cambios concurrentes,botón límite final,todos los filtros oW4.403simulado no prueba aislamiento real. API0/modelo vivoNOT_RUN,sin ausencia/quiescencia/reinicio/handler/full23. CincoHIGH/W4 pendientes,IA comercial writesOFF,issue10OPEN,releaseNOT_ACCEPTED.

2007/source86 y2043/source88 publicados PASS55,8min/52min conservan sus SHAs.2109/source92 activo93887 y2139/source97 waiter26311 mantienenFIFO/pines yno acreditan100. Main,ramas principales/ajenas/congeladas,W3/W4/W5/recurso yproducción intactos. Guardias propias,diff/cola/scan/bundle verificado. Continuar otra unidad comercial útil independiente sin repetir verdes sin cambio.
"@
foreach($n in @(67,153,38,142)){
 $c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body}
 $pub.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$pub.publication='PARTIAL_HANDOFF'
 $pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
}
$pub.publication='PUBLISHED';$pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python work/checkpoint-w2x-customer-pagination-review.py
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
python work/reconcile-w2x-current-continuation.py
if($LASTEXITCODE){throw 'MANIFEST_FAILED'}
