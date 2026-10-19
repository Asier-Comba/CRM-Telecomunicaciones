$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-billing-draft-receipt';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=76492}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'test(billing): cover draft create and update receipt recovery'
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
$body='HANDOFF W2-X49: recuperación comercial al crear/editar borrador. Fuente '+$sha+',árbol '+$tree+',rama '+$cp.branch+',base '+$cp.base+'. CLAIM6251092558. Solo test/doc;producto intacto.'+$nl+'Banco propio18/18PASS44.7s:2acciones×recibo inválido/403/válido×390/768/1440. JSONtruncado/command_idajeno/sobre extra no acreditan éxito:editor yvalores conservados,campos/refresco bloqueados,Cerrar/Escape no descartan intención yno comienza readback antes de recibo válido. Reintento exacto conserva operación/command_id/payload/expected_version deupdate. Positivo normal una petición yreadbacktotal484;denegación403conserva edición,cierre disponible,sin reintento de intención incierta. Ningún invoice.issue. HTTP controlado,accepted es estado de respuesta fixture,no efectoSQL/ausencia/idempotenciaDB/Auth.'+$nl+'Build66/lint0errores3warnings/scan/diff/cola/bundle propios. Siete capturas realmente vistas:incierto create3anchos/update3901440 superior conerror/retry/camposbloqueados;denegadoscreate390/update1440 inferior conedición/importes/acciones,error fuera viewport. Visual parcial,actual X parece activa aunque handler impide cierre;próxima unidad UX conreproducción propia,sin cambiar estafuente.'+$nl+'AuthDB/JWT/RLS/Next integrado/modelo vivoNOT_RUN/API0. Global1416deBF72cerradoPASS propio,no herencia aSHA nuevo;cola342/26PARTIAL/316sinreconciliar/0READY. HIGH5/W4/IAwritesOFF/issue10OPEN/releaseNOT_ACCEPTED. OriginalesF736/B9/981/1266yfixture45/harness48 intactos. Fuentes ajenas/PR38/142/153/main/W3/W4/W5/recurso sin cambios. Siguiente:alinear cierre visual del editor conbloqueo existente,sin tocarcomandos/pending.'
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}
