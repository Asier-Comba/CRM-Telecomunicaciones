$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-assistant-panel-review';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='PREFLIGHT_ONCE'}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
python ('work/checkpoint-'+$prefix+'.py') preflight
if($LASTEXITCODE){throw 'METADATA_GUARDS_FAILED'}
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'docs(product): record partial contextual assistant evidence'
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
$body='Revisión individual W2-X81: PAR-209, panel contextual del asistente. Metadata '+$sha+', árbol '+$tree+', rama '+$cp.branch+', CLAIM '+$cp.claim+'. La evidencia funcional conserva fuente80 7218b7bc6d3a079feb8b8f457edbf48045fa02a0. Runtime NOT_RUN en esta metadata; ningún PASS heredado.'+$nl+'Se añade una sola fila parcial. De107 pruebas propias de80,9 son directamente pertinentes: nombre largo/ordinario/403 a390/768/1440. Las98 restantes son contexto(27 C360,59 regresiones,12 Documentos). Identidad ordinaria antes del resumen/atención;enlace eID exactos;403 sin identidad ni lecturas dependientes. Causal1FAIL1PASS24,2s y desbordamiento390/871 conservados. Build66/lint0errores3warnings/scan en fuente80;funcionalesNOT_RUN_UI_STYLE_ONLY.'+$nl+'Nueve capturas de fuente80 vistas yseis medidas positivas. Componente montado directamente con HTTP controlado;no shell completo del asistente. Counts1/null/0página son fixtures declarados;no mediciones SQL,ausencia,modelo,RAG,razonamiento,autoridad ni seguridad. No links/refresh invocados en estas9;revisiones de estados,roles,accesibilidad yW4 permanecen pendientes. IMPLEMENTED/CONSUMED_UI/VISUAL_ACCEPTED=PARTIAL;backend,navegador integral yseguridad=NOT_RECONCILED;EXTERNAL_BLOCKED=BLOCKED.'+$nl+'Guardias propias:30 revisiones anteriores,341 filas ajenas,fuentes/política/blockers globales ysrc/tests idénticos. Queue write/check,diff/scan/bundle;342/31PARTIAL/311sinreconciliar/0READY. Fuentes comerciales:78 988c0ba(165browser;Node50PASS1FAIL+2recheck complementarios49+2),79 46c51d1(162browser;lint4conservado/errata80),80 7218b7b(107browser). Semántica78 pendiente revisión/consumo W1. Son alcances funcionales propios,no release.'+$nl+'1869source75 único65756,1887source78 waiter46411 y1908source80 waiter56843 conservan sus pines yresultados propios;no retarget,cancelación,duplicación ni herencia en metadata81. AuthDB/JWT/RLS/SQL/Nextintegrado/modelo vivo NOT_RUN/API0,HIGH5/W4 pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. F736/B9/981/1266/fixtures/preparación conservados. Ramas/fuentes ajenas,PR38/142/153/main/W3core/W4/W5/recurso intactos. Continuar otra unidad W2 útil después del checkpoint.'

foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}



