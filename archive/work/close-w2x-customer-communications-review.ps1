$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-customer-communications-review';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='METADATA_PREFLIGHT_DONE_PUBLISH_ONCE'}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'docs(product): reconcile customer communications evidence individually'
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
HANDOFF W2-X107 — revisión individual PAR056 Customer360:Comunicaciones.

Metadata $sha; árbol $tree; rama $($cp.branch); padre f48425b5d30a071049392486ba669bd23cfa5044;CLAIM6256861171. Runtime/build/AuthDB/modelo de107 NOT_RUN. Evidencia funcional106 conserva21PASS35,2s/build66/lint0errores3avisos/scan/cola/12capturas/publicación;no heredar21 a107.

Solo nueva revisión PAR056,cola derivada ydocumento.33revisiones anteriores/341otrasfilas/metadata global/src/tests intactos. Matriz342/34PARTIAL/308sinreconciliar/0READY. Implementación/consumo/browser/visualPARTIAL;Backend/SecurityNOT_RECONCILED,externalBLOCKED,RELEASE_READYfalse. No promover InboxPAR167/Asistente/otrasfilas niaceptación de release.

12casos pertinentes y9contextuales en106.20+1válido con dosinbox.list exactaslimit20/after_id20;sin cuerpo de notas,markread,comandos,errores de página nioperaciones inesperadas en primarios. Foco de resultado/error ycontrol elegido,registro21enlace/página terminal/vacío/403 a3907681440.12cuadros originales realmente vistos yhashes revalidados.20filas inicialesDOM,no20aceptaciones visuales.9contextos detalle/contexto/resumen no pruebanretiro enComunicaciones.

Original4FAILselector de fixture ycausal-v2 3FAIL1PASS47,5s390 separados. Selector acotado antes de cambiarproducto,sin relajar aserciones. F736/B9 ytodos los originales conservan causa yalcance. Repositorio/parser real con HTTP sintético,no AuthDB/JWT/RLS/tenant/membresía/roles físicos. Pendientesotrasempresas/clientes/no vinculadas/dataset arbitrario/orden concurrente/otrosestados/Nextintegrado/táctil/a11y completos,W4 independiente. No ausencia/quiescencia/reinicio/handler/full23,modelo vivoNOT_RUN/API0.

FIFO2139source97/2172source102/2214source106wait16884 intacto;colección2214realmente verificada,noPASSantes de ejecutarla. Source106mantiene su matriz33,nohereda metadata107. HIGH5/W4 pendientes,IA writesOFF,issue10OPEN,releaseNOT_ACCEPTED. Ramas principales/ajenas/congeladas,W3/W4/W5/recurso yproducción intactos. Consumo principal requiereACK exacto. Guardias/diff/cola/scan/bundle verificados;seguir otraunidad útil conCLAIM ycheckpoint.
"@
foreach($n in @(67,153,38,142)){
 $c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body}
 $pub.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$pub.publication='PARTIAL_HANDOFF'
 $pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
}
$pub.publication='PUBLISHED';$pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python work/checkpoint-w2x-customer-communications-review.py
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
python work/reconcile-w2x-current-continuation.py
if($LASTEXITCODE){throw 'MANIFEST_FAILED'}
