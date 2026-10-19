$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-portability-recovery-close';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=8017}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(portabilities): align panel close with reviewed command recovery'
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
$body='HANDOFF W2-X87 — Portabilidades: cierre coherente durante recuperación y denegación.'+$nl+'Fuente '+$sha+'; árbol '+$tree+'; rama '+$cp.branch+'; padre '+$cp.base+'; CLAIM '+$cp.claim+'. Controles propios: '+$cp.browser_summary+' (24 casos nuevos y 153 regresiones), build66, lint, scan, diff, cola y bundle verificado. Funcionales: NOT_RUN_EXISTING_CONTROL_POLICY_CONSUMPTION.'+$nl+'Original: seis fallos y dos positivos en1,5min, con log, exit, banco y ocho observaciones conservados. En entrada y salida, X estaba habilitada durante incertidumbre y lectura fallida; tras403, cancelar la revisión dejaba X habilitada pero sin efecto. Los dos positivos de revisión/cancelación normal pasaban. El panel consume closeBlocked existente tanto en closeDisabled como en su guardia de cierre. No se modifica el hook, locked, comandos, lecturas, servicios, parsers ni SQL. Reversión exacta al padre; banco final idéntico al causal.'+$nl+'Los24casos cubren cuatro modos por dos direcciones y tres anchos. Incertidumbre recupera con la misma orden y un efecto sintético; recibo confirmado con503 reintenta solo la lectura (un comando, dos GET alID exacto); denegación permite salir y reabrir con nuevo command_id, efecto0 antes y1 después de nueva confirmación; cancelar revisión no envía orden. Se conservan dirección, línea, número enmascarado, operadores y fecha. Dieciséis capturas revisadas:12recuperaciones críticas a390/768/1440 y4positivos de salida/denegación. Controles externos del fixture y cantidades declaradas no acreditan datos reales ni aceptación integral.'+$nl+'HTTP/DTO/efectos sintéticos con componentes, repositorio y parsers reales. AuthDB/JWT/RLS/SQL/Nextintegrado/modelo vivo NOT_RUN;API0. Sin ausencia/quiescencia/reinicio/handler/full23 ni aceptación W4. Global1968/source84 y waiter2007/source86 conservan sus pines; ninguno acredita esta fuente87. No repetición de verdes ni PASS heredado. Matriz342/31PARTIAL/311sinreconciliar/0READY;cinco HIGH y W4 pendientes,IA comercial writes OFF,issue10 OPEN,release NOT_ACCEPTED. F736/B9 y evidencias anteriores preservadas. Consumo principal requiere ACK exacto;ramas y fuentes ajenas intactas.'

foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}









