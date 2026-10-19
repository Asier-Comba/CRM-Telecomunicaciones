$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-domain-operator-label-wrap';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_CONTROLS';session=56302}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not(Test-Path ('work/'+$prefix+'-build-exit.txt'))){if($watch.Elapsed.TotalMinutes -gt 30){throw 'NO_TERMINAL_CONTROLS'};Start-Sleep -Seconds 5}
python work/preflight-unit104.py
if($LASTEXITCODE){throw 'PREFLIGHT_FAILED_PRESERVE_NO_RETRY'}
node work/crm-w2x-document-upload-uncertain/scripts/product/build-release-queue.mjs --check *> ('work/'+$prefix+'-queue.txt')
if($LASTEXITCODE){throw 'QUEUE_FAILED'}
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'fix(customers): wrap operator labels while preserving service context'
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
HANDOFF W2-X104 — operador completo en Servicios globales sin desplazar el resto de la fila.

Fuente $sha; árbol $tree; rama $($cp.branch); padre $($cp.base); CLAIM6256685133. Propios $($cp.browser_summary), compilación66, lint0errores/3avisos previos, scan, cola y copia Git verificada. Nueve casos nuevos de operador,nueve anteriores de cliente global,21 previos de Servicios y60contextuales de Incidencias/SIM/Contratos recién ejecutados. Sin heredar90 del padre ni PASSglobal.

Causal3FAIL6PASS1,0min sobre producto padre: operador válido160 sin espacios hace tabla2235,296875 dentro de1198 ycelda1291,296875 a1280/1440/1920. Ordinarios ydenegados pasan. NamedOperator incorpora solo span nativo con envoltura alrededor del texto existente; efectos,consultas,contexto,permisos,fallback yprops idénticos. Sin otra primitiva/pantalla/servidor.

Nueve capturas actuales realmente vistas long/ordinary/denied×tres anchos, hashes ygeometrías en checkpoint. Nombre completo,cliente yoperador visibles.403operator.get conserva fila autorizada yOperador no disponible,sin nombre privado/cuerpo de error. Banco final idéntico al causal. Primarios sin comandos/errores/operaciones inesperadas.

Componentes/repositorio/parsers con HTTP sintético. AuthDB/JWT/RLS/membresía física/navegaciónNext integrada/modelo vivo NOT_RUN/API0;no todas las entidades/filas/roles,a11y completa,ausencia/quiescencia/reinicio/handler/full23. F736/B9 yfallos anteriores intactos. Guard auxiliar lector de coordinación falló antes de CLAIM por arrays anidados;corregido,comentarios guardados. Auxiliar regex de cuerpo falló antes de PATCH,cuerpo exacto verificado;sin duplicar CLAIM/pruebas por ello.

2109source92PASS43,9min publicado;2139source97ejecución única26311;2172source102wait76705,FIFO intacto. No acreditan104. Matriz342/33PARTIAL/309sinreconciliar/0READY;HIGH5/W4 pendientes;IA writesOFF;issue10OPEN;releaseNOT_ACCEPTED. Ramas ajenas/principales/congeladas,W3/W4/W5/recurso yproducción intactos. Handoff para consumo principal con ACK exacto. Continuar siguiente defecto comercial reproducido ycheckpoint íntegro.
"@
foreach($n in @(67,153,38,142)){
 $c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body}
 $pub.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$pub.publication='PARTIAL_HANDOFF'
 $pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
}
$pub.publication='PUBLISHED';$pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python work/checkpoint-w2x-domain-operator-label-wrap.py
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
python work/reconcile-w2x-current-continuation.py
if($LASTEXITCODE){throw 'MANIFEST_FAILED'}
