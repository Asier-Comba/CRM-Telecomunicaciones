$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-portability-recovery-review';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='PREFLIGHT_ONCE'}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
python ('work/checkpoint-'+$prefix+'.py') preflight
if($LASTEXITCODE){throw 'METADATA_GUARDS_FAILED'}
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'docs(product): record exact portability recovery evidence'
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
$body='Revisión individual W2-X89 — TEL-040 portability.create. Metadata '+$sha+'; árbol '+$tree+'; rama '+$cp.branch+'; CLAIM '+$cp.claim+'. Evidencia funcional y visual de fuente88 ddf5501af84e91951349e7991cf013e6427cff2b. Runtime NOT_RUN en esta metadata; ningún PASS heredado.'+$nl+'Se añaden solo2evidencias SOURCE/VISUAL a la fila existente. Se conservan sus2anteriores,source_sha primario,stages,permisos ybloqueos;30revisiones y341filas ajenas idénticas. Matriz342/31PARTIAL/311sinreconciliar/0READY. Ninguna etapa promovida ni aceptación integral.'+$nl+'Fuente88:189propios5,4min;24flujos de recuperación del alta y12de número protegido,153contextuales. No189capacidades. Incertidumbre conserva orden,recibo+503 solo consulta,403 permite salida ynueva confirmación. Escape cancela por niveles sin perder el padre;reabrir está vacío. Solo efectos sintéticos,DOM yHTTP controlado con componentes/repositorio/parsers reales. No AuthDB/JWT/RLS/SQL,idempotencia persistida,operador real,borrado de memoria,almacenamiento protegido oW4.'+$nl+'28capturas realmente vistas de fuente88:12del número y16adicionales del propio189de88,distintas de las de87. Mobilefooter/topdeformulario recortados según escenario;error de lectura en escritorio bajo elviewport;padre desenfocado porDOM yselector nuevo cerrado porDOM. No aceptación completa de accesibilidad,roles oprivacidad. Hashes individuales en el documento.'+$nl+'Originales conservados:6FAIL2PASS del cierre raíz en6ab61af;2FAIL1PASS30,6s del número en1fd0d94;primer186=183PASS3FAIL6,2min,contraste exacto87 Escape1FAIL/Tab1PASS25,3s ypreloadNOT_RUN separado. El189 uniforme es de la fuente corregida88,no convierte186enPASS. Guardias,queuewrite/check,diff,scan ybundle propios de metadata;sin repetir189. Global1968/source84 único42972,2007/source86 waiter41016 y2043/source88 waiter93361 mantienen pines y controles. HIGH5/W4 pendientes,IA writes OFF,issue10 OPEN,release NOT_ACCEPTED,modelo vivo NOT_RUN/API0. F736/B9 y evidencias anteriores mantienen sualcance. Main,PR38/142/153 yfuentesW3/W4/W5 intactas;consumo principal pendiente de ACK exacto. Continuar otra unidad comercial reproducida.'

foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}



