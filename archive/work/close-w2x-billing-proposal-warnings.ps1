$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-billing-proposal-warnings';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=3743}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(billing): retain current proposal review notices'
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
$body='HANDOFF W2-X65 — avisos de propuesta integrada. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', base '+$cp.base+'. CLAIM6252266133.'+$nl+'Original2FAIL/1PASS39,2s preservado sobre64: el callback pierde warnings/missingFields del parser;faltan IVAincluido eimporte no detectado,ordinaria pasa. Prop warnings existente del InvoiceEditor recibe snapshot asociado por referencia al formulario actual. Nuevo borrador no hereda avisos. Setter detrás de montaje/solicitud vigente;sin efecto/timer/cálculo/autoridad nuevos. Reversión exacta de tres inserciones devuelve padre;parser/importe/validación/editor/recibo/comando/CAS intactos.'+$nl+'Propios99/99 browser2,2min y49/49 funcionales951,7612ms.18nuevos:incluido/importe no detectado/ordinaria×actual/nuevo borrador posterior×3907681440. Base100 de texto121 y valor existente de importe no detectado conservados;avisos informan procedencia. Nuevo borrador limpio de avisos previos,ordinaria sinavisos inventados,revisión desmarcada/Guardar disabled,nuevo banco sin comandos.81regresiones contexto/fecha/revisión/previsión/totalcero. Build66;lint0errores/3warnings;scan/diff/cola/bundle propios.'+$nl+'Ocho capturas realmente vistas:incluido/importe3907681440,nuevo trasincluido390/trasimporte1440. Avisos/superior cliente-fechas-divisa-emisor-vínculos legibles;zona esperada de aviso vacía en nuevo borrador. Inferior conceptos/importes/totales/revisión/acciones mayormente fuera;fixture excluido. Visual parcial,no editor/accesibilidad/seguridad completos. HTTP/DTO sintético,componentes/repositorio/parsers reales;AuthDB/JWT/RLS/Next integrado/modelo vivoNOT_RUN/API0.'+$nl+'Global1755fuente64 activo único85193,sin esta corrección ni18nuevos;su checkpoint conserva fallo posterior64. No cancelar/duplicar/heredarPASS.342/27PARTIAL/315sinreconciliar/0READY,HIGH5/W4 pendientes,IA writesOFF,issue10OPEN,releaseNOT_ACCEPTED;F736/B9/981/1266/fixtures/preparación intactos. Fuentes ajenas/PR38/142/153/main/W3/W4/W5/recurso intactos. Siguiente: revisión individual PAR135 con fuentes exactas y única regresión1773/102 sobre65 tras1755terminal/PUBLISHED/PASS,colección/CWD/pin verificados antes de dispatch.'
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}







