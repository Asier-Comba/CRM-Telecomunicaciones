$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
Set-Location $root
if(Test-Path work/w2x-portability-operator-captions-close-requested.json){throw 'CLOSE_ALREADY_REQUESTED'}
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not(Test-Path work/w2x-portability-operator-captions-final3-browser-exit.txt)){if($watch.Elapsed.TotalMinutes -gt 45){throw 'NO_TERMINAL_FINAL3'};Start-Sleep -Seconds 5}
@{state='PREFLIGHT_FINAL3';utc=(Get-Date).ToUniversalTime().ToString('o')}|ConvertTo-Json|Set-Content work/w2x-portability-operator-captions-close-requested.json
python work/checkpoint-w2x-portability-operator-captions.py preflight
if($LASTEXITCODE){throw 'CONTROL_OR_SOURCE_FAILURE_PRESERVED_NO_COMMIT'}
node work/crm-w2x-document-upload-uncertain/scripts/product/build-release-queue.mjs --check *> work/w2x-portability-operator-captions-queue.txt
if($LASTEXITCODE){throw 'QUEUE_FAILED'}
if(git -C $repo ls-remote --heads origin refs/heads/codex/w2x-portability-operator-captions-lifetime-20261015){throw 'REMOTE_EXISTS'}
git -C $repo add -- src/features/product/integration/OperatorSelect.tsx src/features/portabilities/Portabilities.tsx tests/e2e-preview/portability-parent-read-lifetime.spec.ts docs/master/W2X_PORTABILITY_OPERATOR_CAPTIONS_20261015.md
git -C $repo commit -m 'fix(portabilities): distinguish origin and destination operator fields'
if($LASTEXITCODE){throw 'COMMIT_FAILED'}
$sha=(git -C $repo rev-parse HEAD).Trim();$tree=(git -C $repo rev-parse 'HEAD^{tree}').Trim()
@{sha=$sha;tree=$tree;publication='LOCAL_COMMIT_PUSH_PENDING';handoffs=@()}|ConvertTo-Json -Depth 6|Set-Content work/w2x-portability-operator-captions-publication.json
git -C $repo push origin HEAD:refs/heads/codex/w2x-portability-operator-captions-lifetime-20261015
if($LASTEXITCODE){throw 'PUSH_UNCERTAIN_INSPECT'}
$bundle=Join-Path $PSScriptRoot 'w2x-portability-operator-captions.bundle'
git -C $repo bundle create $bundle HEAD
if($LASTEXITCODE){throw 'BUNDLE_FAILED'}
git -C $repo bundle verify $bundle
if($LASTEXITCODE){throw 'BUNDLE_VERIFY_FAILED'}
. ./work/CrmGitHub.ps1
$body='HANDOFF W2-X Portabilidad operadores fuente'+$sha+' / arbol'+$tree+', CLAIM6200553279, rama codex/w2x-portability-operator-captions-20261015, base57e97ed. Dos campos visibles genericos Operador/Todos los operadores causaron3FAIL originales390/768/1440. Selector existente acepta displayLabel/emptyLabel opcionales con defaults previos; Portabilidades muestra Operador de origen/destino y seleccion contextual. Sin cambiar aria, consultas, cursores, IDs, permisos ni comandos. Primer banco36:33PASS/3FAIL por contador fixture que suponia /commands; operacion real /api/portability/v1 registrada en reads, evidencia preservada. Corregido solo fixture y entrada final valida de entrada (destino=operador linea, origen distinto). Final3PASS propios +33 complementarios sin repetir verdes, dos hashes UI identicos entre intentos; NO36PASS de una unica corrida final. Final3 prueba vacio/igual bloquean revision, seleccion independiente y cuerpo donor/target/expected_version exactos, un comando simulado403 permite cancelar. Build final66/scan/cola342_16PARTIAL_326sinreconciliar_0READY; lint completo previo0errores3warnings y test final0errores0warnings. VISUAL NOT_REVIEWED hasta capturas finales realmente inspeccionadas. AuthDB/Storage/modeloNOT_RUN/API0; global981 pertenece6b469 no heredado. Defecto adicional de UI permitiendo operador de destino incoherente requiere unidad causal separada; no aceptado aqui. HIGH5/W4/ACK principal pendientes,IAwritesOFF/issue10OPEN/releaseNOT_ACCEPTED. Fuentes38/142/153/main/W3/W4/W5/recurso intactos.'

$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$sha;tree=$tree;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 6|Set-Content work/w2x-portability-operator-captions-publication.json}
@{sha=$sha;tree=$tree;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 6|Set-Content work/w2x-portability-operator-captions-publication.json
python work/checkpoint-w2x-portability-operator-captions.py published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
