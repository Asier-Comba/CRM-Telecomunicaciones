$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-billing-draft-registered';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=15959}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'test(billing): keep registered draft recovery read-only'
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
$body='HANDOFF W2-X51:recuperación de lectura después de recibo válido de borrador. Fuente '+$sha+',árbol '+$tree+',rama '+$cp.branch+',base '+$cp.base+'. CLAIM6251201716. Solo test/doc,producto intacto.'+$nl+'Crear/actualizar×lectura malformada/clienteajeno/503×3anchos. Recibo válido retira comando pendiente;fallo lectura conserva aviso registrado/campos yXbloqueados,Consulta disponible,sinReintentarcomando. Escape no descarta. Consulta mismoid/versión/draft recupera detalle;timeline exactocommand/read/read,un solo comando. HTTPcontrolado no pruebaSQLpersistencia/efecto/ausencia/idempotenciaDB/Auth.'+$nl+'Original18:6FAIL/12PASS2.0min;error de mi fixture:invoice.id/customer_ideraniguales,lectura supuestamenteajena era válida yCRMlaaceptaba. No defecto deproducto. Originaltest/log/trazas intactos;solo rama wrong-customer refinada conUUIDextranjero explícito yaserción distinto. Solo6fallidos recheck6PASS17.3s;12verdes sin repetir,12+6complementarios,no18singlePASS. Producto intacto yrestotest idéntico verificados. Build66/lint0errores3warnings/scan/diff/cola/bundle propios.'+$nl+'Siete capturas realmente vistas:malformedcreate3anchos,clienteajeno create390/update1440,503update390/create1440;superior drawer conaviso/consulta/error/Xycamposbloqueados,conceptos/totales inferiores fuera viewport;visualparcial. AuthDB/JWT/RLS/Nextintegrado/modelovivoNOT_RUN/API0;global1434BC3separado,noherencia.'+$nl+'Cola342/26PARTIAL/316sinreconciliar/0READY,HIGH5/W4/IAwritesOFF/issue10OPEN/releaseNOT_ACCEPTED. OriginalesF736/B9/981/1266/fixture45/harness48intactos,fixture51separado. Fuentesajenas/PR38/142/153/main/W3/W4/W5/recurso sin cambios. Siguiente:cerrar global1434actual sin duplicar ycontinuar defecto comercial independiente conCLAIM/reproducción propios.'
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}
