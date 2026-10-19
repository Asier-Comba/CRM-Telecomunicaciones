$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-contract-recovery-close';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=12009}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(contracts): consume safe recovery close policy'
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
$body='HANDOFF W2-X84 — cierre del contrato manual. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', padre '+$cp.base+', CLAIM '+$cp.claim+'. Propios '+$cp.browser_summary+':12casos pertinentes y105regresiones contextuales. Build66,lint,scan,diff,cola ybundle propios;funcionalesNOT_RUN_EXISTING_CONTROL_POLICY_CONSUMPTION.'+$nl+'Causal3FAIL/1PASS47,5s conservado conlog,exit,banco yauxiliares deesta carpeta exclusiva. El panel usa closeBlocked yaexistente tanto enatributo como enguardia. Es elúnico cambio deproducto:sinrehacerhook,estado,efectos,comandos,recibos,consultas,contratos oservicios. Reversión exacta devuelvepadre ybanco finalidénticoalcausal. Incertidumbre mantiene orden yefecto sintéticoúnico;recibo+503 sololectura;403sin efecto permite salir yreabrir para nuevaorden explícita. Review previo0comandos. No acredita SQLidempotencia niAuthDBreal.'+$nl+'Doce capturas vistas:incierto/lecturafallida/review/403a3907681440. Confirmaciónconmensaje yreintento,Cancelar/Xdeshabilitados;recibo muestraformulariofijo,statusguardado yrelectura. Rootbajomodal soloDOM. Capturas403 sonposterioresalareaperturaexitosa:status/enlace visibles,filas mayormente fuera deviewport. Review vuelvealtab/listavacía declarada;nomedir ausenciareal. Camposconstructor yversión delecturapostrecibo NOEJERCIDOSaquí,sepreservachequeoclienteexistente.'+$nl+'1968/114coleccionado:1908+21Incidencias82+27SIMContrato83+12Contrato84. Seencolará tras propia publicación/controles y1908terminal/PUBLISHED/PASS.1956preparado/DEFERRED,nunca solicitado.1887source78 activo46411/1908source80waiter56843 intactos,sin retarget,cancelación,duplicación oherencia. HTTP/DTO/efectos sintéticos concomponentes/repositorio/parsersreales;AuthDB/JWT/RLS/SQL/Nextintegrado/modelovivoNOT_RUN/API0.342/31PARTIAL/311sinreconciliar/0READY,HIGH5/W4pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. W178revisión/consumopendiente;F736/B9/981/1266/restofallosypérdidaauxiliar83preservados. Fuentes/ramasajenas/PR38/142/153/main/W3core/W4/W5/recurso intactos. Siguiente:reproducir coherencia de operador/fecha/tarifa/origen/recibo antesdeotraedición W2.'

foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}








