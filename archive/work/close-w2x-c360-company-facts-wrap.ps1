$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-c360-company-facts-wrap';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=66407}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(customers): wrap long company facts within details'
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
$body='HANDOFF W2-X75 — Customer360,pestañaEmpresa sin desbordamiento. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', base '+$cp.base+'. CLAIM6253342210.'+$nl+'Causal1FAIL1PASS22,0s:panel340/scroll767 allegal-largo390;ordinario pasa. Solo clase min-w-0/overflow-wrap:anywhere engridexistente. Sinpantalla/campos/estado/efecto/query/servicio/contrato/permiso/cálculo nuevos. Cabecera74/facturación73/parser72intactos,reversiónexactadevuelvepadre. Banco74reutilizadoyampliado aheader+Empresa18,guardiareconstruyebancoanterior,sinperderaserciones;finalidénticoacausal ampliado.'+$nl+'Propios77/77browser1,3min:18legal/comercial/ordinario×header/Empresa×3907681440 y59regresiones. Paneles/cabeceras340/340,718/718,1198/1198;main390/390,768/768,1440/1440;1pxtolerancia intacta. Unaidentidad/nuevocaso,sincomandos. Build66/lint0errores3warnings/scan/diff/cola/bundlepropios;funcionalesNOT_RUN_UI_STYLE_ONLY,no50heredados.'+$nl+'Ocho capturasvistas:Empresalegal/comercial3907681440,ordinarioEmpresa1440,headerlegal390. Nombrescompletosajustados,relación/estado/origen/responsablelegiblesenseislargas;ordinarioEmpresa1440inferiorfuera,soloarribaaceptadovisualmente;header390inferiorrecortado. Revelarfiscal/origen/editar/archivarsolobotones,noaccionesaceptadas. Banner/navegación/UUIDharness excluidos;counts1/atenciónvacía declarados,noSQLcounts/ausencia. Visualparcial.'+$nl+'HTTPDTOsintético,componentes/repositorio/parsersreales;AuthDB/JWT/RLS/SQL/Nextintegrado/modelovivoNOT_RUN/API0.342/29PARTIAL/313sinreconciliar/0READY,HIGH5/W4pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. Semántica72pendienterevisión/consumopropietario;overduefixtureflag nocertificafechas/cálculoreal.1806fuente69PASS36,1min publicado,1842fuente72único71901activo sinUI73/74/75. Plan1860nuncasolicitado→1869/108recolectados(9label+18C360),solocontroladortras75publicado y1842terminal/PUBLISHED/PASS. F736/B9/981/1266/fixtures/preparaciónintactos;fuentesajenas/PR38/142/153/main/W3/W4/W5/recursointactos. Siguiente:revisiónindividualPAR041/PAR103 respaldada yotrodefecto comercial útil.'

foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}








