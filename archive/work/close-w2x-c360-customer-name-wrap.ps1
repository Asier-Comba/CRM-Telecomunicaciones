$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-c360-customer-name-wrap';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=63245}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(customers): contain long company names in header'
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
$body='HANDOFF W2-X74 — Customer360,nombres sin desbordamiento. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', base '+$cp.base+'. CLAIM6253257377.'+$nl+'Original1FAIL1PASS20,1s:a390px cabeceraclient340/scroll1301 conrazónsociallarga;ordinario pasa. Solo clases min-w-0/max-w-full/overflow-wrap:anywhere alcontenedorexistente deltexto. Reversiónexacta devuelvempadre;sinestado/efecto/query/contrato/permiso/cálculo/servicio nuevo. Parser72/facturación73/pruebaspreviasintactos,bancofinalidénticocausal.'+$nl+'Propios68/68browser1,2min,9nuevoslegal/comercial/ordinario×3907681440 y59regresiones. Cabecera visible/scrolliguales:340/340,718/718,1198/1198;main390/390,768/768,1440/1440. Unaidentidad/nuevocaso,sincomandos;geometríanoautoridad/performance. Build66/lint0errores3warnings/scan/diff/cola/bundlepropios;funcionalesNOT_RUN_UI_STYLE_ONLY,noson50heredados. Lanzadororiginalconfiginexistente fallaantesdedispatch,log/exit1/runnerconservados;unresume guardadoinicialos68porprimeravez,sinduplicaciónnirelajación.'+$nl+'Siete capturasvistas:legal/comercial3907681440,ordinario1440. Texto completo ajustado,acciones/origen/relaciónlegibles;ordinario1440superiorparcialrecortado,noestadoentero.390resumeninferior/otraspestañasfueradeviewport. Controles/banner/UUIDdelharness excluidos;tiles1 yprioridadesvacíasdeclaradossintéticos,noSQLcounts/ausencia;botóndeorigennopruebaorigenverificado. Visualparcial,noC360integral/accesibilidad/seguridad.'+$nl+'HTTPDTOsintético,componentes/repositorio/parsersreales;AuthDB/JWT/RLS/SQL/Nextintegrado/modelovivoNOT_RUN/API0.342/29PARTIAL/313sinreconciliar/0READY,HIGH5/W4pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED.1806fuente69 y1842fuente72waiter71901 separados,sinUI73/74;1860/108solo tras74publicado y1842terminal/PUBLISHED/PASS. SemánticaW1de72pendienterevisión/consumo;overduefixtureflagnoacreditafechas/calculoreal. F736/B9/981/1266/fixtures/preparaciónconservados;fuentesajenas/PR38/142/153/main/W3/W4/W5/recursointactos. Siguiente:reconciliaciónindividualrespaldada ycontinuarcomercialútil.'

foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}








