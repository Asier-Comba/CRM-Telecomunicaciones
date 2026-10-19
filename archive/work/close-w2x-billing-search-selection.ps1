$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-billing-search-selection';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=11261}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(billing): preserve selected customer across searches'
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
$body='HANDOFF W2-X69 — búsqueda y selección de facturación. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', base '+$cp.base+'. CLAIM6252718955/ampliación6252756216.'+$nl+'Primer intento3FAIL de fixture:consulta no concordante rechazada por parser;archived previsto no ejecutado,corregido a403. Originales preservados. Reproducción corregida sobre mismo padre2FAIL/1PASS29,6s:buscar otra empresa elimina identidad seleccionadaA;seleccionarB conserva textoA. Solo merge funcional de búsqueda correcta conservando seleccionado ykeyPromptBuilder porcustomerId;catch403 sigue failclosed. Reversión exacta devuelve padre;identidad67/avisos65/editor/parser/cálculo/contrato/repositorio intactos.'+$nl+'Propios111/111 browser2,2min,49/49funcionales874,1793ms,build66,lint0errores3warnings,scan/diff/cola/bundle.15nuevos:otra/vacía/coincidente/cambio/403×3907681440. Otra conservaA/texto,sustituyeBporC;seleccionarB limpia propuesta. Invoice.list siemprecliente explícito;una identidad/una búsqueda salvootra2;sin comandos nuevos. Banco final idéntico al causal corregido,sin relajar aserciones.96regresiones propias;no herencia global.'+$nl+'Nueve capturas realmente vistas:otra conservaA/readiness/texto,cambioB deja placeholder/Generar disabled,403 muestra errorseguro/cliente sinverificar/Nuevo disabled/sinpropuesta. Opciones cerradas porDOM,móvil inferior recortado,fixturevacío no ausenciaSQL;bannerexcluido. Visual parcial,vozNOT_RUN. HTTPDTO sintético,componentes/repositorio/parsers reales;AuthDB/JWT/RLS/Next integrado/modelovivoNOT_RUN/API0.'+$nl+'342/29PARTIAL/313sinreconciliar/0READY,HIGH5/W4 pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED.1755fuente64 y1773fuente65 separados sin67/69;coalescer1806/104 solo después1773terminal/PUBLISHED/PASS,sin cancelar/duplicar. F736/B9/981/1266 yfixtures/preparación intactos,incluido recorder visual con selector amplio corregido sinrepetir runtime. Fuentesajenas/PR38/142/153/main/W3/W4/W5/recurso intactos. Siguiente:actualizar evidencia individualPAR103 conservando límites yseguir defecto comercial útil.'

foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}








