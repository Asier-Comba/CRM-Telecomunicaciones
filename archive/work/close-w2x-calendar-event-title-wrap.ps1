$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-calendar-event-title-wrap';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_CONTROLS';session=51709}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not(Test-Path ('work/'+$prefix+'-build-exit.txt'))){if($watch.Elapsed.TotalMinutes -gt 30){throw 'NO_TERMINAL_CONTROLS'};Start-Sleep -Seconds 5}
python work/preflight-unit93.py
if($LASTEXITCODE){throw 'PREFLIGHT_FAILED_PRESERVE_NO_RETRY'}
node work/crm-w2x-document-upload-uncertain/scripts/product/build-release-queue.mjs --check *> ('work/'+$prefix+'-queue.txt')
if($LASTEXITCODE){throw 'QUEUE_FAILED'}
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'fix(calendar): wrap complete event titles inside agenda cards'
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
HANDOFF W2-X93 — Agenda: títulos completos dentro de las tarjetas.

Fuente $sha; árbol $tree; rama $($cp.branch); padre $($cp.base); CLAIM6255765905. Propios $($cp.browser_summary), seis casos nuevos y66 regresiones de Hoy, filtros, selección, intención incierta y título compartido de Cartera. Build66, lint con avisos preservados, scan, diff, cola y bundle verificado. Ningún PASS del padre o de otra rama se hereda.

Defecto medido antes de editar: título sintético160 sin espacios a390 daba tarjeta derecha1114,40625 dentro de sección derecha366; ancho de documento390 ocultaba el recorte. Ordinario derecha349. Solo dos clases del botón de evento existente: mínimo0 y envoltura de título no compacto. Mismos textos, hora, colores, callbacks y filtros; representación compacta mantiene altura48/truncado/title. Extensión optativa del fixture Calendar existente por fragmento URL, sin otro servidor ni recurso.

Seis geometrías finales comprueban tarjeta/texto dentro de Agenda y el evento de próximas citas a390/768/1440. Apertura del detalle real con título/empresa y cierre nativo pasan. Doce capturas realmente vistas: Agenda y detalle, largo/ordinario en las tres anchuras. Próximas citas en390 y1440 queda parcialmente fuera del primer cuadro: su geometría es evidencia DOM, sin afirmar imagen completa. No aceptación general del calendario, roles, accesibilidad o táctil.

Fallos conservados separados: dos queries no servidas por fixture antes de React; dos selectores ambiguos entre Agenda y próximas citas; intento válido de geometría con un fallo real del producto y otro por nombre de cierre incorrecto en test. Control ordinario corregido en el mismo padre:1PASS12s. Corrupción de texto de fixture por lectura Windows corregida desde bytes UTF8 del padre, snapshots preservados. Se corrigieron navegación/alcance/nombre, sin borrar aserciones; no presentar esos errores como causa del producto ni convertir el intento en1FAIL1PASS.

Banco de presentación React/Tailwind con HTTP y datos sintéticos, sin atravesar repositorio ni parsers de calendario. Regresiones contextuales sí ejercitan repositorios/comandos simulados; sin datos reales. AuthDB/JWT/RLS/SQL/calendario integrado/modelo vivoNOT_RUN, API0, sin ausencia/quiescencia/reinicio/handler/full23. F736/B9 y demás fallos históricos conservan su causa desconocida.

2007/source86 PASS55,8min publicado;2043/source88 en curso una vez, sesión53189 tras espera93361 agotada antes de dispatch (evidencia conservada).2109/source92 en cola93887 después de2043terminal/PUBLISHED/PASS. Ninguna acredita fuente93. Matriz342/31PARTIAL/311sinreconciliar/0READY, cincoHIGH y W4 pendientes, IA comercial writesOFF, issue10OPEN, releaseNOT_ACCEPTED. Sin cambios a main, ramas principales/ajenas/congeladas, W3/W4/W5, recurso nativo o producción. Consumo principal requiere ACK exacto. Continúa otra unidad útil independiente tras checkpoint.
"@
foreach($n in @(67,153,38,142)){
 $c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body}
 $pub.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$pub.publication='PARTIAL_HANDOFF'
 $pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
}
$pub.publication='PUBLISHED';$pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python work/checkpoint-w2x-calendar-event-title-wrap.py
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
python work/reconcile-w2x-current-continuation.py
if($LASTEXITCODE){throw 'MANIFEST_FAILED'}
