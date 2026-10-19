$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-c360-contact-text-wrap';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=43767}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(customers): contain contact names and job titles'
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
$body='HANDOFF W2-X77 — Customer360,contactos legibles. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', base '+$cp.base+'. CLAIM6253510540.'+$nl+'Original1FAIL1PASS19,9s:panel340/scroll874 con nombre largo a390;ordinario pasa. Solo ajuste min-w-0/max-w-full/overflow-wrap:anywhere alcontenedor textual existente. Nombre,cargo,principal,estado,origen yacciones conservados. Sinestado/efecto/query/editor/revelación/permiso/contrato nuevos. Reversión exacta devuelvepadre;bancoheader/Empresa ampliado aContactos27 yguardia reconstruye18anteriores,sinrelajar aserciones;finalidénticoacausal.'+$nl+'Propios86/86browser1,5min:9Contactos pertinentes y77contextuales(18header/Empresa+59regresiones). Unaidentidad/caso,sincomandos;sin sensitive.get ni valoresdata-sensitive-value. Eso no acepta privacidad/AuthDB real. Geometría27 mantiene paneles340/340,718/718,1198/1198 ymain390/390,768/768,1440/1440. Build66/lint0errores3warnings/scan/diff/cola/bundle;funcionalesNOT_RUN_UI_STYLE_ONLY,no50heredados.'+$nl+'Siete capturas vistas: nombre/cargo largos3907681440,ordinario1440. Nombre completo,cargo,Principal yestado legibles;acciones/paging visibles en largas,ordinarioinferiorrecortado. Revelar/copiar/editar/añadir/origen no se invocan. Header/Empresa porDOMgeometría,no visualheredada. Harness/banner/UUID ycounts1/atenciónvacía/has_emailfalse/has_phonefalse sonfixtures,noSQLcounts/ausencia real.'+$nl+'HTTP/DTOsintético,componentes/repositorio/parsersreales;AuthDB/JWT/RLS/SQL/Nextintegrado/modelovivoNOT_RUN/API0.342/30PARTIAL/312sinreconciliar/0READY,HIGH5/W4 pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED.1842fuente72único71901activo,1869fuente75waiter65756,sin9Contactos77;no retarget/cancelar/duplicar/heredar. Semántica72 pendiente revisión/consumo propietario yoverdueflagnoacredita fecha. F736/B9/981/1266/fixtures/preparación conservados;fuentesajenas/PR38/142/153/main/W3/W4/W5/recurso intactos. Siguiente:reproducir respuestaVencida/Sinvencimiento segúncontratoprimario antes de corregir,coordinando semánticaW1.'

foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}








