$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-billing-proposal-day';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=32270}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(billing): evaluate proposal civil date when generated'
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
$body='HANDOFF W2-X:fecha civil actual de propuesta tras medianocheMadrid. Fuente '+$sha+',árbol '+$tree+',rama '+$cp.branch+',base '+$cp.base+'. CLAIM6214415919.'+$nl+'Original1440:1FAIL/1PASS17.2s;tras pasar de15oct21:59Z a22:01Z la propuesta usaba15oct en lugar16oct,positivo sin salto pasa. El padre calculaba asOf al render;escribir texto cambia hijo,no recalcula fecha del padre. Se obtiene fecha existente calendarDate al pulsar Generar mediante proveedor opcional;PromptBuilder conserva compatibilidad con string. Parser/cálculo/contratos/consultas/comandos/epoch sin cambios,igualdad textual al revertir los dos segmentos verificada. No timers ni nuevo servicio.'+$nl+'Controles propios45/45PASS:18fecha verano/invierno/año bisiesto,current/midnight×3anchos,18retiro/contexto propuesta,9recorrido comercial/revisión/guardado. Build66/lint0errores3warnings/scan/diff/cola/bundle propios,sin heredar1362. Fechaeditor ydraft transportado coinciden;ningún guardar/emitir en banco nuevo. El banco comercial incluye solo guardado manual sintético. Capturas actuales realmente vistas según checkpoint:fechas corregidas de cada límite en3anchos,visual parcial superior drawer.'+$nl+'Un intento de preparación inline falló por quotingPowerShell antes de editar/dispatch;runner dependiente encontró colección ausente. Ambos fallos de harness registrados,se corrigió preparación yse lanzó una sola batería45;no cancelar ni repetir verdes. Fallo causal1/1 yfixture45original9FAIL3/6 siguen separados. AuthDB/JWT/RLS/Next integrado/modelo vivoNOT_RUN/API0;reloj Date del navegador,no reloj del equipo,parsers/componentes/repositorio reales,HTTP controlado. Sin aceptación DB/modelo/seguridad.'+$nl+'Cola342/26PARTIAL/316sinreconciliar/0READY;reviews PAR140/PAR141 conservan evidenciaDD6233C,no se promueven con esteSHA. Global1362FA3PASS propio,independiente. HIGH5/W4/IAwritesOFF/issue10OPEN/releaseNOT_ACCEPTED. OriginalesF736/B9/981/1266 intactos;fuentes ajenas/PR38/142/153/main/W3/W4/W5/recurso sin cambios. Siguiente:otra unidad comercial independiente conCLAIM/reproducción ycontroles propios,sin repetir verdes.'
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}
