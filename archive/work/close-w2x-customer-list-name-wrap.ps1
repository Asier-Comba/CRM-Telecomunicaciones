$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-customer-list-name-wrap';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_CONTROLS';session=33611}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not(Test-Path ('work/'+$prefix+'-build-exit.txt'))){if($watch.Elapsed.TotalMinutes -gt 30){throw 'NO_TERMINAL_CONTROLS'};Start-Sleep -Seconds 5}
python work/preflight-unit96.py
if($LASTEXITCODE){throw 'PREFLIGHT_FAILED_PRESERVE_NO_RETRY'}
node work/crm-w2x-document-upload-uncertain/scripts/product/build-release-queue.mjs --check *> ('work/'+$prefix+'-queue.txt')
if($LASTEXITCODE){throw 'QUEUE_FAILED'}
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'fix(customers): contain full names within inventory table links'
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
HANDOFF W2-X96 — Clientes: nombre completo dentro del enlace de la tabla.

Fuente $sha; árbol $tree; rama $($cp.branch); padre $($cp.base); CLAIM6256007130. Propios $($cp.browser_summary), nueve primarios y51regresiones representativas de Customer360/colecciones/foco/retirada. Build66,lint con avisos preservados,scan,diff,cola ybundle verificado. Padre95 es metadata con src/tests idénticos a94 comprobados; ningún75 ni otro PASS se hereda.

Causal válido2FAIL4PASS39,8s: nombre largo160 en tabla768 ocupa1299dentro de347 y1440 ocupa1299dentro de363;invade otras celdas aunque el documento no crece. Largo/ordinario390 yordinarios768/1440 pasan, con selección/filtro. Primer intento2FAIL por medición que buscaba td enarticle móvil,antes de geometría;se corrigió solo el ancestro td/article yse conservan intentos/bancos/logs/resultados. No presentar esos dos errores como causa del producto.

Una sola clase del enlace de tabla existente añade mínimo0 yenvoltura. Nombre,href,icono,columnas,umbrales responsive,tarjetas móviles,selección,consultas ycallbacks idénticos. Seis positivos finales comprueban texto/href,seleccionar/quitar selección yfiltrar conservando limpieza;403muestra alerta sin filas/cuerpo privado. Las opciones de filtro tienen lecturas independientes, no se afirma ausencia de ellas.

Nueve cuadros iniciales realmente vistos. Título corregido visible768/1440;en positivos390,los filtros llenan el primer cuadro yla tarjeta queda debajo:solo pruebaDOM de nombre/acciones,no aceptación visual de esa tarjeta. Alertas denegadas visibles en las tres anchuras. No todos los campos,columnas,roles,accesibilidad,táctil opantalla comercial completa.

IntegratedCustomers/Customers/repository/parsers reales,HTTP sintético. Fixturecustomer-resource existente incorpora modo optativo con AppRouterContext de prueba e interfaz Next instalada,incluido bfcacheId;no nuevo servidor,recurso oprimitiva. No navegaciónNext integrada ni push/replace/prefetch reales aceptados. No fabricar defecto de scope resuelto ya por remount del ProductProvider real. AuthDB/JWT/RLS/roles/membresía/multiempresa física/modelo vivoNOT_RUN/API0,sin comandos primarios,ausencia/quiescencia/reinicio/handler/full23.

Matriz342/32PARTIAL/310sinreconciliar/0READY;PAR046 conserva solo su evidencia94. CincoHIGH/W4 pendientes,IA comercial writesOFF,issue10OPEN,releaseNOT_ACCEPTED.2043/source88 sigue una vez53189;2109/source92 espera93887 tras2043terminal/PUBLISHED/PASS,ninguna acredita96. F736/B9 ytodos los originales preservados con sualcance. Main,ramas principales/ajenas/congeladas,W3/W4/W5/recurso yproducción intactos. Consumo principal requiere ACK exacto. Siguiente unidad:medir prioridad del inventario móvil frente a filtros,antes de editar ysin atribuirle los problemas de tabla ya resueltos.
"@
foreach($n in @(67,153,38,142)){
 $c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body}
 $pub.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$pub.publication='PARTIAL_HANDOFF'
 $pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
}
$pub.publication='PUBLISHED';$pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python work/checkpoint-w2x-customer-list-name-wrap.py
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
python work/reconcile-w2x-current-continuation.py
if($LASTEXITCODE){throw 'MANIFEST_FAILED'}
