$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-billing-customer-filter'
$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=77094}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(billing): retain customer filter when identity lookup fails'
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
$body='HANDOFF W2-X: Facturación conserva el filtro de cliente ante fallo de identidad. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', base '+$cp.base+'. CLAIM6213045963.'+$nl+'Original5 a1440:4FAIL (403/404/transporte/DTO malformado),1vigentePASS53.7s. Cada fallo de customer.editor vaciaba customerId y lanzaba una invoice.list general inesperada, esperado0/recibido1. Ahora conserva filtro, selector Cliente sin verificar y alta deshabilitada hasta identidad disponible. Actualizar mantiene cliente; solo Todo el espacio explícito amplía lista. Resumen financiero permanece del espacio, contrato/permisos/intent/CAS intactos. Es defecto UI, no evidencia de fuga o Auth real.'+$nl+'Primer43 funcionalPASS59.8s con lint/build conservado: revisión390 encontró selector fuera de tarjeta pese a ancho de página correcto. Único refinamiento después de terminal: etiqueta corta, max-width y nueva aserción de límites de tarjeta. Final43/43 completo PASS propio sin heredar primer43; build66/lint0errores3warnings/scan/diff/cola/bundle y nueve capturas finales realmente revisadas parcialmente (denegado/malformado/vigente en390/768/1440). Logs/fuente/test/capturas iniciales intactos.'+$nl+'Banco:15 filtros+18 estados cliente+9 vida preparación+1 resumen financiero; fixture opt-in existente, sin nuevo servicio ni cambiar defaults. Componentes/repositorio/parsers reales, HTTP controlado, sin comandos del banco nuevo. Auth/DB/JWT/RLS, Next integrado y modelo vivo NOT_RUN, API0. Global1266 de2741fb8 y1311 de4221edc separados sin herencia. Cola342/22PARTIAL/320sinreconciliar/0READY. HIGH5/W4 pendientes,IA writesOFF,issue10OPEN,releaseNOT_ACCEPTED;F736/B9/981 original/primer210/script33 preservados. PR38/142/153/main/W3/W4/W5/recurso intactos. Siguiente investigar propuesta de factura tardía al cambiar cliente, con CLAIM y reproducción propios antes de tocar producto.'
foreach($n in @(67,153,38,142)){
 $c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body}
 $publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF'
 $publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}
