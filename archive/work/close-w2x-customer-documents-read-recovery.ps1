$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-customer-documents-read-recovery';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_CONTROLS';session=35238}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not(Test-Path ('work/'+$prefix+'-build-exit.txt'))){if($watch.Elapsed.TotalMinutes -gt 30){throw 'NO_TERMINAL_CONTROLS'};Start-Sleep -Seconds 5}
python work/preflight-unit111.py
if($LASTEXITCODE){throw 'PREFLIGHT_FAILED_PRESERVE_NO_RETRY'}
node work/crm-w2x-document-upload-uncertain/scripts/product/build-release-queue.mjs --check *> ('work/'+$prefix+'-queue.txt')
if($LASTEXITCODE){throw 'QUEUE_FAILED'}
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'fix(documents): recover destination reads with safe navigation and focus'
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
HANDOFF W2-X111 — recuperación de destinos enDocumentos delcliente.

Fuente $sha;árbol $tree;rama $($cp.branch);padre $($cp.base);CLAIM6257065100. Propios $($cp.browser_summary),compilación66,lint0errores/3avisos previos,scan,cola ycopia Git verificada.12nuevos retornoéxito/retornodenegado/primererror→reintento/pendientesiguiente×3907681440 y12contextuales de contratos/etiquetas/denegaciones. Sin resultados heredados.

Causal3903FAIL1PASS58,8s:tras403siguiente Anterior bloqueado en dos preparados de retorno;reintento inicial elimina botón yresultado quedaBODY. Pendientesiguiente ya bloqueaba yseleccionaba correctamente. Conservados originales/banco/estados/capturas;otrosanchos solo verificados finalmente. CustomerDocuments permite Anterior concursor/error,mantiene bloqueo sincursor/cargando,yal volver limpia selección/error yconsulta normalmente. Refs nativas+intención orientan selector/alerta solo si foco sigueBODY;tipo elegido retira intención. Sin nuevasprimitivas/servicios/fixtures/contratos,uploads/borrados/commands.

Banco final idéntico alcausal. service.listcustomer_id/limit20/cursor exactos;document.list inicialcliente yservicio1/21 solo tras elegir explícitamente destino;denegación no abreotro. Sin cuerpo privado/comandos/errores/operaciones inesperadas enprimarios.12fotos actuales realmente vistas/hashregistrados. observations.stages conserva intermedios;foto final porcaso,no porfase. Foco antesdeelegir/clave de destinoDOM;imágenes finales selector/destino/panelvacío oalerta. Pendiente no acredita foco nuevo,primererrorantesdeacción noautofocus.

Componentes/repositorios/parsers conHTTP sintético. No archivos/datosreales/transferencias niAuthDB/JWT/RLS/membresía física/Nextintegrado/modelo vivoNOT_RUN/API0;no todos los destinos/roles/a11y/táctil,ausencia/quiescencia/reinicio/handler/full23. F736/B9 yoriginales intactos. Matriz342/34PARTIAL/308sinreconciliar/0READY;HIGH5/W4pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED.

FIFO2139source97/2172source102/2214source106 conserva pines/sesiones yno incluye108/109/111. No nuevaejecuciónglobal de111solapada niPASSheredado. Principales/ajenas/congeladas,W3/W4/W5/recurso yproducción intactos;consumo principalrequiereACKexacto. Guardias/diff/cola/scan/bundleverificados;seguirunidadcomercial útil trascheckpoint.
"@
foreach($n in @(67,153,38,142)){
 $c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body}
 $pub.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$pub.publication='PARTIAL_HANDOFF'
 $pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
}
$pub.publication='PUBLISHED';$pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python work/checkpoint-w2x-customer-documents-read-recovery.py
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
python work/reconcile-w2x-current-continuation.py
if($LASTEXITCODE){throw 'MANIFEST_FAILED'}
