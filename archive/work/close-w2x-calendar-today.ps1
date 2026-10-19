$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-calendar-today';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=30444}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(calendar): refresh Madrid day on explicit Today action'
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
$body='HANDOFF W2-X53 AgendaHoy confechaactualMadrid. Fuente '+$sha+',árbol '+$tree+',rama '+$cp.branch+',base '+$cp.base+'. CLAIM6251289927.'+$nl+'Original1FAIL/2PASS25.9s:tras semanaanterior+medianoche,Hoyretornaba15octen lugar16oct;current/refreshmanual pasan. Calendario integrado congelabaasOfmontaje. CallbackopcionalonToday evalúafechaactual,reutiliza setterdeasOf ycalendarDateMadrid;sin callbackpreview conserva snapshotexplícito. No timer/efecto/nuevaprimitiva. onRange/queries/paging/filtros/selección/comandos/recibos intactos por reversióntextual exacta.'+$nl+'Propios57/57PASS1.4min:27fecha(current/midnight/refresh×verano/invierno/bisiesto×3anchos)+3visualpreview+9selección+18incertidumbreAgenda. Rangequery/día/highlight correspondenanueva fecha,statuspending permanece;Actualizar conserva intervalo manual. Build66/lint0errores3warnings/scan/diff/cola/bundle. RevisiónReact aplicada:acciónenhandler/estadoasOf existente,sin fecha duplicada/timer/efectos,callbackopcionalconservapreview.'+$nl+'Nueve capturas actuales realmente vistas:16oct2026/01ene2027/29feb2028×3anchos,Hoy/vistaDía/highlight/Pendiente,superiorgrid;horasinferiores/sidebar móvilparciales,controlesfixtureexcluidos. Emptyfixture no acreditaausencia. Datecontroladosolonavegador;componentes/repositorio/parsers reales,HTTPcontrolado,solo calendar.list enbanco nuevo. AuthDB/JWT/RLS/Nextintegrado/modelovivoNOT_RUN/API0.'+$nl+'Col342/27PARTIAL/315sinreconciliar/0READY. Global1434BC3activo independiente,noherencia. Siguiente global1479deesta fuente esperará1434terminal/publicadoPASS,sin cancelar ni duplicar. HIGH5/W4/IAwritesOFF/issue10OPEN/releaseNOT_ACCEPTED;F736/B9/981/1266/fixture45/harness48/fixture51intactos. Typo deCLAIM22.8s corregido a25.9s contra originalpreservado,ningún test repetido. Fuentesajenas/PR38/142/153/main/W3/W4/W5/recursointactos. Siguienteunidadcomercial independiente conCLAIM ycontrolespropios.'
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}
