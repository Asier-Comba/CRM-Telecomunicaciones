$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-attention-customer-identity'
$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=89193}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(attention): identify the selected customer in current context'
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
$body='HANDOFF W2-X: identidad comercial visible del cliente filtrado en Atención. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', base '+$cp.base+'. CLAIM 6212889445.'+$nl+'Original loaded1440: 1 FAIL porque faltan identidad visible y enlace del cliente filtrado; el selector solo mostraba Cliente seleccionado. Conservado antes del cambio. Se reutiliza NamedCustomer y su lectura normal, sin modificarlo ni añadir servicio/pantalla. La vida del bloque incluye cliente/empresa/actor/rol: al cambiar contexto, retira el nombre anterior hasta resolver el actual. Denegación muestra Cliente no disponible, no prueba ausencia; Limpiar filtros retira el bloque. No se muestran identificadores raw ni campos privados.'+$nl+'Controles propios: 78/78 navegador PASS en 5 archivos:18 identidad y60 regresiones; build66, lint exit0 con warnings conservados, scan/diff/cola/bundle. Nueve capturas cargado/lector/denegado realmente vistas a390/768/1440: nombre/enlace legibles, revisión parcial, inferior móvil fuera del viewport. Peticiones retenidas prueban retiro del nombre anterior con cambio de cliente/empresa/actor/lector en HTTP controlado. Componentes/repositorio/parsers reales, DTO sintético; no aceptación Auth/JWT/RLS. Navegación Next integrada y modelo vivo NOT_RUN, API0.'+$nl+'Global1266 de2741fb8 separado y sin herencia. Cola342_21PARTIAL_321sinreconciliar_0READY; HIGH5/W4 pendientes, IA writesOFF, issue10OPEN, releaseNOT_ACCEPTED. Fallos F736/B9/981 original/primer210/script33 intactos. Fuentes PR38/142/153/main/W3/W4/W5/recurso intactas. Siguiente revisión individual acotada TEL069 con CLAIM propio, sin promover backend/seguridad/aceptación completa.'
foreach($n in @(67,153,38,142)){
 $c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body}
 $publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF'
 $publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}
