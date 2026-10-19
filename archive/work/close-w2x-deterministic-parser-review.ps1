$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-deterministic-parser-review';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='PREFLIGHT_ONCE'}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
python ('work/checkpoint-'+$prefix+'.py') preflight
if($LASTEXITCODE){throw 'METADATA_GUARDS_FAILED'}
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'docs(billing): reconcile deterministic parser individually'
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
$body='PAR-135 — parser determinista: revisión individual parcial. Metadata '+$sha+', árbol '+$tree+', rama '+$cp.branch+', CLAIM 6252380985. Fuentes diferenciadas 56fbaee765fb4681aa43943cec4e305eb2afbd67 y d65880a3af08bcc861d14846d399a75235f65a76.'+$nl+'Solo una fila nueva: 342 requisitos, 28 PARTIAL, 314 sin reconciliar y 0 READY. Las 27 revisiones previas, 341 otras filas, campos globales y src/tests permanecen idénticos por guardas. Queue/diff/scan/bundle propios; runtime NOT_RUN en metadataSHA. Implementación, consumo y visual parciales; backend, navegador integral y seguridad sin aceptar.'+$nl+'Fuente63: 144 browser y 24 funcionales propios para descuentos, IVA/IRPF y frontera IVA0. Fuente65: 99 browser y 49 funcionales propios para avisos/procedencia, contexto, fecha y revisión manual. No se suman como243PASS de65 ni se heredan a metadata. De18 casos totalcero, solo9creaciones usan parser;9ediciones son contexto. Cada ejecución conserva SHA y límites.'+$nl+'Catorce capturas ya vistas con hashes/fuentes conservados: seis inferiores/rechazo de63 y ocho superiores/procedencia de65; no aceptación del editor completo, gramática completa, accesibilidad, fiscalidad, rutas Next o seguridad independiente. Faltan formatos no cubiertos/conflictos/combinaciones completas/voz y AuthDB/JWT/RLS/W4. Parser local determinista, no IA viva ni autoridad de escritura; revisión manual obligatoria. Modelo vivo NOT_RUN/API0.'+$nl+'Global1755 fuente64 activo85193; único1773 fuente65 en espera76632 tras1755terminal/publicadoPASS;checkout14 congelado, sin duplicación ni cancelación. Cinco HIGH/W4 pendientes, IA writes OFF, issue10 OPEN, release NOT_ACCEPTED. F736/B9/981/1266 y fallos propios/históricos intactos. Fuentes ajenas/PR38/142/153/main/W3/W4/W5/recurso intactos. Siguiente: continuar capacidad comercial o defecto reproducido con aceptación individual, sin promociones masivas ni repetir verdes.'
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}


