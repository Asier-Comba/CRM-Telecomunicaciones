$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-human-review-individual';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='PREFLIGHT_ONCE'}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
python ('work/checkpoint-'+$prefix+'.py') preflight
if($LASTEXITCODE){throw 'METADATA_GUARDS_FAILED'}
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'docs(billing): reconcile PAR141 manual review gate individually'
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
$body='PAR-141 revisión humana: revisión individual parcial. Metadata '+$sha+',árbol '+$tree+',rama '+$cp.branch+',CLAIM '+$cp.claim+'. Evidencia exacta '+$cp.evidence_source+'.'+$nl+'Unafila:342/26PARTIAL/316sinreconciliar/0READY;25reviews/341otrasfilas/globales idénticos,src/tests intactos al padre,queue/diff/scan/bundlePASS. RuntimeNOT_RUN metadataSHA,sin repetir/heredar verdes.'+$nl+'Gate manual del borrador:propuesta unchecked/GuardarDisabled;revisión marcada habilita guardar;editar notas después desmarca ybloquea;edición de concepto/cantidad/precio requiere revisar. Solo clickmanual revisado envía valores editados yconsume recibo/readback estrictos. Ningún invoice.issue. FuenteDD6233C:primer9FAIL3/6porfixture data frente receipt,solo3fallidos recheck3PASS10.5s;6+3complementarios,no9singlePASS. Producto intacto/build66/lint0errores3warnings/scan propios deesa fuente.'+$nl+'Cinco capturas realmente vistas deDD6233C:guardar editado3anchos,revisión invalidada390/1440,inferior drawer. IMPLEMENTED/CONSUMED_UI/VISUAL PARTIAL;backend/navegador integral/seguridad NOT_RECONCILED. No aceptados emisión real/confirmación/roles/enforcement servidor,todos los campos/entradas,AuthDB/JWT/RLS/persistencia/visual completa/accesibilidad/W4. BotónEmitirdisabled no prueba gate backend seguro. Parser local/modelo vivoNOT_RUN/API0;HTTP controlado no SQL.'+$nl+'Global1362FA3PASS propio,no herencia. HIGH5/W4/IAwritesOFF/issue10OPEN/releaseNOT_ACCEPTED. OriginalesF736/B9/981/1266yfixture45 intactos;fuentes ajenas/W3/W4/W5/recurso sin cambios. Siguiente:recorrido comercial independiente con defecto reproducido;no añadir helpers/pantallas ni repetir verdes sin motivo.'
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
