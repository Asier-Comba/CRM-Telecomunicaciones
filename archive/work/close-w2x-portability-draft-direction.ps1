$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
Set-Location $root
if(Test-Path work/w2x-portability-draft-direction-close-requested.json){throw 'CLOSE_ALREADY_REQUESTED'}
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not(Test-Path work/w2x-portability-draft-direction-browser-exit.txt)){if($watch.Elapsed.TotalMinutes -gt 45){throw 'NO_TERMINAL39'};Start-Sleep -Seconds 5}
@{state='PREFLIGHT39'}|ConvertTo-Json|Set-Content work/w2x-portability-draft-direction-close-requested.json
python work/checkpoint-w2x-portability-draft-direction.py preflight
if($LASTEXITCODE){throw 'CONTROL_OR_SOURCE_FAILURE_PRESERVED_NO_COMMIT'}
node work/crm-w2x-document-upload-uncertain/scripts/product/build-release-queue.mjs --check *> work/w2x-portability-draft-direction-queue.txt
if($LASTEXITCODE){throw 'QUEUE_FAILED'}
$cp=Get-Content work/w2x-portability-draft-direction-checkpoint.json -Raw|ConvertFrom-Json
$branch=$cp.branch
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- src/features/portabilities/Portabilities.tsx tests/e2e-preview/portability-parent-read-lifetime.spec.ts docs/master/W2X_PORTABILITY_DRAFT_DIRECTION_20261015.md
git -C $repo commit -m 'fix(portabilities): bind draft operator side to linked line'
if($LASTEXITCODE){throw 'COMMIT_FAILED'}
$sha=(git -C $repo rev-parse HEAD).Trim();$tree=(git -C $repo rev-parse 'HEAD^{tree}').Trim()
@{sha=$sha;tree=$tree;publication='LOCAL_COMMIT_PUSH_PENDING';handoffs=@()}|ConvertTo-Json -Depth 6|Set-Content work/w2x-portability-draft-direction-publication.json
git -C $repo push origin ('HEAD:refs/heads/'+$branch)
if($LASTEXITCODE){throw 'PUSH_UNCERTAIN_INSPECT'}
$bundle=Join-Path $PSScriptRoot 'w2x-portability-draft-direction.bundle'
git -C $repo bundle create $bundle HEAD
if($LASTEXITCODE){throw 'BUNDLE_FAILED'}
git -C $repo bundle verify $bundle
if($LASTEXITCODE){throw 'BUNDLE_VERIFY_FAILED'}
. ./work/CrmGitHub.ps1
$body='HANDOFF W2-X borrador portabilidad fuente'+$sha+' / arbol'+$tree+', CLAIM6202367152, rama'+$branch+', based56ae412. Regla SQL existente:entrada fija destino al operador de linea, salida fija origen.6 causales originales390/768/1440 entrada/salida mostraron selector ligado habilitado, antes de comando; preservadas. OperatorFields privado fija solo lado del borrador y explica por que; revision comprueba operador ligado al contexto. Lado alternativo mutable, vacio/igual bloquean.39/39 propias PASS:6 flujos por direccion/ancho con campos fijos, cuerpos donor/target/expected_version validos y403 controlado que permite cancelar +33 regresiones actuales. Build66/lint0errores3warnings visibles/scan/cola342_16PARTIAL_326sinreconciliar_0READY y bundle. VISUAL NOT_REVIEWED hasta inspeccion real. Alta/helper/SQL/permisos no modificados ni aceptados por este alcance; HTTP controlado, AuthDB/Storage/modeloNOT_RUN/API0. Global6b469 conserva979+2 complementarios y981FAIL original/RCA2no cerrado, no heredado. HIGH5/W4/ACK principal pendientes,IAwritesOFF/issue10OPEN/releaseNOT_ACCEPTED;fuentes38/142/153/main/W3/W4/W5/recurso intactos. Siguiente revision visual y reconciliacion individualPAR073CLAIM6202518221 en checkout14, componer esta fuente antes de finalizar metadata.'
$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$sha;tree=$tree;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 6|Set-Content work/w2x-portability-draft-direction-publication.json}
@{sha=$sha;tree=$tree;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 6|Set-Content work/w2x-portability-draft-direction-publication.json
python work/checkpoint-w2x-portability-draft-direction.py published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
