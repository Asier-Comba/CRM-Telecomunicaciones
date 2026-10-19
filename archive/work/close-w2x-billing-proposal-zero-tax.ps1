$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-billing-proposal-zero-tax';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=17722}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(billing): bound explicit zero tax recognition'
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
$body='HANDOFF W2-X63 — frontera decimal IVA0. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', base '+$cp.base+'. CLAIM6252053457.'+$nl+'Original2FAIL/1PASS31,8s preservado: atajoIVA0 absorbe0coma5/0coma123 como cero;control0exacto pasa. Única expresión impide dígito/separador decimal después del cero;la extracción62 y validación existentes consumen/rechazan el porcentaje completo. Reversión exacta devuelve el padre;resto del parser/IVAincluido/sinIVA/descuentos/editor/cálculo/contrato/normalizador/repositorio intactos.'+$nl+'Propios144/144 browser2,4min y24/24 funcionales765,2553ms.18nuevos:decimal coma/punto0coma5,cero,sinIVA,0coma123inválido,sufijo0coma5deIVA en3907681440;126regresiones IVA/IRPF/descuento. Positivos100,50/100,00 exactos,revisión desmarcada/Guardar disabled. Inválido sin invoice.propose/editor,error seguro. Nuevo banco sin comandos. Build66;lint0errores/3warnings;scan/diff/cola/bundle propios;sin herencia.'+$nl+'Seis capturas realmente vistas:0coma5coma3907681440,cero1440,precisión3901440. Inferior positivo:conceptos/cantidades/porcentajes/totales/revisión/Guardar legibles. Superior cliente/fiscal/fechas fuera;rechazoerror sin editor,propuesta inferior móvil recortada;fixture excluido. Visual parcial, noeditor/accesibilidad/fiscal/seguridad completos. HTTP/DTO sintético;componentes/repositorio/parsers reales;AuthDB/JWT/RLS/Next integrado/modelo vivoNOT_RUN/API0.'+$nl+'Global1575fuente57 activo único,sin58/61/62/63;no cancelar/duplicar/heredarPASS.342/27PARTIAL/315sinreconciliar/0READY;HIGH5/W4 pendientes,IA writesOFF,issue10OPEN,releaseNOT_ACCEPTED. F736/B9/981/1266/fixtures/preparación intactos;fallos posteriores propios vinculados a fuente original sin borrarlos. Fuentes ajenas/PR38/142/153/main/W3/W4/W5/recurso intactos. Siguiente: recorrido manual de borrador con descuento100%/totalcero,recibo y lectura;después global agrupado desde fuente propia elegible más reciente,solo tras1575 terminal/publicado.'
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}





