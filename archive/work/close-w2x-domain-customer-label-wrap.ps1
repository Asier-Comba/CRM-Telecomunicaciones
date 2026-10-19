$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-domain-customer-label-wrap';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_CONTROLS';session=84090}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not(Test-Path ('work/'+$prefix+'-build-exit.txt'))){if($watch.Elapsed.TotalMinutes -gt 30){throw 'NO_TERMINAL_CONTROLS'};Start-Sleep -Seconds 5}
python work/preflight-unit103.py
if($LASTEXITCODE){throw 'PREFLIGHT_FAILED_PRESERVE_NO_RETRY'}
node work/crm-w2x-document-upload-uncertain/scripts/product/build-release-queue.mjs --check *> ('work/'+$prefix+'-queue.txt')
if($LASTEXITCODE){throw 'QUEUE_FAILED'}
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'fix(customers): wrap global customer labels without losing service context'
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
HANDOFF W2-X103 — nombre completo de cliente y operador visibles en Servicios globales.

Fuente $sha; árbol $tree; rama $($cp.branch); padre $($cp.base); CLAIM6256563598. Propios $($cp.browser_summary), compilación66, lint0errores/3avisos conservados, scan, cola y copia Git verificada. 9 nuevos casos globales,21 previos de Servicios y60 contextuales de Incidencias/SIM/Contratos. No resultados heredados.

Causal3FAIL3PASS38,5s sobre producto padre: nombre válido160 sin espacios amplía tabla2229,953125 dentro de1198 ycelda cliente1285,953125, desplazando operador a1280/1440/1920. Ordinarios pasan. Una clase overflow-wrap:anywhere en NamedCustomer existente conserva texto completo,href,permisos,repositorio yfallback. Fixture existente con opción global=1, sin otro servidor ni cambio del modo anterior.

Nueve cuadros realmente vistos long/ordinary/denied×tres anchos, hashes ygeometrías conservados. Tabla1198/celda larga252,859375/operador visible. HTTP403 de customer.list muestra Cliente no disponible y conserva fila de servicio autorizada, sin cuerpo privado ni nombre. Banco final idéntico al causal; primarios sin comandos/errores/operaciones inesperadas.

Componentes/repository/parsers reales con HTTP sintético. AuthDB/JWT/RLS/membresía real/navegaciónNext integrada/modelo vivo NOT_RUN/API0. No todos los dominios/filas/roles ni a11y completa, ausencia/quiescencia/reinicio/handler/full23. F736/B9 conservados. Los81 y2172 de source102 b842 no contienen esta corrección/banco, aunque sus controles pasen; el defecto queda anotado en su checkpoint. No retroactividad.

Matriz342/33PARTIAL/309sinreconciliar/0READY sin promociones. FIFO2109source92/2139source97/2172source102 conservado sin duplicar ni cancelar controles. CincoHIGH/W4 pendientes,IA comercial writesOFF,issue10OPEN,releaseNOT_ACCEPTED. Ramas principales/ajenas/congeladas,W3/W4/W5/recurso yproducción intactos. Consumo principal requiere ACK exacto. Continuar unidad comercial independiente tras checkpoint.
"@
foreach($n in @(67,153,38,142)){
 $c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body}
 $pub.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$pub.publication='PARTIAL_HANDOFF'
 $pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
}
$pub.publication='PUBLISHED';$pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python work/checkpoint-w2x-domain-customer-label-wrap.py
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
python work/reconcile-w2x-current-continuation.py
if($LASTEXITCODE){throw 'MANIFEST_FAILED'}
