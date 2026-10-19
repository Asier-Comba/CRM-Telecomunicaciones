$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$repo=Join-Path $PSScriptRoot 'crm-w2x-commercial-composition'
Set-Location $root
if(Test-Path work/w2x-sim-parent-read-close-requested.json){throw 'CLOSE_ALREADY_REQUESTED'}
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not(Test-Path work/w2x-sim-parent-read-browser-exit.txt)){if($watch.Elapsed.TotalMinutes -gt 45){throw 'NO_TERMINAL54'};Start-Sleep -Seconds 5}
@{state='PREFLIGHT54'}|ConvertTo-Json|Set-Content work/w2x-sim-parent-read-close-requested.json
python work/checkpoint-w2x-sim-parent-read.py preflight
if($LASTEXITCODE){throw 'CONTROL_OR_SOURCE_FAILURE_PRESERVED_NO_COMMIT'}
node work/crm-w2x-commercial-composition/scripts/product/build-release-queue.mjs --check *> work/w2x-sim-parent-read-queue.txt
if($LASTEXITCODE){throw 'QUEUE_FAILED'}
$cp=Get-Content work/w2x-sim-parent-read-checkpoint.json -Raw|ConvertFrom-Json
$branch=$cp.branch
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- src/features/sims/Sims.tsx tests/e2e-preview/fixtures/telecom-resource-entry.tsx tests/e2e-preview/sim-parent-read-lifetime.spec.ts docs/master/W2X_SIM_PARENT_READ_LIFETIME_20261015.md
git -C $repo commit -m 'fix(sims): retire initial relationship reads with selected context'
if($LASTEXITCODE){throw 'COMMIT_FAILED'}
$sha=(git -C $repo rev-parse HEAD).Trim();$tree=(git -C $repo rev-parse 'HEAD^{tree}').Trim()
@{sha=$sha;tree=$tree;publication='LOCAL_COMMIT_PUSH_PENDING';handoffs=@()}|ConvertTo-Json -Depth 6|Set-Content work/w2x-sim-parent-read-publication.json
git -C $repo push origin ('HEAD:refs/heads/'+$branch)
if($LASTEXITCODE){throw 'PUSH_UNCERTAIN_INSPECT'}
$bundle=Join-Path $PSScriptRoot 'w2x-sim-parent-read.bundle'
git -C $repo bundle create $bundle HEAD
if($LASTEXITCODE){throw 'BUNDLE_FAILED'}
git -C $repo bundle verify $bundle
if($LASTEXITCODE){throw 'BUNDLE_VERIFY_FAILED'}
. ./work/CrmGitHub.ps1
$body='HANDOFF W2-X SIM/eSIM fuente'+$sha+' / arbol'+$tree+', CLAIM6202649389, rama'+$branch+', basef5e167b metadata17PARTIAL/src_tests=parentd889. Originales fisica/eSIM activas asociadas:sim.getA pendiente/abrirB/liberarA inicia cliente/lineaA;2FAIL delta0/1 junto con2vigentesPASS20.3s, datos validos en parsers y evidencia preservada. Carga inicial comprueba vigencia antes de relaciones y al devolver. Proveedor de fixture reutilizado reset_scope=1 opt-in, default anterior; helperreadLineContext/SQL/comandos/permisos intactos.54/54 propias PASS:30 fisica/eSIM referencia/empresa/actor/lector/vigente por390/768/1440 +18 sustitucion +6scopeSIM/incidencias actuales. Deltas medidos con IDs coincidentes, no cerosSQL; comandos por operacion de dominio, no URLsupuesto. Build66/lint0errores3warnings/scan/cola342_17PARTIAL_325sinreconciliar_0READY y bundle. VISUAL NOT_REVIEWED hasta inspeccion real. AuthDB/Storage/modeloNOT_RUN/API0; postcomando/helperinterno/aprovisionamiento externo no acreditados. Global999d889 independiente no heredado; original9816b469FAIL979+2complementarios/RCA2no cerrado intacto. HIGH5/W4/ACK principal pendientes,IAwritesOFF/issue10OPEN/releaseNOT_ACCEPTED;fuentes38/142/153/main/W3/W4/W5/recurso intactos. Siguiente visual y nueva unidad independiente conCLAIM.'

$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$sha;tree=$tree;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 6|Set-Content work/w2x-sim-parent-read-publication.json}
@{sha=$sha;tree=$tree;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 6|Set-Content work/w2x-sim-parent-read-publication.json
python work/checkpoint-w2x-sim-parent-read.py published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
