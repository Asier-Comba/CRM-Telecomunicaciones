$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-invoice-relation-verification'
$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=4201}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(billing): distinguish pending relation verification'
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
$body='HANDOFF W2-X: relación seleccionada de factura distingue comprobación pendiente. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', base '+$cp.base+'. CLAIM6213765269.'+$nl+'Original1440:1FAIL/1PASS21.6s;opción fuera de primera página decía Relación no disponible antes de resolver punto retenido. Positivo vigente correcto. Original/trazas conservados. Solo expresión de texto con selectedKey/selected existentes:Comprobando relación hasta resultado actual,después etiqueta válida o no disponible. Reversión textual exacta al padre acredita queries/callbacks/guards/permisos/paginación idénticos. Sin estado/helper/producto/servicio nuevo ni reescritura de selector.'+$nl+'Controles propios36/36PASS51.2s:12 punto retenido encontrado/403/cliente distinto/vigente en3anchos +15 contratos/paginación +9 preparación;build66/lint0errores3warnings/scan/diff/cola/bundle. Fixture opt-in de componente/repositorio/parsers reales con callback estable;su JSON de onVerified yUUIDs sintéticos son instrumentación excluida de producto. Siete capturas realmente vistas:pendiente390/768/1440,válido ydenegado390/1440;visual parcial de componente,no todo editor ni ausencia real.'+$nl+'Sin guardar/emitir en banco nuevo,HTTP/DTO controlado;AuthDB/JWT/RLS/Next integrado/modelo vivoNOT_RUN,API0. No hereda24/1311/1362. Cola342/23PARTIAL/319sinreconciliar/0READY;HIGH5/W4 pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. Original1266de2741fb8FAIL1253PASS13FAIL+13complementariosPASS16.1s mismoSHA intacto,no1266singlePASS;F736/B9/981 original/primer210/script33/source41harness preservados. Fuentes ajenas/PR38/142/153/main/W3/W4/W5/recurso sin cambios. Siguiente revisión individual acotada de consumo contract.list si sigue sin reconciliar,conCLAIM propio,sin aceptar backend/seguridad por silencio.'
foreach($n in @(67,153,38,142)){
 $c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body}
 $publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF'
 $publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}
