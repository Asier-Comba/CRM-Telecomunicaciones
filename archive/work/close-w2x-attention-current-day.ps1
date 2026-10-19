$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-attention-current-day'
$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=88879}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(attention): reset date window using current Madrid day'
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
$body='HANDOFF W2-X: Atención limpia filtros con el día actual de Madrid. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', base '+$cp.base+'. CLAIM6213430782.'+$nl+'Original6 a1440:3FAIL/3PASS52.2s. Limpiar tras medianoche de verano,cambio de año invierno y29febrero recuperaba día de montaje/rango desplazado1día;Actualizar con rango manual pasaba. Se preservan originales. Solo la acción explícita calcula madridDay de nuevo y reutiliza offset;no intervalos/helper/servicio ni cambio de fechas manuales. Limpieza de cliente/tipo/responsable/cursor y validaciones intactas.'+$nl+'Controles propios63/63PASS1.3min:18 fechas+27 contexto+18 identidad en390/768/1440;build66/lint0errores3warnings/scan/diff/cola/bundle. Nueve capturas clear realmente revisadas parcialmente:16sep–15nov2026,2dic2026–31ene2027,30ene–30mar2028,as_of sintético y filtros legibles;inferior móvil fuera del viewport. Reloj fijo solo de página y temporizadores reales,ningún reloj del equipo modificado. HTTP/DTO sintéticos con componentes/repositorio/parsers reales;no Auth/DB/JWT/RLS/Next integrado/modelo vivo,API0. No hereda78/61/1311.'+$nl+'Cola342/23PARTIAL/319sinreconciliar/0READY. Global1311de4221edc activo separado;futura composición global solo al terminar controles propios y publicación previa. Original1266de2741fb8FAIL1253PASS13FAIL conservado con13complementariosPASS16.1s mismoSHA,no1266singlePASS. F736/B9/981 original/primer210/script33 intactos. HIGH5/W4 pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. Fuentes ajenas/PR38/142/153/main/W3/W4/W5/recurso intactas. Siguiente defecto comercial independiente con CLAIM propio.'
foreach($n in @(67,153,38,142)){
 $c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body}
 $publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF'
 $publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}
