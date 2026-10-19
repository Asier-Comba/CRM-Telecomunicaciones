$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-contract-create-read-retirement';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=12245}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not(Test-Path ('work/'+$prefix+'-build-exit.txt'))){if($watch.Elapsed.TotalMinutes -gt 45){throw 'NO_TERMINAL_CONTROLS'};Start-Sleep -Seconds 5}
python ('work/checkpoint-'+$prefix+'.py') preflight
if($LASTEXITCODE){throw 'CONTROLS_OR_FINGERPRINT_FAILURE_PRESERVED'}
node work/crm-w2x-document-upload-uncertain/scripts/product/build-release-queue.mjs --check *> ('work/'+$prefix+'-queue.txt')
if($LASTEXITCODE){throw 'QUEUE_FAILED'}
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'fix(contracts): avoid starting dependent read after create form unmount'
if($LASTEXITCODE){throw 'COMMIT_FAILED'}
$sha=(git -C $repo rev-parse HEAD).Trim();$tree=(git -C $repo rev-parse 'HEAD^{tree}').Trim()
$publication=@{sha=$sha;tree=$tree;publication='LOCAL_COMMIT_PUSH_PENDING';handoffs=@()}
$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
git -C $repo push origin ('HEAD:refs/heads/'+$cp.branch)
if($LASTEXITCODE){throw 'PUSH_UNCERTAIN_INSPECT_NO_RETRY'}
$bundle=Join-Path $PSScriptRoot ($prefix+'.bundle');git -C $repo bundle create $bundle HEAD
if($LASTEXITCODE){throw 'BUNDLE_FAILED'}
git -C $repo bundle verify $bundle
if($LASTEXITCODE){throw 'BUNDLE_VERIFY_FAILED'}
. ./work/CrmGitHub.ps1
$nl=[string][char]10+[char]10
$body='HANDOFF W2-X86 — Contratos: retirar la lectura dependiente cuando se desmonta el formulario.'+$nl+'Fuente '+$sha+'; árbol '+$tree+'; rama '+$cp.branch+'; padre '+$cp.base+'; CLAIM '+$cp.claim+'. Controles propios: '+$cp.browser_summary+' (15 casos nuevos y 141 regresiones), build 66, lint, scan, diff, cola y bundle verificado. Funcionales: NOT_RUN_UI_COMPONENT_LIFETIME_BEFORE_DEPENDENT_READ.'+$nl+'Reproducción conservada: 4 FAIL y 1 PASS en 48,6 s, con log, exit, banco y cinco observaciones. Al cambiar cliente, empresa, actor o rol, el formulario anterior iniciaba portfolio.get después de recibir la creación. El contexto actual era el positivo. Una referencia local de montaje impide iniciar esa lectura tras desmontar. No cancela la creación ni una consulta ya emitida. El banco final es idéntico al causal; la extensión reutiliza el fixture HTTP existente.'+$nl+'En los quince escenarios a 390/768/1440 se mantiene un comando y un efecto sintético. Los doce contextos retirados no inician la lectura; los tres actuales consultan una vez y muestran el enlace al ID exacto. Quince capturas revisadas: tabla vacía declarada en el fixture y estado/enlace registrado en el contexto actual; no hay filas reales ejercitadas. El cambio de ámbito simula el desmontaje del Provider. No acredita revocación real, Auth/DB/JWT/RLS/SQL, Next integrado, ausencia/quiescencia nativa, reinicio, handler o full23. Modelo vivo NOT_RUN; API 0.'+$nl+'Los controles 1908/source80 y 1968/source84 conservan sus pines; 1968 no contiene las correcciones 85/86. Colección coalescida preparada: 2007 pruebas / 116 archivos; solicitar una sola ejecución tras 1968 terminal/PUBLISHED/PASS y esta fuente publicada. 1992 quedó preparado sin ejecución. Matriz: 342 requisitos, 31 PARTIAL, 311 sin reconciliar, 0 READY. Cinco HIGH y revisión W4 pendientes; IA comercial writes OFF, issue10 OPEN, release NOT_ACCEPTED. F736/B9 y las evidencias de fallos anteriores mantienen su alcance. Consumo en principal pendiente de ACK exacto; ramas y fuentes ajenas intactas.'

foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}









