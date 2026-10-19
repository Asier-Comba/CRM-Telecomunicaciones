$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-communications-page-focus';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_CONTROLS';session=26832}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not(Test-Path ('work/'+$prefix+'-build-exit.txt'))){if($watch.Elapsed.TotalMinutes -gt 30){throw 'NO_TERMINAL_CONTROLS'};Start-Sleep -Seconds 5}
python work/preflight-unit106.py
if($LASTEXITCODE){throw 'PREFLIGHT_FAILED_PRESERVE_NO_RETRY'}
node work/crm-w2x-document-upload-uncertain/scripts/product/build-release-queue.mjs --check *> ('work/'+$prefix+'-queue.txt')
if($LASTEXITCODE){throw 'QUEUE_FAILED'}
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'fix(customers): preserve pagination focus for linked conversations'
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
HANDOFF W2-X106 — foco al paginar comunicaciones internas vinculadas del cliente.

Fuente $sha; árbol $tree; rama $($cp.branch); padre $($cp.base); CLAIM6256801949. Propios $($cp.browser_summary),compilación66,lint0errores/3avisos conservados,scan,cola ycopia Git verificada.12casos nuevos de éxito/403/control elegido/vacío×3907681440 y9contextuales de cambio de cliente/recurso en detalle/contexto/resumen. No se heredan111 del padre niPASSglobal.

Original4FAIL es fallo de selector de fixture:role=status incluye dos outputs auxiliares. Conservados banco/log/directorio originales. Se acota al texto de carga sin quitar rol/aserción. Causal-v2 sobre producto padre sin cambiar:3FAIL1PASS47,5s390;éxito/denegación/vacío dejanBODY,Actualizar elegido ya conserva foco. No causal previa de otros anchos. Final igual a v2 yreversible al original solo por selector.

CustomerCommunications incorpora refs nativas de estado/error,intención de paginación yun efecto que solo orienta si el foco sigueBODY. Actualizar retira intención. Consultaslimit20/cursor,filtrado por cliente,roles/permisos,enlaces yestados intactos. Sin nueva primitiva/servicio/contrato. Fixture customer-resource existente,solo modo opcional communications;otros modos conservados con reversión exacta. No consultar cuerpos de notas ni marcar lecturas comerciales.

Dos inbox.list exactas por primario,20registros iniciales yresultado21/denegado/vacío.12capturas actuales realmente vistas con hashes para foco/estado yregistro terminal cuando procede;no todas las conversaciones/roles/a11y completa niNext integrado. Primarios sin comandos,errores de página,operaciones inesperadas ni cuerpo privado.

Repositorio/parser Inbox real con HTTP sintético. AuthDB/JWT/RLS/membresía física/modelo vivoNOT_RUN/API0;sin ausencia/quiescencia/reinicio/handler/full23. F736/B9 yoriginales intactos. FIFO2139source97ejecución26311/2172source102wait76705 conservado,sin duplicar/cancelar controles.2109source92PASS43,9min no acredita106.

Matriz342/33PARTIAL/309sinreconciliar/0READY intacta,HIGH5/W4pendientes,IA writesOFF,issue10OPEN,releaseNOT_ACCEPTED. Ramas principales/ajenas/congeladas,W3/W4/W5/recurso yproducción intactos. Consumo principal requiere ACK exacto. Continuar unidad comercial independiente tras checkpoint íntegro.
"@
foreach($n in @(67,153,38,142)){
 $c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body}
 $pub.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$pub.publication='PARTIAL_HANDOFF'
 $pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
}
$pub.publication='PUBLISHED';$pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python work/checkpoint-w2x-communications-page-focus.py
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
python work/reconcile-w2x-current-continuation.py
if($LASTEXITCODE){throw 'MANIFEST_FAILED'}
