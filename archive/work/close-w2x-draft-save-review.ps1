$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-draft-save-review';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='PREFLIGHT_ONCE'}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
python ('work/checkpoint-'+$prefix+'.py') preflight
if($LASTEXITCODE){throw 'METADATA_GUARDS_FAILED'}
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'docs(billing): reconcile PAR105 manual draft save individually'
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
$body='PAR-105 Guardar borrador:revisión individual parcial. Metadata '+$sha+',árbol '+$tree+',rama '+$cp.branch+',CLAIM '+$cp.claim+'. Fuentes diferenciadas45738ab9e830c9c65150231fa691778d3c08aa52 y1816c21436d48afa9f8c04da181fe4e1becd8835.'+$nl+'Solo1fila:342/27PARTIAL/315sinreconciliar/0READY.26reviews/341otrasfilas/globales idénticos;src/tests delpadre intactos,queue/diff/scan/bundlePASS. RuntimeNOT_RUN metadataSHA,no verdesheredados ni repetidos.'+$nl+'45738ABown18/build66:creación/edición conpayload editado,recibo estricto,reintento misma intención y403conserva edición/cierre;suXhistórica aparentementeactiva no se presenta como cierre disabled actual.1816C21build66:recibo válido+readbackmalformado/clienteajeno/503conserva registrado,cierre/camposbloqueados,Consulta recuperamismoid/version/draft sinreenviarcomando,timelinecommand/read/read. Original18FAIL6/PASS12porfixtureigualUUIDpreservado,solo6fallidos recheck6PASS17.3s;12+6complementarios,no18singlePASS.'+$nl+'Siete capturas vistas1816C21:aviso/consulta/error/Xdisabled/campos,superior drawer3anchos;inferior conceptos/totales fuera viewport. IMPLEMENTED/CONSUMED_UI/VISUAL PARTIAL;backend/navegador integral/seguridadNOT_RECONCILED. Faltan persistenciaAuthDBreal/idempotenciaSQL/todosroles/JWT/RLS/enforcementyvalidacionescompletas/Next/accesibilidad/visual/W4. HTTPsimulado no pruebaSQL,ausencia ni método durable;modeloNOT_RUN/API0.'+$nl+'Global1434BC3activo independiente,checkout14congelado,noherencia. HIGH5/W4/IAwritesOFF/issue10OPEN/releaseNOT_ACCEPTED;F736/B9/981/1266/fixture45/harness48/fixture51 intactos. Fuentesajenas/W3/W4/W5/recurso sin cambios. Siguiente:reproducir defecto comercial independiente o revisar otra capacidad individual respaldada,sin promocionesmasivas.'
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
