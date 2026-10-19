$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-collection-page-error-back';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_CONTROLS';session=38232}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not(Test-Path ('work/'+$prefix+'-build-exit.txt'))){if($watch.Elapsed.TotalMinutes -gt 30){throw 'NO_TERMINAL_CONTROLS'};Start-Sleep -Seconds 5}
python work/preflight-unit108.py
if($LASTEXITCODE){throw 'PREFLIGHT_FAILED_PRESERVE_NO_RETRY'}
node work/crm-w2x-document-upload-uncertain/scripts/product/build-release-queue.mjs --check *> ('work/'+$prefix+'-queue.txt')
if($LASTEXITCODE){throw 'QUEUE_FAILED'}
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'fix(customers): allow safe previous page recovery after read errors'
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
HANDOFF W2-X108 — retorno a página anterior tras error en Servicios yComunicaciones.

Fuente $sha; árbol $tree; rama $($cp.branch); padre $($cp.base); CLAIM6256891004. Propios $($cp.browser_summary),compilación66,lint0errores/3avisos previos,scan,cola ycopia Git verificada.18nuevos (dos recorridos×error siguiente/primererror/pendiente×3907681440) y27contextuales recién ejecutados. No resultados heredados.

Causal390sobre107consrcidéntico106:2FAIL4PASS46,2s.403de página2 dejaba Anterior deshabilitado en ambos recorridos;primererror sin cursor ypendiente ya bloqueaban correctamente. Dos condiciones disabled ahora distinguenerror de carga. Se conserva bloqueo mientrascarga/sincursor,yse permite retorno con cursor existente trasfallo. Reutiliza manejadores,refs/cursor/cancelación/repositorios,ninguna nueva primitiva/hook/servicio/contrato.

Anterior conEnter dispara lectura normal nueva sin after_id para página1,no caché/bypass/commands;mantiene consultaslimit20/customer_id/sort cuandoaplican ypermisos existentes. Banco final idéntico al causal. Resultadoconfoco,botones vuelvenabloquear durante espera,cursor yterminales normales. Primarios sin comandos/errores de página/operaciones inesperadas/cuerpo privado.

18capturas actuales realmente vistas con hashes. Retorno fotografiado después de recuperar página1,cerca del pie porfoco,no20filas visuales. Estado pendiente intermedio/botón bloqueadoDOM,no unafoto porfase. Primererror no acredita foco inicial. Otrosanchos solo verificados finalmente,no causalprevia allí. No todas laspáginas/roles/a11y/táctil.

Componentes/repositorios/parsers reales con HTTP sintético. AuthDB/JWT/RLS/membresía física/Nextintegrado/modelo vivoNOT_RUN/API0;no ausencia/quiescencia/reinicio/handler/full23. F736/B9 yoriginales intactos. Matriz342/34PARTIAL/308sinreconciliar/0READY,PAR056con106nohereda108. FIFO2139source97/2172source102/2214source106wait16884 intacto;2214noincluye108ni18nuevos. HIGH5/W4 pendientes,IA writesOFF,issue10OPEN,releaseNOT_ACCEPTED. Ramas principales/ajenas/congeladas,W3/W4/W5/recurso yproducción intactos;consumo principal requiereACK exacto. Continuarunidad comercial útil conCLAIM ycheckpoint.
"@
foreach($n in @(67,153,38,142)){
 $c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body}
 $pub.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$pub.publication='PARTIAL_HANDOFF'
 $pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
}
$pub.publication='PUBLISHED';$pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python work/checkpoint-w2x-collection-page-error-back.py
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
python work/reconcile-w2x-current-continuation.py
if($LASTEXITCODE){throw 'MANIFEST_FAILED'}
