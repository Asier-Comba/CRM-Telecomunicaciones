$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$p='w2x-commercial-name-full';$repo=Join-Path $PSScriptRoot 'crm-w2x-commercial-composition'
if(Test-Path ('work/'+$p+'-wait-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_OWN75_PUBLISHED_AND_PRIOR1842_TERMINAL';tests=1869;files=108}|ConvertTo-Json|Set-Content ('work/'+$p+'-wait-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while($true){$own=Get-Content work/w2x-c360-company-facts-wrap-checkpoint.json -Raw|ConvertFrom-Json;if($own.publication -eq 'PUBLISHED'){break};if($watch.Elapsed.TotalMinutes -gt 45){throw 'OWN75_NOT_PUBLISHED_NO_DISPATCH'};Start-Sleep -Seconds 5}
if($own.checks.browser -ne '77_PASS_OWN_SOURCE' -or $own.checks.functional -ne 'NOT_RUN_UI_STYLE_ONLY' -or $own.checks.build -ne '66_PASS' -or $own.checks.scan -ne 'PASS'){throw 'OWN75_NOT_QUALIFIED'}
$priorWatch=[Diagnostics.Stopwatch]::StartNew()
while($true){if(Test-Path work/w2x-commercial-filter-full-checkpoint.json){$prior=Get-Content work/w2x-commercial-filter-full-checkpoint.json -Raw|ConvertFrom-Json;if($prior.publication -eq 'PUBLISHED'){break}};if($priorWatch.Elapsed.TotalMinutes -gt 60){throw 'PRIOR1842_NOT_PUBLISHED_NO_DISPATCH'};Start-Sleep -Seconds 5}
if($prior.browser_status -ne 'PASS1842'){throw 'PRIOR1842_FAILED_NO_DISPATCH'}
if((git -C $repo rev-parse HEAD) -ne $prior.sha -or (git -C $repo status --porcelain)){throw 'CHECKOUT_NOT_PRIOR_CLEAN'}
git -C $repo switch --detach $own.sha
if($LASTEXITCODE){throw 'SOURCE_SWITCH_FAILED'}
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$own.branch)
if($LASTEXITCODE -or -not $remote.StartsWith($own.sha)){throw 'REMOTE_PIN_MISMATCH'}
Push-Location $repo
$ErrorActionPreference='Continue'
node -e "require.resolve('react/package.json',{paths:[process.cwd()]});require('node:fs').accessSync('tests/e2e-preview/fixtures/c360-failure-waiter-child.mjs');process.stdout.write('CWD_PREREQUISITES_PASS')" *> ('../'+$p+'-cwd-preflight.txt');$cwdcheck=$LASTEXITCODE
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-commercial-name-full.config.cjs --list *> ('../'+$p+'-collection.txt');$collection=$LASTEXITCODE
Pop-Location
$ErrorActionPreference='Stop'
if($cwdcheck -or $collection -or (Get-Content ('work/'+$p+'-collection.txt') -Tail 1) -ne 'Total: 1869 tests in 108 files'){throw 'CWD_OR_COLLECTION_MISMATCH_NO_DISPATCH'}
if(Test-Path ('work/'+$p+'-requested.json')){throw 'ALREADY_DISPATCHED'}
@{state='REQUESTED_ONCE';sha=$own.sha;tests=1869;files=108;workers=1;retries=0;timeout=60000;execution_cwd=$repo;cwd_preflight='PASS'}|ConvertTo-Json|Set-Content ('work/'+$p+'-requested.json')
Push-Location $repo
$ErrorActionPreference='Continue'
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-commercial-name-full.config.cjs *> ('../'+$p+'-browser.txt');$actual=$LASTEXITCODE
Pop-Location
$actual|Set-Content ('work/'+$p+'-browser-exit.txt')
$ErrorActionPreference='Stop'
python ('work/checkpoint-'+$p+'.py')
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_PRESERVE'}
$final=Get-Content ('work/'+$p+'-checkpoint.json') -Raw|ConvertFrom-Json
. ./work/CrmGitHub.ps1
$nl=[string][char]10+[char]10
$body='CI LOCAL W2-X75 — regresión comercial conidentificación de cliente yCustomer360 legibles. Fuente '+$final.sha+', árbol '+$final.tree+', CLAIM6253342210. Resultado '+$final.browser_status+', exit '+$actual+', resumen '+($final.browser_summary -join '; ')+'. Colección real1869/108archivos:1842anteriores+9identificaciónfacturación73+18Customer360header/Empresa74/75. Ejecución propia completa tras77/build66/lint/scan/visual/publicación75 y1842terminal/PUBLISHED/PASS;funcionalesNOT_RUN_UI_STYLE_ONLY,no50heredados. CLI14/testDir14/CWD14/preflightReactchild/pinremoto/workers1/retries0/timeout60000,sinherencia/cancelación/duplicación.'+$nl+'Reutiliza campos ycomponentesexistentes;ajustetextoderivado,cabecera ygridEmpresa,sin nuevosservicios/queries/autoridad/cálculos/contratos. HTTPDTOsintético,componentes/repositorio/parsers reales,comandos manuales simulados enregresiones;AuthDB/JWT/RLS/SQL/Nextintegrado/modelovivoNOT_RUN/API0. Visualindividualparcial,no1869capturascompletas;geometría nopruebarecuentosSQL,ausencia,autoridad,performance,seguridadindependiente odurabilidad.'+$nl+'Matriz342/29PARTIAL/313sinreconciliar/0READY,HIGH5/W4pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. Semánticafiltros72 requiere revisión/consumopropietario;positivooverdueflag noacredita derivacióndefechas. Plan1860nuncasolicitado,coalescidocon9Empresa75en1869;original74configinexistenteantesdedispatch yresume68guardadopreservados. F736/B9/981/1266/fixtures/causales/preparación/finanzas intactos;fuentesajenas/PR38/142/153/main/W3/W4/W5/recursointactos. SiFAIL,conservar causa antesdereintento;siPASS,noaceptaciónintegral niherencia aotroSHA.'
$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$final.sha;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content ('work/'+$p+'-publication.json')}
@{sha=$final.sha;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content ('work/'+$p+'-publication.json')
python ('work/checkpoint-'+$p+'.py') published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}

