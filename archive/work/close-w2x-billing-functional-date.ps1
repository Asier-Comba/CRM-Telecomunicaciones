$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-billing-functional-date';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='PREFLIGHT_ONCE'}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
python ('work/checkpoint-'+$prefix+'.py') preflight
if($LASTEXITCODE){throw 'METADATA_GUARDS_FAILED'}
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'test(billing): resolve current date callback in proposal assertions'
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
$body='HANDOFF W2-X60 — adaptador funcional de fecha. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', base '+$cp.base+'. CLAIM6251822244 y ampliación '+$cp.claim_amendment+'.'+$nl+'Originales fuente58 b34f6d60b9b64a5ba218376ef0a8038c6135e39f: seis bancos funcionales,35PASS/5FAIL de40 en770,0598ms; log/exit1 preservados. Cinco variantes proposal: adaptador AST pasaba función asOf como fecha al parser, mientras PromptBuilder la invoca al generar. Causa exacta del test, no reproducción de fecha errónea del producto. Base59 tenía src/tests idénticos a58.'+$nl+'Solo se adapta el consumo del callback en el test, con aserciones adicionales tipo/fecha y sin quitar cliente/fecha/vencimiento15días. Cinco fallidos propios5/5PASS617,5855ms;35verdes no repetidos. SHAs distintos: no40PASS agregado ni complemento del mismoSHA. Src/cola/revisiones intactos por guardas; lint archivo/diff/scan/cola/bundle propios. Build/navegador/visual NOT_RUN por cambio exclusivo test, sin heredar build66/browser63de58.'+$nl+'Stubs/servicios/parser/HTTP/PDF locales, no Supabase/AuthDB/JWT/RLS real, modelo vivoNOT_RUN/API0. Global1479fuente53 PASS1479/32,5min publicado, global1575fuente57 activo una vez; controles separados y defectos posteriores documentados, sin aceptación integral.342/27PARTIAL/315sinreconciliar/0READY; cincoHIGH/W4 pendientes, IA writesOFF, issue10OPEN, releaseNOT_ACCEPTED. F736/B9/981/1266/fixtures/preparación intactos. Fuentes ajenas/PR38/142/153/main/W3/W4/W5/recurso sin cambios. Próximo: continuar defecto comercial independiente y cerrar global1575 sin cancelar/duplicar, conservando validación completa pendiente de fuente58.'
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}


