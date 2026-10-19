$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
Set-Location $root
if(Test-Path work/w2x-sim-assignment-selection-close-requested.json){throw 'CLOSE_ALREADY_REQUESTED'}
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not(Test-Path work/w2x-sim-assignment-selection-browser-exit.txt)){if($watch.Elapsed.TotalMinutes -gt 45){throw 'NO_TERMINAL120'};Start-Sleep -Seconds 5}
@{state='PREFLIGHT120'}|ConvertTo-Json|Set-Content work/w2x-sim-assignment-selection-close-requested.json
python work/checkpoint-w2x-sim-assignment-selection.py preflight
if($LASTEXITCODE){throw 'CONTROL_OR_SOURCE_FAILURE_PRESERVED_NO_COMMIT'}
node work/crm-w2x-document-upload-uncertain/scripts/product/build-release-queue.mjs --check *> work/w2x-sim-assignment-selection-queue.txt
if($LASTEXITCODE){throw 'QUEUE_FAILED'}
$cp=Get-Content work/w2x-sim-assignment-selection-checkpoint.json -Raw|ConvertFrom-Json
$branch=$cp.branch
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints | ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'fix(sims): revalidate line selection before assignment review'
if($LASTEXITCODE){throw 'COMMIT_FAILED'}
$sha=(git -C $repo rev-parse HEAD).Trim();$tree=(git -C $repo rev-parse 'HEAD^{tree}').Trim()
@{sha=$sha;tree=$tree;publication='LOCAL_COMMIT_PUSH_PENDING';handoffs=@()}|ConvertTo-Json -Depth 6|Set-Content work/w2x-sim-assignment-selection-publication.json
git -C $repo push origin ('HEAD:refs/heads/'+$branch)
if($LASTEXITCODE){throw 'PUSH_UNCERTAIN_INSPECT'}
$bundle=Join-Path $PSScriptRoot 'w2x-sim-assignment-selection.bundle'
git -C $repo bundle create $bundle HEAD
if($LASTEXITCODE){throw 'BUNDLE_FAILED'}
git -C $repo bundle verify $bundle
if($LASTEXITCODE){throw 'BUNDLE_VERIFY_FAILED'}
. ./work/CrmGitHub.ps1
$body='HANDOFF W2-X asignacionSIM/eSIM fuente '+$sha+' / arbol '+$tree+', CLAIM6203419872, rama '+$branch+', baseddcffe793b46c3024c1a762d094c8359d1ab9b82. Seis originalesFAIL fisica/eSIM390/768/1440:Aapta,Bpendiente,volverApendiente;revision expecteddisabled/receivedenabled antes de comando,validacionA antigua reutilizada. Snapshot actuallinea2 frenteopcion1 sintetico explicito,no escritor ni efectoSQL medido. Seleccion/actualizacion retira validacion/error anterior;estadoComprobando y avisoNoDisponible orientan refresco. Guarda de version/CAS existente intacta.120/120 propias PASS:6 nuevos flujos bloqueopendiente/incompatible,actualizaropciones,A2apta,cuerpoexpected_line_version2 exacto,una403cancelable sincomandoprevio +114 regresionesSIM inicial/refresco/sustitucion/scope. Build66/lint0errores3warnings visibles/scan/cola342_19PARTIAL_323sinreconciliar_0READY y bundle. VISUAL parcial18capturas realmente vistas,3estados por tipo/ancho,feedback legible yboton soloapto vigente;cabecera movil parcialmente fuera de viewport,no modulo completo ni asignacionpersistida. AuthDB/Storage/modeloNOT_RUN/API0. No cambia helper/contratos/SQL/permisos/W3/W4/W5/recurso ni fuentes38/142/153/main. Global1155source26 noincluye esta nueva regresion;no puede cerrar sus6fallosporpasar yno sehereda. Global1065ff5e5a7PASS22.4min propio;original9816bFAIL979+2complementarios/RCA2no cerrado yF736/B9 intactos. HIGH5/W4/ACKprincipal pendientes,IAwritesOFF/issue10OPEN/releaseNOT_ACCEPTED. Siguiente revisionindividualTEL024 basada en75/capturasff5e5a7 con nuevoCLAIM y despues defecto comercial independiente,no promocionmasiva.'

$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$sha;tree=$tree;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 6|Set-Content work/w2x-sim-assignment-selection-publication.json}
@{sha=$sha;tree=$tree;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 6|Set-Content work/w2x-sim-assignment-selection-publication.json
python work/checkpoint-w2x-sim-assignment-selection.py published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
