$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-customer-list-page-focus';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_CONTROLS';session=9111}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not(Test-Path ('work/'+$prefix+'-build-exit.txt'))){if($watch.Elapsed.TotalMinutes -gt 30){throw 'NO_TERMINAL_CONTROLS'};Start-Sleep -Seconds 5}
python work/preflight-unit99.py
if($LASTEXITCODE){throw 'PREFLIGHT_FAILED_PRESERVE_NO_RETRY'}
node work/crm-w2x-document-upload-uncertain/scripts/product/build-release-queue.mjs --check *> ('work/'+$prefix+'-queue.txt')
if($LASTEXITCODE){throw 'QUEUE_FAILED'}
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'fix(customers): restore pagination outcome focus without stealing user intent'
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
HANDOFF W2-X99 — Clientes: orientación por teclado al terminar la paginación.

Fuente $sha; árbol $tree; rama $($cp.branch); padre $($cp.base); CLAIM6256232595. Propios $($cp.browser_summary):27 casos relacionados con inventario y51 contextuales. Compilación66, analizador con tres avisos previos conservados, scan, diferencias, cola y copia Git verificada. Padre98 solo añade evidencia y conserva src/tests de97; ningún66 u otro PASS se hereda.

Causal2FAIL1PASS49,6s sobre producto intacto: Enter enPágina siguiente con respuesta retenida deja BODY como foco al llegar página válida o403. Resultado/alerta ya visibles; comandos y errores de página vacíos. Control positivo elige Nuevo cliente durante la espera y conserva BUTTON. Se mantienen logs, observaciones, capturas, banco y causas; no fallo de backend/roles real.

Se consume el patrón de foco ya existente en CustomerDomainPages: intención solo siguiente/anterior, resultado/alerta enfocables y orientación al terminar si el foco continúa en el cuerpo. Elegir otro control se respeta. Filtrar/actualizar retira intención; las respuestas tardías siguen usando la retirada de petición existente. Referencia de presentación opcional ytabindex negativo, sin otra primitiva/API/servicio/consulta/permiso. Filtros desplegables97 preservados. Estado de página concuerda1empresa/20empresas.

Doce casos nuevos: éxito,403,foco elegido yfiltro que sustituye a página pendiente en390/768/1440. Se retiran filas durante espera, se recupera primera página con teclado tras denegación yse descarta fila antigua al filtrar,sin foco de paginación filtrado. DTO20+1/cursor válidos, sin comandos. Banco final idéntico al causal, ampliando ejecución a las demás anchuras ycasos previstos; no aserciones relajadas. Los15 controles anteriores de nombres/filtros y51 contextuales se ejecutan de nuevo en esta fuente.

Doce cuadros actuales realmente vistos: foco de estado/alerta,botón elegido yregistro filtrado. La recuperación a página1 tras error es evidenciaDOM posterior a la foto del error;en390 con filtros abiertos la fila filtrada queda debajo del cuadro. No aceptación de todos los campos/columnas/teclado de todos los módulos,roles,accesibilidad completa o táctil.

IntegratedCustomers/Customers/repository/parsers reales con HTTP sintético yRouter de prueba existente. AuthDB/JWT/RLS/roles/membresía/multiempresa física/navegaciónNext integrada/modelo vivoNOT_RUN/API0; sin ausencia/quiescencia/reinicio/handler/full23. No atribuir privacidad real al403 del fixture. F736/B9 y todos los originales conservan causa y alcance.

Matriz342/32PARTIAL/310sinreconciliar/0READY sin promociones;PAR046 conserva94 yPAR086 sus fuentes individuales.2007/source86 y2043/source88 publicados PASS55,8min/52min respectivamente;2109/source92 activo una vez93887 y2139/source97 waiter26311 conservanFIFO/pines yno acreditan99. CincoHIGH/W4 pendientes, IA comercial writesOFF,issue10OPEN,releaseNOT_ACCEPTED. Main,ramas principales/ajenas/congeladas,W3/W4/W5/recurso yproducción intactos;consumo principal requiere ACK exacto. Continuar otra unidad útil independiente tras checkpoint sin repetir verdes sin cambio.
"@
foreach($n in @(67,153,38,142)){
 $c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body}
 $pub.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$pub.publication='PARTIAL_HANDOFF'
 $pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
}
$pub.publication='PUBLISHED';$pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python work/checkpoint-w2x-customer-list-page-focus.py
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
python work/reconcile-w2x-current-continuation.py
if($LASTEXITCODE){throw 'MANIFEST_FAILED'}
