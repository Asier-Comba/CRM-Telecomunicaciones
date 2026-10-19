$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-customer-domain-table-title-wrap';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_CONTROLS';session=71101}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not(Test-Path ('work/'+$prefix+'-build-exit.txt'))){if($watch.Elapsed.TotalMinutes -gt 30){throw 'NO_TERMINAL_CONTROLS'};Start-Sleep -Seconds 5}
python work/preflight-unit102.py
if($LASTEXITCODE){throw 'PREFLIGHT_FAILED_PRESERVE_NO_RETRY'}
node work/crm-w2x-document-upload-uncertain/scripts/product/build-release-queue.mjs --check *> ('work/'+$prefix+'-queue.txt')
if($LASTEXITCODE){throw 'QUEUE_FAILED'}
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'fix(customers): wrap record labels to preserve service table context'
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
HANDOFF W2-X102 — Servicios del cliente: nombre completo y operador visibles en la tabla.

Fuente $sha; árbol $tree; rama $($cp.branch); padre $($cp.base); CLAIM6256461650. Propios $($cp.browser_summary):21 casos pertinentes de Servicios y60 contextuales de Incidencias/SIM/Contratos. Compilación66, analizador con tres avisos previos conservados, scan, diferencias, cola y copia Git verificada. Los93 del padre mantienen solo su propio SHA, sin heredarlos.

Causal3FAIL3PASS43,9s: título válido160 hace tabla2071,296875 dentro de1198,primera celda1287,296875 yoperador fuera del recorte en1280/1440/1920. Los tres ordinarios pasan,tabla1198/celda201,046875. El documento no crecía;se miden contenedor,tabla,celda,enlace yoperador. Logs, geometrías, capturas, banco ycausas conservados.

Una sola clase de la primera celda existente añade envoltura. Mismos mínimo de ancho,texto completo,href,tipografía,columnas,controles,datos,consultas yestados;sin otra primitiva/pantalla/servicio/contrato. En los seis casos finales,tabla1198 yoperador/nombre dentro del viewport;celda larga411,890625. El scroll sigue disponible para dominios con muchas columnas;no se afirma que todos deban caber.

Seis cuadros de tabla realmente vistos,con hashes,long/ordinario en1280/1440/1920. Solo un servicio sintético con siete campos cortos o no registrados,no todas las filas/importes/dominos/roles. Banco final idéntico al causal. Nueve casos de tarjeta/denegación,seis de foco/paginación/cambio de colección y60contextuales se ejecutan de nuevo en esta fuente.

Componentes/repository/parsers reales con HTTP sintético. Primarios sin comandos,operaciones inesperadas oerrores de página. AuthDB/JWT/RLS/roles/membresía/multiempresa física/navegaciónNext integrada/modelo vivoNOT_RUN/API0;sin ausencia/quiescencia/reinicio/handler/full23 ni accesibilidad/táctil completos. F736/B9 y originales conservan causa yalcance.

Matriz342/33PARTIAL/309sinreconciliar/0READY sin promociones. Las imágenes94 mantienen su alcance de tabla anterior;no reinterpretarlas.2007/source86 y2043/source88 publicados PASS55,8min/52min;2109/source92 activo93887 y2139/source97wait26311 mantienenFIFO/pines yno acreditan102. CincoHIGH/W4 pendientes,IA comercial writesOFF,issue10OPEN,releaseNOT_ACCEPTED. Main,ramas principales/ajenas/congeladas,W3/W4/W5/recurso yproducción intactos;consumo principal requiere ACK exacto. Continuar otra unidad comercial útil independiente tras checkpoint, sin repetir verdes sin cambio.
"@
foreach($n in @(67,153,38,142)){
 $c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body}
 $pub.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$pub.publication='PARTIAL_HANDOFF'
 $pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
}
$pub.publication='PUBLISHED';$pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python work/checkpoint-w2x-customer-domain-table-title-wrap.py
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
python work/reconcile-w2x-current-continuation.py
if($LASTEXITCODE){throw 'MANIFEST_FAILED'}
