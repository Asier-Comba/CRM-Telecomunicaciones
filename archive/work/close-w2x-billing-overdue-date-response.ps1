$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-billing-overdue-date-response';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=66936}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(billing): reject overdue reads without due dates'
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
$body='HANDOFF/REQUEST W2-X78 — coherencia de vencimiento. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', padre '+$cp.base+'. CLAIM6253675507/ampliación6253805997. Causal1FAIL1PASS24,8s por DTOoverdue=true/due_on=null. Predicado existente get/summary/list rechaza contradicción;sinfecha/noVencida válido. Sin nuevo wire,SQL,RLS,permiso,cálculo o reloj. REQUEST propietarioW1:revisar expresión/fixtures y confirmar consumo de esta fuente exacta;sin ACK inferido ni escritura en principales.'+$nl+'Propios165/165browser3,0min:9nuevos+156contextuales. OriginalNode51=50PASS1FAIL791,8828ms preservado:fixturefiscal nulo rechazado antes de renderizar. Solo fecha inmutable del fixture,igualdad bytes y resto aserciones intactas. Recheck2afectadosPASS361,4868ms:49anteriores no afectados+2recomprobados complementarios,NO51singlePASS ni52casos. Otros2positivosflag-only reciben fechas coherentes,sinreescribir evidencia72/73. Sin runtime/renderer/Storage/W5 editado. Build66/lint0errores3warnings/scan/diff/cola/bundle;producto/browserfingerprints idénticos tras arreglofixture.'+$nl+'Nueve capturas vistas missing/dated/undated3907681440:alertasegura/tabladespejada,paginacióndesactivada en7681440;390tabla fuera de viewport. Positivos muestran fecha/Vencida/30,25 y Sinvencimiento/sinVencida. Sinaccionesinvocadas;harness/banner/placeholders excluidos. HTTP/DTOsintético concomponentes/repositorio/parsersreales;AuthDB/JWT/RLS/SQL/Nextintegrado/modelovivoNOT_RUN/API0. Noacepta productorSQL,derivación diaria,ausencia,autoridad,durabilidad ni W4.'+$nl+'1842source72PASS35,7min,1869source75activo65756 sinestos cambios;1887/109solo preparado,NOsolicitado aún. Seencolará tras publicación78 y1869terminal/PUBLISHED/PASS;sinretarget/cancelación/duplicación/herencia.342/30PARTIAL/312sinreconciliar/0READY;HIGH5/W4pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. F736/B9/981/1266/fixtures/preparación conservados;ramas/fuentesajenas/PR38/142/153/main/W3/W4/W5/recursointactos. Siguiente:fullpropio yotrodefectocomercial útil W2.'

foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}








