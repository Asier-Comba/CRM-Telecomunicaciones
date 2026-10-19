$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-document-target-text-wrap';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=79024}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(documents): keep target labels within mobile viewport'
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
$body='HANDOFF W2-X79 — Documentos,identidad legible. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', padre '+$cp.base+'. CLAIM6253894604. Causal2FAIL1PASS34,6s:móvil390resultado alcanza690,77px;destinoseleccionadoheading300/scroll766,main390/811;ordinariopasa. Solo2contenedoresexistentes conmin-w-0/max-w-full/overflow-wrap:anywhere;sinconsultas,estado,efectos,servicios,permisos ocontenido privado nuevos. Reversiónexacta reconstruyepadre ybancofinalidénticoacausal.'+$nl+'Propios162/162browser:12nuevos resultados/seleccionado/ordinario/403×3907681440 y150regresionesdocumentos. Nombrecompletosemantiene,selecciónemite document.list aldestinoexacto,statusactive,limit20;una búsqueda,ningúncomando/lecturaextra.403noinventadestino nicambiaelcliente. Build66/lint0errores3warnings/scan/diff/cola/bundle. FuncionalesNOT_RUN_UI_STYLE_ONLY,noheredaNode78. Capturas/medidaspropiasencheckpoint/documento,visualesparciales,noaceptacióndescargauploadStorage oW4.'+$nl+'HTTP/DTOsintético concomponentes/repositorio/parsersreales;AuthDB/JWT/RLS/SQL/Storage/Nextintegrado/modelovivoNOT_RUN/API0. Vacíodefixture noesausenciareal.342/30PARTIAL/312sinreconciliar/0READY,HIGH5/W4pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED.1869source75único65756 y1887source78waiter46411,sin12nuevos79;noherencia/retarget/cancelación/duplicación. SemánticaW178pendienterevisión/consumopropietario. F736/B9/981/1266/fixtures/preparaciónconservados;ramas/fuentesajenas/PR38/142/153/main/W3core/W4/W5/recursointactos. Siguiente:recorridocomercial Cliente-Documento-Asistente,defectoreproducibleW2independiente.'

foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}








