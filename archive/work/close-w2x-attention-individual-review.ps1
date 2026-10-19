$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-attention-individual-review';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='PREFLIGHT_ONCE'}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
python ('work/checkpoint-'+$prefix+'.py') preflight
if($LASTEXITCODE){throw 'METADATA_GUARDS_FAILED'}
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'docs(attention): reconcile TEL069 customer context evidence individually'
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
$body='TEL-069 Atención: revisión individual parcial. Metadata '+$sha+', árbol '+$tree+', rama '+$cp.branch+', CLAIM '+$cp.claim+'. Evidencia funcional exacta '+$cp.evidence_source+'.'+$nl+'Solo se añade una revisión: cola342,22PARTIAL,320sinreconciliar,0READY. Las21 revisiones previas,341 otras filas y campos globales de aceptación quedan idénticos; src/tests idénticos al padre, queue/diff/scan/bundle verificados. Runtime NOT_RUN en metadataSHA; no se repiten ni heredan verdes.'+$nl+'Alcance propio de la evidencia:78 controles HTTP de la fuente (27 contexto,18 identidad,33 regresiones), build66 y nueve capturas realmente vistas. Customer360 conserva cliente al entrar, filtro/cursores persisten en actualizar/paginar, limpieza explícita, identidad actual y denegación/reintento. IMPLEMENTED/CONSUMED_UI/VISUAL PARTIAL. Backend, navegador integral y seguridad NOT_RECONCILED; faltan siete familias completas, ventanas/prioridades completas, Auth/JWT/RLS, enrutamiento Next integrado, accesibilidad y W4. Las páginas vacías y los roles del fixture no acreditan datos ni permisos reales.'+$nl+'HIGH5 visibles, IA writesOFF, issue10OPEN y releaseNOT_ACCEPTED. F736/B9/981 original/primer210/script33 preservados. Global1266 de2741fb8 separado, sin herencia. Fuentes propietarias/PR38/142/153/main/W3/W4/W5/recurso intactos. Próximo defecto comercial reproducido con CLAIM propio, sin promociones masivas.'
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
