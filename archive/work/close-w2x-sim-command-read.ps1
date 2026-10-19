$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$repo=Join-Path $PSScriptRoot 'crm-w2x-commercial-composition'
Set-Location $root
if(Test-Path work/w2x-sim-command-read-close-requested.json){throw 'CLOSE_ALREADY_REQUESTED'}
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not(Test-Path work/w2x-sim-command-read-browser-exit.txt)){if($watch.Elapsed.TotalMinutes -gt 45){throw 'NO_TERMINAL114'};Start-Sleep -Seconds 5}
@{state='PREFLIGHT114'}|ConvertTo-Json|Set-Content work/w2x-sim-command-read-close-requested.json
python work/checkpoint-w2x-sim-command-read.py preflight
if($LASTEXITCODE){throw 'CONTROL_OR_SOURCE_FAILURE_PRESERVED_NO_COMMIT'}
node work/crm-w2x-commercial-composition/scripts/product/build-release-queue.mjs --check *> work/w2x-sim-command-read-queue.txt
if($LASTEXITCODE){throw 'QUEUE_FAILED'}
$cp=Get-Content work/w2x-sim-command-read-checkpoint.json -Raw|ConvertFrom-Json
$branch=$cp.branch
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints | ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'fix(sims): retire activation refresh with selected context'
if($LASTEXITCODE){throw 'COMMIT_FAILED'}
$sha=(git -C $repo rev-parse HEAD).Trim();$tree=(git -C $repo rev-parse 'HEAD^{tree}').Trim()
@{sha=$sha;tree=$tree;publication='LOCAL_COMMIT_PUSH_PENDING';handoffs=@()}|ConvertTo-Json -Depth 6|Set-Content work/w2x-sim-command-read-publication.json
git -C $repo push origin ('HEAD:refs/heads/'+$branch)
if($LASTEXITCODE){throw 'PUSH_UNCERTAIN_INSPECT'}
$bundle=Join-Path $PSScriptRoot 'w2x-sim-command-read.bundle'
git -C $repo bundle create $bundle HEAD
if($LASTEXITCODE){throw 'BUNDLE_FAILED'}
git -C $repo bundle verify $bundle
if($LASTEXITCODE){throw 'BUNDLE_VERIFY_FAILED'}
. ./work/CrmGitHub.ps1
$body='HANDOFF W2-X SIM/eSIM refresco activacion fuente '+$sha+' / arbol '+$tree+', CLAIM6203149786, rama '+$branch+', baseb431287d metadataTEL04019PARTIAL/src_testsff5e5a7. Original8:4FAIL referencia1440(fisica/eSIM,dos fases) y4vigentesPASS1.0min,delta0/1:comando pendiente inicia sim.get retirado;refresco pendiente inicia cliente/linea retirados. Recibo cerrado valido con version2/asociacion;confirmacion manual explicita previa,no provision externa. Refresco comprueba vigencia antes de primaria,reutiliza guardas entreprimaria/relaciones y protege setCore.Primer114 y controles conservados por intento:fixture adelantaba linea a2 sin escritor medido;SQL activa SIM/asociacion sin cambiar linea. Fixture final conserva linea1/SIM2, sin cambio de produccion ni causal atribuida a esa version.114/114 finales propias PASS:60 dos tipos/dosfases/cinco contextos390/768/1440 +54 regresiones carga inicial/sustitucion/scope. Vigente pasa a activo con version nueva,cuerpo exacto y una sola operacion. Build66/lint0errores3warnings visibles/scan/cola342_19PARTIAL_323sinreconciliar_0READY y bundle. VISUAL parcial:doce capturas corregidas fisica/eSIM,dosfases390/768/1440 realmente inspeccionadas;activo,ICCID/EID enmascarados,cliente/operador,linea yfecha legibles;controles inferiores moviles fuera de viewport,historial vacio sintetico no acredita asociacion persistida/ciclo completo. AuthDB/Storage/modeloNOT_RUN/API0. No cambia consulta inicial/sharedhelper/contratos/SQL/permisos/W3/W4/W5/recurso ni fuentes38/142/153/main. Global1065ff5e5a7 independiente,no heredado;original9816b469FAIL979+2complementarios/RCA2no cerrado,F736/B9 intactos. HIGH5/W4/ACKprincipal pendientes,IAwritesOFF/issue10OPEN/releaseNOT_ACCEPTED. Siguiente visual y revisionindividualTEL024 basada en75/capturas reales deff5e5a7 con nuevoCLAIM, no aceptacion masiva.'

$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$sha;tree=$tree;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 6|Set-Content work/w2x-sim-command-read-publication.json}
@{sha=$sha;tree=$tree;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 6|Set-Content work/w2x-sim-command-read-publication.json
python work/checkpoint-w2x-sim-command-read.py published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
