$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-customer-list-filter-priority';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_CONTROLS';session=35154}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not(Test-Path ('work/'+$prefix+'-build-exit.txt'))){if($watch.Elapsed.TotalMinutes -gt 30){throw 'NO_TERMINAL_CONTROLS'};Start-Sleep -Seconds 5}
python work/preflight-unit97.py
if($LASTEXITCODE){throw 'PREFLIGHT_FAILED_PRESERVE_NO_RETRY'}
node work/crm-w2x-document-upload-uncertain/scripts/product/build-release-queue.mjs --check *> ('work/'+$prefix+'-queue.txt')
if($LASTEXITCODE){throw 'QUEUE_FAILED'}
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'fix(customers): prioritize mobile inventory with persistent collapsible filters'
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
HANDOFF W2-X97 — Clientes móvil: inventario primero, filtros desplegables y persistentes.

Fuente $sha; árbol $tree; rama $($cp.branch); padre $($cp.base); CLAIM6256082724. Propios $($cp.browser_summary):15 casos relacionados con inventario y51 contextuales. Compilación66, analizador con avisos conservados, scan, diferencias, cola y copia Git verificada. Ningún60 del padre ni otra suite se hereda.

Medición antes de editar, con títuloClientes alineado al borde superior para excluir el harness: nombre largo móvil y927–1119 dentro del área64–960. El ordinario sí muestra el nombre y927–951; su tarjeta y883–1055 solo deja77/172píxeles visibles. Primer banco2FAIL4PASS53s: largo recortado y nuevo botón aún ausente en ordinario; cuatro controles de escritorio pasan. Medición complementaria ordinaria1FAIL de tarjeta<50% antes de editar. Conservar causas distintas, todos los bancos/logs/resultados y la aserción adicional de tarjeta; sin fabricar dos fallos de nombre idénticos.

Botón nativo Filtros de clientes en inventario integrado móvil, con aria-controls/expanded y aviso Aplicados. El estado de expansión vive en IntegratedCustomers: los cambios de filtro/cursor/actualización que remontan Customers conservan expansión y valores. En768/1440 los controles permanecen abiertos. Sin nueva pantalla, primitiva, API, servicio o consulta; selección y tabla preservadas. La interfaz añade controles de presentación opcionales; consumidores anteriores sin ellos mantienen el comportamiento abierto.

El banco96 recibe solo abrir filtros antes de elegir estado en390; todas sus aserciones y datos se reconstruyen exactamente contra el padre. Nuevo banco conserva nombre en viewport y añade al menos50% de primera tarjeta, apertura, valor seleccionado, expansión tras cambio, cierre con foco, indicación Aplicados y reapertura. Quince casos directos y51 de Customer360/Servicios/foco/retirada se ejecutaron de nuevo en esta fuente.

Diez capturas actuales realmente vistas: seis iniciales de prioridad, dos con filtros móviles abiertos y dos controles actuales de nombre390. El pie de la tarjeta larga del control sin alinear puede quedar fuera del primer cuadro; no se acepta toda la tarjeta por esa imagen. Las fotos96 que ocultaban la tarjeta conservan ese límite y no se reinterpretan. No aceptación visual de todos los campos/columnas/roles/accesibilidad/táctil.

Componentes/repository/parsers reales, HTTP sintético y contexto Router de prueba existente, sin otro servidor o recurso. AuthDB/JWT/RLS/roles/membresía/multiempresa física/navegaciónNext integrada/modelo vivo NOT_RUN, API0. Primarios sin comandos; sin ausencia/quiescencia/reinicio/handler/full23. ProductProvider real conserva su remount; no se sustituye por una supuesta corrección de seguridad.

Matriz342/32PARTIAL/310sinreconciliar/0READY y PAR046 con su evidencia94 intactos. CincoHIGH y revisión W4 pendientes, IA comercial writesOFF, issue10OPEN, releaseNOT_ACCEPTED.2043/source88 sigue una vez53189 y2109/source92 espera93887 tras2043terminal/PUBLISHED/PASS; ninguna acredita97. F736/B9 y originales conservan causa y alcance. Main, ramas principales/ajenas/congeladas, W3/W4/W5/recurso y producción intactos. Consumo principal requiere ACK exacto. Preparar regresión coalescida de cambios93/94/96/97 con colección real y continuar trabajo independiente, sin duplicar los controles ya solicitados.
"@
foreach($n in @(67,153,38,142)){
 $c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body}
 $pub.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$pub.publication='PARTIAL_HANDOFF'
 $pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
}
$pub.publication='PUBLISHED';$pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python work/checkpoint-w2x-customer-list-filter-priority.py
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
python work/reconcile-w2x-current-continuation.py
if($LASTEXITCODE){throw 'MANIFEST_FAILED'}
