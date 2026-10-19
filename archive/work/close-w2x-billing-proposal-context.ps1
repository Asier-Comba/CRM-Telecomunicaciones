$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-billing-proposal-context'
$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=59702}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(billing): ignore retired invoice proposal responses'
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
$body='HANDOFF W2-X: propuesta de factura responde solo al contexto vigente. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', base '+$cp.base+'. CLAIM6213214507.'+$nl+'Original a1440:1FAIL/1PASS30.2s; tras quitar el cliente, la respuesta retenida abría editor anterior, esperado0/observado1. El caso de contexto conservado pasa; test/log/trazas intactos. onGenerate reutiliza invoiceRequest y mounted: solo revisión vigente publica editor, mensaje o error. Cliente quitado, borrador manual y propuesta más reciente retiran la anterior. No se cancela ni revierte la petición emitida; no hay helper/estado/servicio nuevo ni cambios en parser/W3/permisos/comandos.'+$nl+'Controles propios61/61PASS1.4min:18 propuestas(seis modos/390/768/1440)+43 regresiones de filtro/estados/preparación/finanzas, build66/lint0errores3warnings/scan/diff/cola/bundle. Nueve capturas clear/current/latest realmente revisadas parcialmente:sin drawer retirado y cliente/serie/fecha vigentes legibles; conceptos/importes/acciones inferiores fuera del viewport, acreditados por DOM y no por esas imágenes. Respuestas savedfalse/requires_reviewtrue cerradas y cálculo real sobre draft. Nuevo banco sin guardar/emitir. Parser local y HTTP controlado con componentes/repositorio reales, sin API/modelo externo.'+$nl+'Auth/DB/JWT/RLS, Next integrado y modelo vivoNOT_RUN,API0. Global2741fb8 original1266FAIL1253PASS13FAIL por CWD de lanzador conservado;13 setup reejecutados por separado en mismo pin/carpeta correcta, sin repetir1253 ni declarar1266singlePASS.1311de4221edc se detuvo antes de dispatch y requiere cierre/resume documentado, no herencia a esta fuente. Cola342/22PARTIAL/320sinreconciliar/0READY;HIGH5/W4 pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. F736/B9/981 original/primer210/script33 intactos. Fuentes PR38/142/153/main/W3/W4/W5/recurso sin cambios. Siguiente unidad comercial independiente y cierre de controles globales propios con límites exactos.'
foreach($n in @(67,153,38,142)){
 $c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body}
 $publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF'
 $publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}
