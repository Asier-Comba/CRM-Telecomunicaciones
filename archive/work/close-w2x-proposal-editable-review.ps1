$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-proposal-editable-review';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='PREFLIGHT_ONCE'}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
python ('work/checkpoint-'+$prefix+'.py') preflight
if($LASTEXITCODE){throw 'METADATA_GUARDS_FAILED'}
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'docs(billing): reconcile PAR140 editable proposal individually'
if($LASTEXITCODE){throw 'COMMIT_FAILED'}
$sha=(git -C $repo rev-parse HEAD).Trim();$tree=(git -C $repo rev-parse 'HEAD^{tree}').Trim()
$publication=@{sha=$sha;tree=$tree;publication='LOCAL_COMMIT_PUSH_PENDING';handoffs=@()};$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
git -C $repo push origin ('HEAD:refs/heads/'+$cp.branch)
if($LASTEXITCODE){throw 'PUSH_UNCERTAIN_INSPECT'}
$bundle=Join-Path $PSScriptRoot ($prefix+'.bundle');git -C $repo bundle create $bundle HEAD
if($LASTEXITCODE){throw 'BUNDLE_FAILED'}
git -C $repo bundle verify $bundle
if($LASTEXITCODE){throw 'BUNDLE_VERIFY_FAILED'}
. ./work/CrmGitHub.ps1
$nl=[string][char]10+[char]10
$body='PAR-140 propuesta editable: revisión individual parcial. Metadata '+$sha+', árbol '+$tree+', rama '+$cp.branch+', CLAIM '+$cp.claim+'. Evidencia funcional exacta '+$cp.evidence_source+'.'+$nl+'Solo una fila:cola342,25PARTIAL,317sinreconciliar,0READY.24revisiones previas,341otrasfilas ycampos globales idénticos;src/tests idénticos al padre,queue/diff/scan/bundle verificados. RuntimeNOT_RUN metadataSHA,sin repetir ni heredar verdes. PAR141se conserva sin promoción.'+$nl+'Evidencia exactaDD6233C:propuesta local editable,concepto editado,cantidad2,precio200,IVA21%,base400/impuesto84/total484. Sin click manual revisado no comando;editar notas tras revisar desmarca revisión ybloquea Guardar. Click manual envía create_draft con edición yrecibo/readback cerrados. Ningún invoice.issue. Primer9:3FAIL/6PASS1.0min por sobre incorrecto de mi fixture data frente receipt;solo3fallidos recheck3PASS10.5s;6+3complementarios,no9singlePASS. Producto idéntico,fallo original intacto. Build66/lint0errores3warnings/scan propios fuenteDD6233C.'+$nl+'Cinco capturas realmente vistas:conceptos/importes/revisión/acciones editadas390/768/1440,revisión invalidada390/1440;visual parcial inferior drawer,cliente/fechas fuera viewport. IMPLEMENTED/CONSUMED_UI/VISUAL PARTIAL;backend/navegador integral/seguridad NOT_RECONCILED. Pendientes otras combinaciones de validación/fechas/divisas/cliente/vínculos,modelo/audio real,Next integral,AuthDB/JWT/RLS/todos roles/persistencia/accesibilidad/W4. HTTP simulado no prueba guardadoSQL. Modelo vivoNOT_RUN/API0.'+$nl+'Global1362deFA3 cerradoPASS propio,ninguna herencia a metadata actual. HIGH5/IAwritesOFF/issue10OPEN/releaseNOT_ACCEPTED;F736/B9/981/1266yfixture45 intactos. Fuentes ajenas/W3/W4/W5/recurso sin cambios. Siguiente:unidad comercial independiente oPAR141con revisión individual de su alcance comprobado,sin promociones masivas ni repetir verdes.'
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
