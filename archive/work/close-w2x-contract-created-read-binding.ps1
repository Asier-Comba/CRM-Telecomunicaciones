$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-contract-created-read-binding';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=77713}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(contracts): bind created record reads to confirmed input'
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
$body='HANDOFF/REQUEST W2-X85 — coherencia del contrato creado. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', padre '+$cp.base+', CLAIM '+$cp.claim+'. Propios '+$cp.browser_summary+':24pertinentes y117regresiones contextuales. Build66,lint,scan,diff,cola ybundle propios;funcionalesNOT_RUN_UI_POST_RECEIPT_READ_CORRELATION.'+$nl+'Original6FAIL2PASS1,9min se conserva como5fallos deproducto,1fixture y2positivos. Operador/fecha/tarifa/origen/responsable contradictorios enDTOválido seaceptaban. El sexto caso usaba recibo2 inválido:elparser yaexige1 yrechaza antes deGET;no demuestra unfallodeversión. Elguard preedición lo detectó antesdecódigo. Solo ese fixture se corrigió ypasó1/1 en13,8s;las5asercionesdeDTO permanecen. Seconservan log/exit/banco/8auxiliares originales ycorrección porseparado;141uniforme esotrafuente realmente ejecutada después delcambio.'+$nl+'Elref existente guarda inputyrecibo. Secomprueban cliente/operador/fecha/tarifa/origen,yresponsable solo enlamismaversión. Reasignación posterior válida pasa. No nuevoestado,efecto,primitiva,servicio,SQL,comando olectura;parser W1 ypolítica de cierre intactos. Recibo confirmado+lecturacontradictoria mantiene elpanel yrecupera solo consultando,uncomando/unefecto sintético. Reciboinválido reintenta lamismaorden. REQUEST W1:revisar inmutables dePORTFOLIO_V1 yresponsable porversión antesdeconsumir estesSHAenprincipal;sinACKinferido.'+$nl+'Quince capturas vistas:operador/fecha/reciboinválido3907681440,tarifa/origen/responsable/exacto1440 ypropietarioposterior3901440. Formulariooriginalfijo,statusguardado,errorseguro yrelectura paraDTOcontradictorio;reciboinválido muestra confirmación,error yreintento conCancelar/Xbloqueados. Positivos muestran status/enlace,filas fuera deviewport;reasignación validada porDTO/flujo,no propietario visible. No aceptar módulo,origenlegado,roles oW4. HTTP/DTO/efectos sintéticos;AuthDB/JWT/RLS/SQL/Nextintegrado/modelovivoNOT_RUN/API0.'+$nl+'1908source80 activo56843/1968source84waiter42972 conservan sus pines. Fuente84 tiene estos5defectos exactos registrados en suhandoff:1968nopodráacreditarestecambio. Sin cancelar/retargetear checks.1992/115solo preparado ycoalescer conpróximo defecto de callback si sereproduce.342/31PARTIAL/311sinreconciliar/0READY,HIGH5/W4 pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. W178revisión/consumopendiente;F736/B9/981/1266/fixtures/preparaciónypérdidaauxiliar83preservados. Fuentes/ramasajenas/PR38/142/153/main/W3core/W4/W5/recurso intactos.'

foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}








