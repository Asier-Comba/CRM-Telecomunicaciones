$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-billing-read-error'
$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=16651}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(billing): clear only the recovered read failure'
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
$body='HANDOFF W2-X: Facturación retira solo el error de lectura recuperado. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', base '+$cp.base+'. CLAIM6213990000.'+$nl+'Original1440:3FAIL/2PASS55.5s;listado/resumen/configuración recuperados mantenían error global pese a datos válidos. Identidad403 ycomando incierto durante refresco eran positivos que se preservan. Original/trazas intactos. El éxito actual compara referencia exacta del error de su grupo con el error visible,solo retira ese objeto,capturándolo antes del reset. No compara códigos ni borra errores ajenos. Reversión textual exacta al padre acredita queries/keys/active/comandos/recibos/CAS/pending/bloqueos intactos.'+$nl+'Controles propios91/91PASS2.1min:15 recuperación+42recibos+15filtro+18propuesta+1financiero;build66/lint0errores3warnings/scan/diff/cola/bundle. Identidad403 continúa visible yalta bloqueada. Refresco retenido,petición manual simulada de cobro500 yposterior éxito de lectura conservan error,misma intención,reintento yCancelar deshabilitado;no efectoSQL/ausencia acreditados. Siete capturas realmente vistas:listado recuperado3anchos,identidad/comando incierto390/1440;visual parcial,inferior móvil fuera del viewport.'+$nl+'Componentes/repositorio/parsers reales,HTTP/DTO controlado;AuthDB/JWT/RLS/Next integrado/modelo vivoNOT_RUN,API0. Sin guardar/emitir en banco nuevo;petición de cobro simulada es incierta,ninguna aceptación de durabilidad/seguridad. No hereda36/1311/1362. Cola342/24PARTIAL/318sinreconciliar/0READY;HIGH5/W4 pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. Original1266de2741fb8FAIL1253PASS13FAIL+13complementariosPASS16.1s mismoSHA conservado,no1266singlePASS;F736/B9/981 original/primer210/script33/source41harness intactos. Fuentes ajenas/PR38/142/153/main/W3/W4/W5/recurso sin cambios. Siguiente unidad comercial independiente o requisito individual respaldado,conCLAIM propio,sin repetir verdes ni promociones masivas.'
foreach($n in @(67,153,38,142)){
 $c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body}
 $publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF'
 $publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}
