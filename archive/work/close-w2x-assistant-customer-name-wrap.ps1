$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-assistant-customer-name-wrap';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=33278}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(assistant): contain authorized customer identity'
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
$body='HANDOFF W2-X80 — contexto delAsistente,identidadlegible. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', padre '+$cp.base+'. CLAIM6253980196. Causal1FAIL1PASS24,2s:heading830px/right870,72 ymain390/871;ordinariopasa. Solocontenedorheadingexistente min-w-0/max-w-full/overflow-wrap:anywhere,sinlecturas/estado/efectos/servicios/permisos nuevos. Reversiónexactadevuelvepadre,bancofinalidénticoacausal. SinW3core/planner/provider/budget/durabilidad niIAexterna.'+$nl+'Propios107/107browser:9contextodirectos+98contextuales(27C360+59regresiones+12documentos). Unaidentidad yresumen/atenciónalclienteexacto;403retiraidentidad/linkysinlecturasdependientes;sincomandos. Seeliminaconstanteasinusoenbanco79 yerratadoc79a4warnings,guardiareconstruyepadre sinrelajaraserciones. Log79mantiene4;nocambiar162de79,nopasarresultadosentreSHAs. Build66/lint/scan/diff/cola/bundle propios;funcionalesNOT_RUN_UI_STYLE_ONLY.'+$nl+'Nuevecapturasvistaslong/ordinary/denied3907681440:nombrecompletowrap,ordinarioenlaceydenegaciónseguros. Geometría6positivosacotada. Topdelharnessrecortadoenmóvil,prioridadescerradas;counts1/null/0página sonfixtures,noSQLmedidonipruebadeausencia. NohaycapturasDocumentos79heredadasen80. HTTP/DTOsintético concomponentes/repositorio/parsersreales;AuthDB/JWT/RLS/SQL/Nextintegrado/modelovivoNOT_RUN/API0. Noaceptarrazonamiento/RAG/modelo/seguridad/asistentecompleto.'+$nl+'1869source75activo65756 y1887source78waiter46411 excluyen12documentos79y9asistente80.1908/111seprepara,yseencolarátras80PUBLISHEDy1887terminal/PUBLISHED/PASS;sinretarget/cancel/duplicar/heredar.342/30PARTIAL/312sinreconciliar/0READY,HIGH5/W4pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. W178semánticapendienterevisión/consumo. F736/B9/981/1266/fixtures/preparaciónconservados;ramas/fuentesajenas/PR38/142/153/main/W3core/W4/W5/recursointactos. ContinuarotraunidadW2útilautorizada.'

foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}








