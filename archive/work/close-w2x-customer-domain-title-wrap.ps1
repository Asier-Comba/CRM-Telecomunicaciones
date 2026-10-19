$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-customer-domain-title-wrap';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_CONTROLS';session=38603}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not(Test-Path ('work/'+$prefix+'-build-exit.txt'))){if($watch.Elapsed.TotalMinutes -gt 30){throw 'NO_TERMINAL_CONTROLS'};Start-Sleep -Seconds 5}
python work/preflight-unit94.py
if($LASTEXITCODE){throw 'PREFLIGHT_FAILED_PRESERVE_NO_RETRY'}
node work/crm-w2x-document-upload-uncertain/scripts/product/build-release-queue.mjs --check *> ('work/'+$prefix+'-queue.txt')
if($LASTEXITCODE){throw 'QUEUE_FAILED'}
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'fix(customers): wrap full service names inside collection cards'
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
HANDOFF W2-X94 — Cliente: nombre completo del servicio dentro de la tarjeta.

Fuente $sha; árbol $tree; rama $($cp.branch); padre $($cp.base); CLAIM6255882075. Propios $($cp.browser_summary): nueve casos primarios y66 regresiones de foco/paginación/retirada de colección, incidencias, SIM y contratos. Build66, lint con avisos preservados, scan, diff, cola y bundle verificado. No se heredan72 de93 ni resultados de otras fuentes.

Causal propio1FAIL1PASS21,8s. Nombre de servicio160 en390: h3 ancho308/contenido1684, tarjeta340/1700, enlace hasta1725,390625 fuera del borde365; documento390 pese al recorte. Ordinario:308/308 y enlace196,640625. Fuente intacta hasta medición; banco final idéntico al causal. Sin comandos, errores de página ni operaciones inesperadas en primarios.

Una sola clase de h3 existente: mínimo0, máximo100% y envoltura completa. Sin cambiar nombre, href, tabla, columnas, umbrales responsive, consultas, cursores, filtros, permisos, callbacks o servicios. Las tarjetas390/768 conservan nombre completo y enlace exacto;1440 mantiene tabla con desplazamiento horizontal intencional, sin afirmar que todas las columnas quepan.403no deja filas/nombre/cuerpo privado ni lecturas dependientes. No se afirma privacidad/AuthDB real por esa prueba.

Nueve capturas realmente vistas: largo/ordinario/denegado390/768/1440. Solo alcance identificado, no todos los dominios, roles, accesibilidad o táctil. Se reutiliza servidor CustomerDomain existente, componentes/repositorio/parsers reales con HTTP controlado. Contextuales ejercitan comandos/efectos sintéticos, no datos reales. AuthDB/JWT/RLS/SQL/Nextintegrado/modelo vivoNOT_RUN/API0; sin ausencia/quiescencia/reinicio/handler/full23. F736/B9 y demás fallos históricos mantienen causa y evidencia; no se les atribuye esta corrección.

2007/source86 PASS55,8min publicado;2043/source88 en curso una vez53189 y2109/source92 en cola93887 tras2043terminal/PUBLISHED/PASS. No acreditan fuente94. Matriz342/31PARTIAL/311sinreconciliar/0READY; cincoHIGH/W4 pendientes, IA comercial writesOFF, issue10OPEN, releaseNOT_ACCEPTED. Sin cambios a main, ramas principales/ajenas/congeladas, W3/W4/W5, recurso nativo o producción. Consumo principal pendiente de ACK exacto. Continuar siguiente unidad comercial útil después del checkpoint.
"@
foreach($n in @(67,153,38,142)){
 $c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body}
 $pub.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$pub.publication='PARTIAL_HANDOFF'
 $pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
}
$pub.publication='PUBLISHED';$pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python work/checkpoint-w2x-customer-domain-title-wrap.py
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
python work/reconcile-w2x-current-continuation.py
if($LASTEXITCODE){throw 'MANIFEST_FAILED'}
