$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-customer-summary-review';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='PREFLIGHT_ONCE'}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
python ('work/checkpoint-'+$prefix+'.py') preflight
if($LASTEXITCODE){throw 'METADATA_GUARDS_FAILED'}
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'docs(customer360): reconcile TEL068 summary consumption individually'
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
$body='TEL-068 customer360.summary: revisión individual parcial. Metadata '+$sha+', árbol '+$tree+', rama '+$cp.branch+', CLAIM '+$cp.claim+'. Evidencia exacta '+$cp.evidence_source+'.'+$nl+'Solo una fila:cola342,23PARTIAL,319sinreconciliar,0READY. Se conservan22 revisiones previas,341 otras filas y campos globales;src/tests iguales al padre y blobs Overview/test iguales al SHA de evidencia. Queue/diff/scan/bundle verificados. Runtime NOT_RUN metadataSHA, sin heredar ni repetir verdes.'+$nl+'Fuente de evidencia propio78/build66: colección real contrastada27 contextoAtención+18 identidad+18 postcomando+6 ordenrecarga+9 scopeCustomer360. Resumen A/B/C sintético contratos11/22/33, otros1; respuestas B retenidas no restauran datos después de C,403 D retira recuentos previos. Tres capturas overview390/768/1440 realmente vistas muestran C33 y demás KPIs/fecha legibles, prioridades plegadas. Controles de referencia/rawUUID del fixture se excluyen de la revisión de producto. Una cifra preliminar de desglose24+3 se corrigió antes de publicar contra colección9+18+6, snapshot local conservado;sin nueva ejecución.'+$nl+'IMPLEMENTED/CONSUMED_UI/VISUAL PARTIAL. Backend/navegador integral/seguridad NOT_RECONCILED: faltan recuentos persistidos exactos/todas categorías/estados/orígenes, recuentos protegidos bajo roles reales, todas pestañas,JWT/RLS/rutaNext/accesibilidad/W4. HTTP controlado no acredita esos aspectos. Modelo vivoNOT_RUN,API0. Global1311de4221edc activo separado. Original1266de2741fb8 permaneceFAIL1253PASS13FAIL,con13complementariosPASS16.1s mismoSHA;no1266singlePASS. HIGH5/IAwritesOFF/issue10OPEN/releaseNOT_ACCEPTED;F736/B9/981 original/primer210/script33 intactos. Fuentes ajenas/W3/W4/W5/recurso sin cambios. Siguiente defecto comercial reproducido con CLAIM propio.'
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
