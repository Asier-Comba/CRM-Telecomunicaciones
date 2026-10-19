$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-domain-retry-focus';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_CONTROLS';session=84214}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not(Test-Path ('work/'+$prefix+'-build-exit.txt'))){if($watch.Elapsed.TotalMinutes -gt 30){throw 'NO_TERMINAL_CONTROLS'};Start-Sleep -Seconds 5}
python work/preflight-unit105.py
if($LASTEXITCODE){throw 'PREFLIGHT_FAILED_PRESERVE_NO_RETRY'}
node work/crm-w2x-document-upload-uncertain/scripts/product/build-release-queue.mjs --check *> ('work/'+$prefix+'-queue.txt')
if($LASTEXITCODE){throw 'QUEUE_FAILED'}
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'fix(customers): restore retry outcome focus in service collections'
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
HANDOFF W2-X105 — foco de teclado tras reintentar lectura de Servicios.

Fuente $sha; árbol $tree; rama $($cp.branch); padre $($cp.base); CLAIM6256746412. Propios $($cp.browser_summary), compilación66,lint0errores/3avisos conservados,scan,cola ycopia Git verificada.12casos nuevos de éxito/error/control elegido/vacío×3907681440;99contextuales recién ejecutados,sin heredar controles del padre.

Causal390:3FAIL1PASS48,4s sobrea146. Al desaparecer Reintentar,el foco quedabaBODY después de éxito/nuevo403/vacío;Actualizar elegido durante la espera ya mantenía foco. No reproducción causal previa en otros anchos:verificación final propia allí. Una sola señal restorePageFocus.current=true en el manejador existente reutiliza refs/efecto/protección de control elegido/cancelación;sin nueva primitiva/hook/consulta/contrato.

Banco final idéntico al causal. Dos lecturas service.list exactas por caso,primera403/segunda retenida;estado oalerta reciben foco,Actualizar elegido se conserva. Sin cuerpo privado,comandos,errores de página ni operaciones inesperadas en primarios.12capturas realmente vistas con hashes;alcance foco/estado,footer puede desplazar scroll,no todas las filas/campos/etiquetas dependientes asentadas nia11y completa.

Componentes/repositorio/parsers con HTTP sintético. AuthDB/JWT/RLS/membresía física/Next integrado/modelo vivoNOT_RUN/API0;sin ausencia/quiescencia/reinicio/handler/full23. F736/B9 yoriginales intactos.2109source92PASS43,9min publicado;2139source97ejecución26311 y2172source102wait76705 conservanFIFO/pines,no acreditan105.

Matriz342/33PARTIAL/309sinreconciliar/0READY intacta,HIGH5/W4 pendientes,IA writesOFF,issue10OPEN,releaseNOT_ACCEPTED. Ramas principales/ajenas/congeladas,W3/W4/W5/recurso yproducción intactos;consumo principal requiere ACK exacto. Continuar otra unidad comercial independiente con CLAIM ycheckpoint íntegro.
"@
foreach($n in @(67,153,38,142)){
 $c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body}
 $pub.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$pub.publication='PARTIAL_HANDOFF'
 $pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
}
$pub.publication='PUBLISHED';$pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python work/checkpoint-w2x-domain-retry-focus.py
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
python work/reconcile-w2x-current-continuation.py
if($LASTEXITCODE){throw 'MANIFEST_FAILED'}
