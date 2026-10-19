$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-sim-identifier-recovery-close';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=9109}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not(Test-Path ('work/'+$prefix+'-build-exit.txt'))){if($watch.Elapsed.TotalMinutes -gt 45){throw 'NO_TERMINAL_CONTROLS'};Start-Sleep -Seconds 5}
python ('work/checkpoint-'+$prefix+'.py') preflight
if($LASTEXITCODE){throw 'CONTROLS_OR_FINGERPRINT_FAILURE_PRESERVED'}
node work/crm-w2x-document-upload-uncertain/scripts/product/build-release-queue.mjs --check *> ('work/'+$prefix+'-queue.txt')
if($LASTEXITCODE){throw 'QUEUE_FAILED'}
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'fix(sims): preserve identifier operation recovery on panel close'
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
$body='HANDOFF W2-X90 — Identificadores de SIM/eSIM: cierre durante creación,retirada y recuperación.'+$nl+'Fuente '+$sha+'; árbol '+$tree+'; rama '+$cp.branch+'; padre '+$cp.base+'; CLAIM '+$cp.claim+'. Controles propios: '+$cp.browser_summary+' (48 casos pertinentes y189 regresiones),build66,lint,scan,diff,cola ybundle verificado. Funcionales:NOT_RUN_EXISTING_CONTROL_POLICY_CONSUMPTION. No resultado heredado de metadata89 o fuentes anteriores.'+$nl+'Original conservado:12FAIL/4PASS2,9min,log/exit/banco48 y16observaciones;crear/retirar ICCIDfísico/EIDeSIM,incertidumbre/lectura fallida/403 con X habilitada o sin efecto;cancelación normal positiva. Se refinó solo el fixture eSIM:su ICCID101 ya proyectado por sim.get figura ahora como compañero en identifier.list,con IDs ordenados y DTO coherente. No aserción relajada;no fue causa de los12fallos de UI. Producto intacto en la comprobación complementaria:uncierto1FAIL/revisión1PASS23,4s. Original yrefinamiento separados yreconstruibles.'+$nl+'El panel consume closeBlocked existente en closeDisabled y su guardia,conservando setRaw vacío al salir. No cambio de hook,Drawer,ConfirmDialog,locked,contratos,servicios,backend,SQL o reglas de autorización. Incertidumbre repite la misma orden y un efecto sintético;recibo+503 solo repite sim.get,un comando/dos lecturas posteriores;403 permite salir,reabrir vacío ynueva confirmación con nuevo command_id. Retirada conserva id/expected_version1 yrecibo2;no aceptación CAS/SQL real. Tras recuperar,se vuelve a consultar la lista enmascarada,con estado retirado ysin volver a ofrecer esa retirada. No valor completo en texto oinputs renderizados al salir;no borrado de memoria,cifrado o privacidad real.'+$nl+'32capturas realmente vistas:24recuperaciones críticas (ambas acciones/tipos y3anchos),4denegaciones390 y4revisiones1440. Alcance visual parcial,controles de recuperación y formularios/máscaras declaradas;padre bajo confirmación porDOM,campos/footers según viewport detallados en documento. HTTP/DTO/efectos sintéticos con componentes/repositorio/parsers reales. AuthDB/JWT/RLS/SQL/Nextintegrado/modelo vivoNOT_RUN/API0. Sin ausencia/quiescencia/reinicio/handler/full23.'+$nl+'Global1968/source84 cerrado con sus cinco discrepancias conocidas;2007/source86 activo41016 y2043/source88 waiter93361 mantienen pines yno acreditan90. No añadir otrofull solicitado hasta revisar coalescencia/backlog;2091 solo candidatoDEFERRED si se prepara. Matriz342/31PARTIAL/311sinreconciliar/0READY,HIGH5/W4 pendientes,IA writesOFF,issue10OPEN,releaseNOT_ACCEPTED. F736/B9 y evidencias anteriores preservadas. Main,PR38/142/153 yfuentesW3/W4/W5/recurso intactos;consumo principal pendiente de ACK exacto. Continuar defecto comercial reproducido en Cartera uotra unidad útil.'

foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}









