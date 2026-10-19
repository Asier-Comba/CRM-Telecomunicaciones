$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-customer-services-review';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='METADATA_PREFLIGHT_DONE_PUBLISH_ONCE'}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'docs(product): reconcile Customer360 services evidence individually'
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
HANDOFF W2-X95 — Revisión individual PAR-046: Customer360 Servicios.

Fuente de metadata $sha; árbol $tree; rama $($cp.branch); padre3baf2ebef46e3ea8d48e84078f4841d9048f492a; CLAIM6255954582. Solo nueva revisión PAR046, cola derivada y documento. Runtime/build/AuthDB/modelo en SHAmetadata:NOT_RUN; ningún75 ni PASS del padre se hereda.

La evidencia sigue anclada a fuente94/3baf2eb:75 pruebas propias en2,1min, build66, lint0errores/3avisos, scan/cola/bundle y publicación propios. Solo15 casos pertinentes a Servicios:9 de nombres/denegación a390/768/1440 y6 de foco/paginación/cambio de colección. Los60 de Incidencias/SIM/Contratos son contexto. No se repiten verdes por una revisión documental.

Se registra PARTIAL para implementación, consumo, navegador y visual. PROVEN_BACKEND y SECURITY_ACCEPTED siguen NOT_RECONCILED; EXTERNAL_BLOCKED continúa BLOCKED y RELEASE_READY falso. No aceptación de Auth/JWT/RLS/roles/membresía reales, altas/edición/suspensión/baja/cambios de tarifa, todas las relaciones, pantalla comercial completa, accesibilidad o táctil.403de fixture no demuestra aislamiento físico. En1440 la tabla larga usa scroll intencional y no se aceptan todas las columnas.

Nueve imágenes de fuente94 realmente vistas, cuyos hashes originales se verificaron y constan en el documento nuevo. Ese documento es un índice de evidencia de94, no un archivo ejecutado en94 ni imágenes del SHAmetadata. Banco de94 conserva su causal1FAIL1PASS21,8s en el padre y sus aserciones. F736/B9, fallos de preparación93 y todos los originales conservan su alcance; no se borran ni reciben una causa nueva.

Guardias propias: únicamente PAR046,341otras filas y31revisiones previas idénticas; metadata global/accepted/candidate/blockers,src ytests sin cambios. Cola342/32PARTIAL/310sinreconciliar/0READY, diff/scan y bundle verificado. Sin promoción masiva, PASS global o aceptación comercial completa.

2043/source88 continúa una vez53189,2109/source92 espera93887 tras2043terminal/PUBLISHED/PASS.2007/source86 PASS55,8min publicado conserva solo su SHA. CincoHIGH/W4 pendientes, IA comercial writesOFF, issue10OPEN, releaseNOT_ACCEPTED, API0. Sin cambios a main, ramas principales/ajenas/congeladas, W3/W4/W5/recurso o producción. Consumo principal requiere ACK exacto. Continuar otra unidad comercial útil tras checkpoint.
"@
foreach($n in @(67,153,38,142)){
 $c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body}
 $pub.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$pub.publication='PARTIAL_HANDOFF'
 $pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
}
$pub.publication='PUBLISHED';$pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python work/checkpoint-w2x-customer-services-review.py
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
python work/reconcile-w2x-current-continuation.py
if($LASTEXITCODE){throw 'MANIFEST_FAILED'}
