$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-customer-list-refresh-focus';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_CONTROLS';session=1405}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not(Test-Path ('work/'+$prefix+'-build-exit.txt'))){if($watch.Elapsed.TotalMinutes -gt 30){throw 'NO_TERMINAL_CONTROLS'};Start-Sleep -Seconds 5}
python work/preflight-unit101.py
if($LASTEXITCODE){throw 'PREFLIGHT_FAILED_PRESERVE_NO_RETRY'}
node work/crm-w2x-document-upload-uncertain/scripts/product/build-release-queue.mjs --check *> ('work/'+$prefix+'-queue.txt')
if($LASTEXITCODE){throw 'QUEUE_FAILED'}
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'fix(customers): restore explicit refresh and retry outcome focus'
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
HANDOFF W2-X101 — Clientes: foco al actualizar y reintentar la lectura.

Fuente $sha; árbol $tree; rama $($cp.branch); padre $($cp.base); CLAIM6256363492. Propios $($cp.browser_summary):42 casos relacionados con inventario y51 contextuales. Compilación66, analizador con tres avisos previos conservados, scan, diferencias, cola y copia Git verificada. Padre100 es metadata con src/tests idénticos a99; ningún78 u otro PASS se hereda.

Causal3FAIL1PASS40,8s en390, producto intacto: Actualizar correcto, Actualizar403 yReintentar correcto dejan BODY pese al resultado/alerta visible. Elegir Nuevo cliente conserva BUTTON. Lecturas retenidas,observaciones/capturas/logs/banco conservados, sin comandos ni errores de página. No fallo de backend o roles reales.

Una sola condición del reload existente activa su propia intención de orientación. Reutiliza refs,estado/alerta enfocables ypolítica99: orientar al terminar si no se eligió otro control;filtrar retira intención yla revisión de consulta ya existente retira peticiones anteriores. Sin otra primitiva,servicio,consulta,API omecanismo de estado. Paginación99 yfiltros97 preservados.

Quince nuevos casos: éxito,denegación,foco elegido,reintento desde fallo inicial yfiltro que sustituye actualización pendiente,en390/768/1440. Las filas se retiran durante espera,error permite reintento por teclado,filtro conserva valor ydescarta respuesta/foco antiguos. Banco final idéntico al causal;las otras anchuras/caso de filtro ya previstos se ejecutan ahora. Los78 controles anteriores se ejecutan de nuevo en esta fuente, sin heredarlos.

Quince cuadros actuales realmente vistos,con hashes: resultado/alerta enfocados,botón elegido,reintento yfiltro. La imagen de error precede a la recuperaciónDOM;enchosen390,el registro queda debajo del cuadro con filtros abiertos. No todos los campos/columnas/roles/accesibilidad/táctil. Un error de comillas del auxiliar de montaje ocurrió antes de crear sus salidas;las15 imágenes originales intactas yla correcciónUTF8 quedan registradas,sin repetir pruebas ni atribuirlo al producto.

IntegratedCustomers/Customers/repository/parsers reales con HTTP sintético ycontextoRouter existente. AuthDB/JWT/RLS/roles/membresía/multiempresa física/navegaciónNext integrada/modelo vivoNOT_RUN/API0. Primarios sin comandos,sin ausencia/quiescencia/reinicio/handler/full23.403del fixture no prueba aislamiento real. F736/B9 yresto de originales conservan causa yalcance.

Matriz342/33PARTIAL/309sinreconciliar/0READY sin promociones;PAR030 mantiene99,PAR046/086 sus fuentes individuales.2007/source86 y2043/source88 publicados PASS55,8min/52min;2109/source92 activo93887 y2139/source97 waiter26311 mantienenFIFO/pines yno acreditan101. CincoHIGH/W4 pendientes, IA comercial writesOFF,issue10OPEN,releaseNOT_ACCEPTED. Main,ramas principales/ajenas/congeladas,W3/W4/W5/recurso yproducción intactos;consumo principal requiere ACK exacto. Continuar otra unidad comercial útil independiente tras checkpoint, sin repetir verdes sin cambio.
"@
foreach($n in @(67,153,38,142)){
 $c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body}
 $pub.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$pub.publication='PARTIAL_HANDOFF'
 $pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
}
$pub.publication='PUBLISHED';$pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python work/checkpoint-w2x-customer-list-refresh-focus.py
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
python work/reconcile-w2x-current-continuation.py
if($LASTEXITCODE){throw 'MANIFEST_FAILED'}
