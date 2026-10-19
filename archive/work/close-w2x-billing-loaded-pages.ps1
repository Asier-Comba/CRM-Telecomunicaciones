$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-billing-loaded-pages';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=62583}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'test(billing): verify loaded invoice pages and filters'
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
$body='HANDOFF W2-X71 — facturas cargadas,páginas/filtros/recuperación. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', base '+$cp.base+'. CLAIM6252963108.'+$nl+'Solo bancoQA18nuevo ydocumento;producto/fixtures/pruebasprevias intactos. Original18FAILfixture:next_id con1fila ylimit50,parserexige50yúltimoIDcursor,rechazaantesderecorrido. Log/exit1/contextos/testoriginal preservados. Corrección solodatos50IDsascendentes11..60/cursor60/segunda61 ypositivo delparser real;sinrelajaraserciones/contrato/límites/producto. Solo18fallidosrechecados,log/outputdistintos:18/18PASS29,4s. Noagregarintentos;funcionalesNOT_RUN sinproductocambiado.'+$nl+'Avance/retroceso/estado/cliente/recarga/403recuperación×3907681440. Filas previas ausentes duranteloading/error,botonespaginaciónbloqueados,página2factura12,resetcursoralfiltro/recarga.403noinventa listavacía;Actualizarrecupera1ylimpiaerror. Listalimit50/clientesiemprefiltradoA/B,resumenfinancieroalcanceespacio,2lecturasavance/3otras/sólo1after_id;sincomandos/propuesta/emisión. Build66,lint0errores3warnings,scan/diff/cola/bundlepropios.'+$nl+'Ocho capturasvistas:next/recovered3907681440,estado/cliente1440. Factura12/Emitida/vencimiento25oct/30,25EUR/accioneslegibles;paginación2visible7681440,debajodeviewport390. EstadoEmitidas/factura13/página1 yclienteB/factura14/página1 visibles1440;nombreBselectestrecho recortado,identidadcompletaDOM. Deniedcapturasdespuésderecuperación muestraninicio50filas,noerrornipaginación;403porHTTPDOM,no píxeles. Visualparcial,bannerfixtureexcluido.'+$nl+'HTTPDTOsintético,componentes/repositorio/parserreales;AuthDB/JWT/RLS/SQL/Nextintegrado/modelovivoNOT_RUN/API0,noautoridad/ausenciareal/aceptaciónintegral.342/29PARTIAL/313sinreconciliar/0READY,HIGH5/W4pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED.1806fuente69único18288activo sinestebanco,checkout14congelado;noheredar/cancelar/duplicar. F736/B9/981/1266/fixtures/preparación conservados;fuentesajenas/PR38/142/153/main/W3/W4/W5/recursointactos. Continuarunidadindependienteútil.'

foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}








