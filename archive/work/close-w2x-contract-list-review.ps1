$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-contract-list-review';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='PREFLIGHT_ONCE'}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
python ('work/checkpoint-'+$prefix+'.py') preflight
if($LASTEXITCODE){throw 'METADATA_GUARDS_FAILED'}
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'docs(contracts): reconcile TEL018 invoice consumer individually'
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
$body='TEL-018 contract.list: revisión individual parcial de consumidor Facturación. Metadata '+$sha+', árbol '+$tree+', rama '+$cp.branch+', CLAIM '+$cp.claim+'. Evidencia funcional exacta '+$cp.evidence_source+'.'+$nl+'Solo una fila:cola342,24PARTIAL,318sinreconciliar,0READY.23 revisiones previas,341otrasfilas y campos globales idénticos;src/tests idénticos al padre,queue/diff/scan/bundle verificados. RuntimeNOT_RUN metadataSHA,sin repetir ni heredar verdes.'+$nl+'Evidencia propia36/build66:12 puntos seleccionados+15 contratos/paginación+9 preparación. Cliente/limit20/id_asc,after20→21 yafter20/limit1 para punto,etiquetas de operador,comprobación pendiente/resultado actual,onVerified real.403/cliente distinto no publican vínculo verificado;lista denegada/mismatch recuperan con Actualizar;operador denegado conserva etiqueta genérica,sin inventar identidad. Siete capturas actuales realmente vistas:pendiente3anchos,válido/denegado390/1440;componente aislado yJSON/UUIDs del fixture excluidos de producto.'+$nl+'IMPLEMENTED/CONSUMED_UI/VISUAL PARTIAL. Backend/navegador integral/seguridad NOT_RECONCILED;faltan inventario completo/otros consumidores,todos estados/orígenes/roles,datos persistidos exactos,JWT/RLS/Next integrado/accesibilidad/W4. Histórico backend e09ddf2 se conserva,sin herencia a esta fuente. HTTP controlado no acredita ausencia o permiso real;modelo vivoNOT_RUN/API0.1311de4221edc cerradoPASS propio,1362deFA3 separado. Original1266de2741fb8 permaneceFAIL1253PASS13FAIL+13complementariosPASS16.1s mismoSHA;no1266singlePASS. HIGH5/IAwritesOFF/issue10OPEN/releaseNOT_ACCEPTED;F736/B9/981 original/primer210/script33/source41harness intactos. Fuentes ajenas/W3/W4/W5/recurso sin cambios. Siguiente defecto comercial:investigar error de lectura que persiste tras refresco exitoso,sin borrar errores de identidad/comando ajenos yconCLAIM/reproducción propios.'
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
