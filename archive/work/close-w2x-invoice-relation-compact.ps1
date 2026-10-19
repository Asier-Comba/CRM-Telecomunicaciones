$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-invoice-relation-compact'
$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=21615}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(billing): hide inactive relation pagination controls'
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
$body='HANDOFF W2-X: formulario de factura más compacto con paginación de relaciones necesaria. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', base '+$cp.base+'. CLAIM6213599725.'+$nl+'Pulido UX reversible, no fallo de negocio:baseline existente labels3901PASS11s y captura realmente vista con paginación inoperante en oportunidad vacía. Se conserva. Solo dos wrappers de visibilidad por cursor/next;se verifica reversión textual exacta al padre para garantizar handlers/queries/verificación/guards/permisos idénticos. Actualizar permanece;con next o cursor siguen los controles correspondientes. Sin nueva pantalla/servicio/helper o reescritura del selector.'+$nl+'Controles propios24/24PASS46.3s (15 contratos+9 preparación existentes),build66/lint0errores3warnings/scan/diff/cola/bundle. Sin tests nuevos ornamentales. Se conservan positivos de página21/operador,negativos403/mismatch y cuerpos de lecturas normales. Seis capturas labels/page390/768/1440 realmente vistas:Actualizars en vacíos,paginación de contrato vigente;visual parcial y parte inferior móvil fuera del viewport.'+$nl+'HTTP/DTO sintéticos,componentes/repositorio/parsers reales;sin guardar/emitir,AuthDB/JWT/RLS/Next integrado/modelo vivoNOT_RUN,API0. No hereda63/1311/1362. Cola342/23PARTIAL/319sinreconciliar/0READY;HIGH5/W4 pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. Original1266de2741fb8FAIL1253PASS13FAIL+13complementariosPASS16.1s mismoSHA preservado,no1266singlePASS;F736/B9/981 original/primer210/script33 intactos. Fuentes ajenas/PR38/142/153/main/W3/W4/W5/recurso sin cambios. Siguiente investigar etiqueta no disponible mientras relación seleccionada aún se comprueba,conCLAIM y reproducción propios antes de producto.'
foreach($n in @(67,153,38,142)){
 $c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body}
 $publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF'
 $publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}
