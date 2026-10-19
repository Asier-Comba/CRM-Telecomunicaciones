$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-company-billing-review';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='PREFLIGHT_ONCE'}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
python ('work/checkpoint-'+$prefix+'.py') preflight
if($LASTEXITCODE){throw 'METADATA_GUARDS_FAILED'}
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'docs(product): record individual company and billing evidence'
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
$body='Revisión individual W2-X76: datos de empresa y filtros de facturación. Metadata '+$sha+', árbol '+$tree+', rama '+$cp.branch+', CLAIM '+$cp.claim+'.' +$nl+'PAR-041 se añade como parcial con evidencia exacta194057f50a1d9d9ce60b8003065fa3c06cd7e5d3. De77 casos,9 Empresa son directamente pertinentes y68 contextuales. Ocho capturas:seis Empresa largas completas,ordinarioEmpresa1440 parcial yheader390 contextual. Geometría18 casos,no recuentosSQL. Revelación fiscal,edición/archivo,origen yroles/AuthDB/RLS siguen pendientes;mostrar botones no acepta operaciones. Funcionales NOT_RUN_UI_STYLE_ONLY en esa fuente.'+$nl+'PAR-103 conserva cuatro entradas previas,SHA primario y etapas. Añade fuente exactaa33a0e1dd609d15ab78fea2fd1a2e8e3c41fe6d4:156/156 browser2,9min,50/50funcionales753,2677ms,build66.93 directamente pertinentes,63 contextuales,sin aceptación integral. Nueve capturas de nombre completo/clear/403;no certifican visualmente todos los filtros. Original72=144PASS3FAILfixture+3PASScomplementarios permanece;156 completo es otra fuente realmente ejecutada. Positivooverdue mideflag,nofechas/cálculofinanciero real. SemánticaW1de72 pendiente revisión/consumo propietario.'+$nl+'Una fila nueva:342/30PARTIAL/312sinreconciliar/0READY. Guardas:28otras revisiones,340otrasfilas,globales,src/tests idénticos yPAR103original4/primario/etapas preservados. Queue/diff/scan/bundle propios. Runtime NOT_RUN en metadata;sin verdes repetidos ni heredados. Backend,navegador integral yseguridad sin aceptar.'+$nl+'HTTP/DTO sintético;AuthDB/JWT/RLS/SQL/Next integrado/modelo vivo NOT_RUN/API0. HIGH5/W4 pendientes,IA writesOFF,issue10OPEN,releaseNOT_ACCEPTED.1806fuente69PASS36,1min publicado;1842fuente72 único71901activo y1869fuente75waiter65756,sin resultado de metadata. Checkout14congelado,sin cancelar/duplicar. F736/B9/981/1266/fixtures/preparación conservados;fuentesajenas/PR38/142/153/main/W3/W4/W5/recurso intactos. Siguiente:reproducir defectos comerciales de listado/contactos de Customer360 antes de corregir.'

foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}



