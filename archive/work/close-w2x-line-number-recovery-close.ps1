$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-line-number-recovery-close';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=38947}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not(Test-Path ('work/'+$prefix+'-build-corrected-exit.txt'))){if($watch.Elapsed.TotalMinutes -gt 45){throw 'NO_TERMINAL_CONTROLS'};Start-Sleep -Seconds 5}
python ('work/checkpoint-'+$prefix+'.py') preflight
if($LASTEXITCODE){throw 'CONTROLS_OR_FINGERPRINT_FAILURE_PRESERVED'}
node work/crm-w2x-document-upload-uncertain/scripts/product/build-release-queue.mjs --check *> ('work/'+$prefix+'-queue.txt')
if($LASTEXITCODE){throw 'QUEUE_FAILED'}
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'fix(portabilities): recover protected number panel close safely'
if($LASTEXITCODE){throw 'COMMIT_FAILED'}
$sha=(git -C $repo rev-parse HEAD).Trim();$tree=(git -C $repo rev-parse 'HEAD^{tree}').Trim()
$publication=@{sha=$sha;tree=$tree;publication='LOCAL_COMMIT_PUSH_PENDING';handoffs=@()}
$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
git -C $repo push origin ('HEAD:refs/heads/'+$cp.branch)
if($LASTEXITCODE){throw 'PUSH_UNCERTAIN_INSPECT_NO_RETRY'}
$bundle=Join-Path $PSScriptRoot ($prefix+'.bundle');git -C $repo bundle create $bundle HEAD
if($LASTEXITCODE){throw 'BUNDLE_FAILED'}
git -C $repo bundle verify $bundle
if($LASTEXITCODE){throw 'BUNDLE_VERIFY_FAILED'}
. ./work/CrmGitHub.ps1
$nl=[string][char]10+[char]10
$body='HANDOFF W2-X88 — Número protegido de línea: cierre y limpieza de formulario.'+$nl+'Fuente '+$sha+'; árbol '+$tree+'; rama '+$cp.branch+'; padre '+$cp.base+'; CLAIM '+$cp.claim+'. Controles propios: '+$cp.browser_summary+' (12 casos pertinentes y177 regresiones), build66, lint, scan, diff, cola y bundle verificado. Funcionales: NOT_RUN_EXISTING_CONTROL_POLICY_CONSUMPTION.'+$nl+'Causal inicial conservado: dos fallos y un positivo en30,6s, log/exit/banco y3observaciones. Incertidumbre dejaba X habilitada; tras403 y cancelar, X no cerraba. La cancelación normal pasaba. El panel usa closeBlocked existente para closeDisabled y su guardia; conserva setRaw vacío al cierre permitido. No cambia hook, locked, parsers, órdenes, backend o SQL; reversión exacta al padre y banco final idéntico al causal.'+$nl+'Primer control186:183PASS/3FAIL6,2min,exit1 ytodos los auxiliares conservados. Los3inciertos mostraban X/Cancelar bloqueados pero Escape retiraba los tres paneles. Después de terminar,sin cancelar,se restauró temporalmente el producto87 para el contraste:Escape1FAIL(tres paneles a cero),Tab1PASS(tres permanecen),25,3s,un comando/un efecto sintético en ambos. Preload anterior:NOT_RUN por importación del banco;corregida solo a la mismaCLI15 y con outputDir distinto. No es fallo causal de producto. La corrección añade numberEntry a las condiciones de cierre del padre,además del guard del hijo. No cambia Drawer/ConfirmDialog. Se añaden3EscapeReview:primer Escape cancela solo revisión,segundo solo hijo,padre permanece yreabre vacío. Banco original reconstruible y aserciones intactas. El189 actual es nuevo yno hereda183. Muestras defaultPrevented son de captura/microtarea,no traza completa ni evidencia usada para la causa.'+$nl+'Doce casos a390/768/1440. Incertidumbre conserva el valor y reintenta la misma orden, con un efecto sintético; denegación permite cerrar y reabrir vacío, exige nueva confirmación y nuevo command_id, efecto0 antes y1 después; cancelar revisión no envía orden y reabre vacío. Tras éxito, el padre permanece, la selección no se cambia automáticamente y se ofrece el nuevo número enmascarado. No se crea una portabilidad ni se consulta identifier.get. El valor completo no queda en texto o inputs renderizados tras salir. Solo teléfono sintético reservado. No acredita borrado de memoria, cifrado, almacenamiento protegido o autoridad real. El callback de refresco es síncrono: no se inventa una recuperación interna por503.'+$nl+'Doce capturas revisadas y alcance visual parcial documentado. HTTP/DTO y efectos sintéticos con componentes/repositorio/parsers reales. AuthDB/JWT/RLS/SQL/Nextintegrado/modelo vivo NOT_RUN;API0. Sin ausencia/quiescencia/reinicio/handler/full23 ni aceptación W4. Global1968/source84 y waiter2007/source86 conservan sus pines y no acreditan87/88. Coalescer siguiente full desde fuente propia cualificada, sin duplicar ni cancelar los controles en curso. Matriz342/31PARTIAL/311sinreconciliar/0READY;cinco HIGH y W4 pendientes,IA writes OFF,issue10 OPEN,release NOT_ACCEPTED. F736/B9 y evidencias anteriores preservadas. Consumo principal pendiente de ACK exacto;ramas y fuentes ajenas intactas.'

foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}









