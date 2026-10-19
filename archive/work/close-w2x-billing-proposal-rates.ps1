$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-billing-proposal-rates';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=42682}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(billing): parse complete tax and withholding percentages'
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
$body='HANDOFF W2-X62 — IVA/IRPF completos en propuesta local. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', base '+$cp.base+'. CLAIM6251956555.'+$nl+'Original6FAIL/2PASS1,5min preservado: en ambos campos100/10coma5/101 se truncan a10;ordinarios10pasan. Solo extracción numérica completa de parseTax/parseWithholding con signo/decimales coma-punto y sin sufijo parcial. Normalizador/contrato existentes siguen rechazando límites/precisión antes del envío. IVA incluido/sinIVA/descuento61/resto del parser/editor/cálculo/repositorio intactos por reversión exacta de las dos funciones. No aceptación tributaria ni mecanismo de autoridad.'+$nl+'Propios225/225 browser4,0min y24/24 funcionales978,5766ms.84nuevos: IVA/IRPF,prefijo/sufijo,100/10coma5/10punto5/10/101/-1/10coma123 y3907681440. Porcentaje y total exactos,precio100/cantidad1/descuento0;revisión desmarcada/Guardar disabled. Inválidos sin invoice.propose ni editor,error seguro. Banco nuevo sin comandos;141regresiones previas. Build66;lint0errores/3warnings;scan/diff/cola/bundle propios.'+$nl+'Siete capturas realmente vistas: IVA/IRPF10coma5 en3907681440 e IVA101inválido1440. Conceptos/porcentajes/base/IVA/IRPF/total/revisión visibles;Guardar visible salvo IVA390 debajo del viewport. Superior cliente/fiscal/fechas fuera;acciones parcialmente visibles;fixture excluido. Visual parcial, no editor/accesibilidad/fiscal/seguridad completos. HTTP/DTO sintético,componentes/repositorio/parsers reales;AuthDB/JWT/RLS/Next integrado/modelo vivoNOT_RUN/API0.'+$nl+'Global1575fuente57 activo una vez y sin58/61/62;no cancelar/duplicar/heredarPASS.342/27PARTIAL/315sinreconciliar/0READY;HIGH5/W4 pendientes, IA writesOFF, issue10OPEN, releaseNOT_ACCEPTED. F736/B9/981/1266/fixtures/preparación intactos. Fuentes ajenas/PR38/142/153/main/W3/W4/W5/recurso intactos. Siguiente: reproducir frontera decimal inferior del atajo IVA0, aún no medida;no asumir corrección ni fabricar resultado.'
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}




