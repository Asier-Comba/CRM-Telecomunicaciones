$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$p='w2x-commercial-number-full';$repo=Join-Path $PSScriptRoot 'crm-w2x-commercial-composition'
if(Test-Path ('work/'+$p+'-wait-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_OWN88_PUBLISHED_AND_PRIOR2007_TERMINAL';tests=2043;files=118}|ConvertTo-Json|Set-Content ('work/'+$p+'-wait-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while($true){$own=Get-Content work/w2x-line-number-recovery-close-checkpoint.json -Raw|ConvertFrom-Json;if($own.publication -eq 'PUBLISHED'){break};if($watch.Elapsed.TotalMinutes -gt 45){throw 'OWN88_NOT_PUBLISHED_NO_DISPATCH'};Start-Sleep -Seconds 5}
if($own.checks.browser -ne '189_PASS_OWN_SOURCE' -or $own.checks.build -ne '66_PASS' -or $own.checks.scan -ne 'PASS'){throw 'OWN88_NOT_QUALIFIED'}
$priorWatch=[Diagnostics.Stopwatch]::StartNew()
while($true){if(Test-Path work/w2x-commercial-contract-lifetime-full-checkpoint.json){$prior=Get-Content work/w2x-commercial-contract-lifetime-full-checkpoint.json -Raw|ConvertFrom-Json;if($prior.publication -eq 'PUBLISHED'){break}};if($priorWatch.Elapsed.TotalMinutes -gt 60){throw 'PRIOR2007_NOT_PUBLISHED_NO_DISPATCH'};Start-Sleep -Seconds 5}
if($prior.browser_status -ne 'PASS2007'){throw 'PRIOR2007_FAILED_NO_DISPATCH'}
if((git -C $repo rev-parse HEAD) -ne $prior.sha -or (git -C $repo status --porcelain)){throw 'CHECKOUT_NOT_PRIOR_CLEAN'}
git -C $repo switch --detach $own.sha
if($LASTEXITCODE){throw 'SOURCE_SWITCH_FAILED'}
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$own.branch)
if($LASTEXITCODE -or -not $remote.StartsWith($own.sha)){throw 'REMOTE_PIN_MISMATCH'}
Push-Location $repo
$ErrorActionPreference='Continue'
node -e "require.resolve('react/package.json',{paths:[process.cwd()]});require('node:fs').accessSync('tests/e2e-preview/fixtures/c360-failure-waiter-child.mjs');process.stdout.write('CWD_PREREQUISITES_PASS')" *> ('../'+$p+'-cwd-preflight.txt');$cwdcheck=$LASTEXITCODE
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-commercial-number-full.config.cjs --list *> ('../'+$p+'-collection.txt');$collection=$LASTEXITCODE
Pop-Location
$ErrorActionPreference='Stop'
if($cwdcheck -or $collection -or (Get-Content ('work/'+$p+'-collection.txt') -Tail 1) -ne 'Total: 2043 tests in 118 files'){throw 'CWD_OR_COLLECTION_MISMATCH_NO_DISPATCH'}
if(Test-Path ('work/'+$p+'-requested.json')){throw 'ALREADY_DISPATCHED'}
@{state='REQUESTED_ONCE';sha=$own.sha;tests=2043;files=118;workers=1;retries=0;timeout=60000;execution_cwd=$repo;cwd_preflight='PASS'}|ConvertTo-Json|Set-Content ('work/'+$p+'-requested.json')
python work/refresh-w2x-number-queue.py
if($LASTEXITCODE){throw 'RUNNING_CHECKPOINT_FAILED_PRESERVE_REQUEST'}
Push-Location $repo
$ErrorActionPreference='Continue'
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-commercial-number-full.config.cjs *> ('../'+$p+'-browser.txt');$actual=$LASTEXITCODE
Pop-Location
$actual|Set-Content ('work/'+$p+'-browser-exit.txt')
$ErrorActionPreference='Stop'
python ('work/checkpoint-'+$p+'.py')
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_PRESERVE'}
$final=Get-Content ('work/'+$p+'-checkpoint.json') -Raw|ConvertFrom-Json
. ./work/CrmGitHub.ps1
$nl=[string][char]10+[char]10
$body='CI LOCAL W2-X88 — Regresión comercial coalescida2043/118. Fuente '+$final.sha+'; árbol '+$final.tree+'; CLAIM 6254960081. Resultado '+$final.browser_status+'; exit '+$actual+'; '+($final.browser_summary -join '; ')+'. Colección real:2007anteriores+24recuperación de portabilidades87+12número protegido88. Tras189propios uniformes/build66/lint/scan/visual/publicación88 y2007terminal/PUBLISHED/PASS. CLI14/testDir14/CWD14,preflightReact/child,pin remoto,workers1/retries0/timeout60000. Sin herencia,retarget,cancelación oduplicación.'+$nl+'Composición padre/hijo:se consume closeBlocked y numberEntry existentes,sin cambiar Drawer/ConfirmDialog/hook/locked/backend/SQL. Escape no retira la operación incierta;la cancelación ordinaria sale por niveles yreabre vacío. El valor retenido yla limpieza son comprobaciones DOM con teléfono sintético reservado,no borrado de memoria,cifrado o almacenamiento protegido real. No se crea una portabilidad al registrar el identificador.'+$nl+'Se conservan los originales88:2FAIL1PASS30,6s;primer186=183PASS3FAIL6,2min porEscape;complementario exacto87 Escape1FAIL/Tab1PASS25,3s. El preload del complemento fueNOT_RUN por importación yse corrigió por separado. El189 uniforme es otra fuente tras corrección,no convierte186enPASS. Capturasindividuales parciales,no2043capturas. HTTP/DTO/efectos sintéticos;AuthDB/JWT/RLS/SQL/Nextintegrado/modelo vivoNOT_RUN/API0. Sin ausencia/quiescencia/reinicio/handler/full23.'+$nl+'Matriz342/31PARTIAL/311sinreconciliar/0READY;cinco HIGH y W4 pendientes,IA comercial writes OFF,issue10 OPEN,release NOT_ACCEPTED. W178revisión/consumo pendiente;F736/B9/981/1266,fixtures,preparación ypérdida auxiliar83 conservados. No aceptación integral de módulos,seguridad o modelo. Fuentes/ramasajenas/PR38/142/153/main/W3core/W4/W5/recurso intactos.'

$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$final.sha;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content ('work/'+$p+'-publication.json')}
@{sha=$final.sha;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content ('work/'+$p+'-publication.json')
python ('work/checkpoint-'+$p+'.py') published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}

