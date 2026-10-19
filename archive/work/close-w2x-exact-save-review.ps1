$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-exact-save-review';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='PREFLIGHT_ONCE'}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
python ('work/checkpoint-'+$prefix+'.py') preflight
if($LASTEXITCODE){throw 'METADATA_GUARDS_FAILED'}
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'docs(billing): record exact preview evidence for PAR105'
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
$body='PAR-105 — actualización individual con previsión exacta. Metadata '+$sha+', árbol '+$tree+', rama '+$cp.branch+', CLAIM '+$cp.claim+'. Evidencia nueva b34f6d60b9b64a5ba218376ef0a8038c6135e39f; registros históricos45738AB/1816C21 intactos.'+$nl+'Una sola fila actualizada;26otras revisiones/341otras filas/globales idénticos, src/tests idénticos al padre. Matriz342/27 PARTIAL/315sinreconciliar/0 READY; sin cambios de estados ni promociones. Queue/diff/scan/bundle PASS. Runtime NOT_RUN en metadataSHA; no herencia ni repetición de verdes.'+$nl+'Fuente58:63/63 en1,7 min y build66 propios, lint0errores/3warnings. Precisión inválida y exceso del contrato impiden guardar sin previsión; corregir resetea revisión y revisar de nuevo permite un comando manual simulado/lectura484. Original2FAIL/1PASS50,6s fuente2a85975 conservado; no escrituraSQL inválida reproducida. Banco incluye recibos/recuperación registrada/revisión de propuesta. El histórico12+6complementario1816C21 permanece así.'+$nl+'Seis capturas inferiores realmente vistas en390/768/1440: conceptos/importes, totales no disponibles, aviso, revisión y Guardar deshabilitado. Superior cliente/fiscal/fechas y positivos corregidos sin nueva aceptación visual individual. HTTP/DTO sintético; persistenciaAuthDB/idempotenciaSQL/todosroles/JWT/RLS/validacionescompletas/Next/accesibilidad/fiscal/W4 pendientes; modelo vivo NOT_RUN/API0.'+$nl+'Fallo de preparación preservado: comprobación inicial detectó cola obsoleta porque faltó --write; preflight rechazó correctamente su ruta ausente. Tras leer modosCLI se regeneró explícitamente y pasó --check y guardas, sin tocar producto ni repetir navegador. HIGH5/W4 pendientes, IA writesOFF, issue10OPEN, releaseNOT_ACCEPTED. Globals1479fuente53/1575fuente57 separados, con limitaciones conocidas. F736/B9/981/1266/fixtures intactos. Fuentes ajenas/main/PR38/142/153/W3/W4/W5/recurso intactos. Siguiente: reproducción comercial independiente y cierre de globals propios sin duplicación ni cancelación.'
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}

