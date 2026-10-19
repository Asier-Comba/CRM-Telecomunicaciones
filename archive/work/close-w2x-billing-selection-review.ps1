$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-billing-selection-review';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='PREFLIGHT_ONCE'}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
python ('work/checkpoint-'+$prefix+'.py') preflight
if($LASTEXITCODE){throw 'METADATA_GUARDS_FAILED'}
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'docs(billing): retain individual selection evidence'
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
$body='PAR-103 — ampliación individual de búsqueda/selección. Metadata '+$sha+', árbol '+$tree+', rama '+$cp.branch+', CLAIM6252941414. Evidencia exacta4964b61330e7f3abeb86349c9c3cb1f9260ca728.'+$nl+'Se añaden2entradas;las2fuente67,SHAprimario yetapas conservados.28otras revisiones/341otrasfilas/globales/src/tests idénticos;342/29PARTIAL/313sinreconciliar/0READY,sin promoción. RuntimeNOT_RUN metadata,queue/diff/scan/bundle propios.'+$nl+'Fuente69 own111browser2,2min/49funcionales874,1793ms/build66/lint0errores3warnings/scan.15nuevos directamente pertinentes,96contextuales:buscarotra/vacía/coincidente conservaA ytexto,sustituyeobsoletos;seleccionarBlimpiaintención;403desverifica/bloquea. Nueve capturas realmente vistas3907681440 otra/cambio/denegación;selectcerrado porDOM,móvilinferiorrecortado,fixturevacío noausenciaSQL,bannerexcluido. Visual parcial. Primer3FAILfixture ycausal corregido2FAIL1PASS29,6s separados,originales conservados.'+$nl+'Faltan filasreales/paginación/periodos/estados/finanzasreales/roles/AuthDB/JWT/RLS/Next/accesibilidad/W4;modelovivo/vozNOT_RUN/API0.1773fuente65PASS34,4min publicado sin67/69;1806fuente69único18288activo,checkout14congelado,sinheredar/cancelar/duplicar. HIGH5/W4,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. F736/B9/981/1266/fixtures/preparación intactos;fuentesajenas/W3/W4/W5/recurso intactos. Continuar defecto comercial reproducido útil.'

foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}



