$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-line-context-retirement'
$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=7424}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(sims): retire dependent line reads with selection context'
if($LASTEXITCODE){throw 'COMMIT_FAILED'}
$sha=(git -C $repo rev-parse HEAD).Trim();$tree=(git -C $repo rev-parse 'HEAD^{tree}').Trim()
$publication=@{sha=$sha;tree=$tree;publication='LOCAL_COMMIT_PUSH_PENDING';handoffs=@()}
$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
git -C $repo push origin ('HEAD:refs/heads/'+$cp.branch)
if($LASTEXITCODE){throw 'PUSH_UNCERTAIN_INSPECT_NO_RETRY'}
$bundle=Join-Path $PSScriptRoot ($prefix+'.bundle')
git -C $repo bundle create $bundle HEAD
if($LASTEXITCODE){throw 'BUNDLE_FAILED'}
git -C $repo bundle verify $bundle
if($LASTEXITCODE){throw 'BUNDLE_VERIFY_FAILED'}
. ./work/CrmGitHub.ps1
$nl=[string][char]10+[char]10
$body='HANDOFF W2-X: retiro de lecturas dependientes de una selección de línea sustituida. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', base '+$cp.base+'. CLAIM 6204361588.'+$nl+'Antes de cambiar producto: dos reproducciones nuevas, SIM física y eSIM a 1440, ambas FAIL: se esperaba cero consultas del servicio B retirado y se observó una. El original y sus trazas se conservan. readLineContext acepta vigencia opcional; SimEditor pasa su vida actual. Comprobaciones antes de la línea, tras su respuesta y tras los padres. Los consumidores de tres argumentos conservan su contrato. AbortError local no certifica ausencia, autorización ni cancelación física de una petición ya emitida.'+$nl+'Controles propios: 330/330 navegador PASS en 14 archivos, unión sin duplicados de SIM, altas de incidencias y consumidores de portabilidad; build 66/66, lint exit0 con warnings en log, diff/scan/cola y bundle verificados. Se conservan CAS, cuerpos, permisos, selección A-B-A y controles vigentes. Navegador HTTP controlado con DTO sintético y componentes/parsers reales. VISUAL NOT_REVIEWED_CURRENT_SHA; Auth/DB y modelo vivo NOT_RUN; API pagada 0. Ningún verde anterior se hereda.'+$nl+'Global 1266 separado sobre 21a75fa: consultar su checkpoint terminal propio, sin atribuirlo a esta fuente. Cola 342: 21 PARTIAL, 321 sin reconciliar, 0 READY. HIGH5 visibles, W4 pendiente, IA comercial writes OFF, issue10 OPEN, release NOT_ACCEPTED. F736/B9/981 original y primer210 con fallo de fixture conservados. PR38/142/153/main y W3/W4/W5/recurso intactos. Siguiente trabajo: defecto comercial independiente reproducido en Customer360/Contactos con CLAIM nuevo, sin promover aceptación por silencio.'
foreach($n in @(67,153,38,142)){
 $c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body}
 $publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF'
 $publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}
