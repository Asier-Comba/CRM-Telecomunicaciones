$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$p='w2x-commercial-overdue-full';$repo=Join-Path $PSScriptRoot 'crm-w2x-commercial-composition'
if(Test-Path ('work/'+$p+'-wait-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_OWN78_PUBLISHED_AND_PRIOR1869_TERMINAL';tests=1887;files=109}|ConvertTo-Json|Set-Content ('work/'+$p+'-wait-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while($true){$own=Get-Content work/w2x-billing-overdue-date-response-checkpoint.json -Raw|ConvertFrom-Json;if($own.publication -eq 'PUBLISHED'){break};if($watch.Elapsed.TotalMinutes -gt 45){throw 'OWN78_NOT_PUBLISHED_NO_DISPATCH'};Start-Sleep -Seconds 5}
if($own.checks.browser -ne '165_PASS_OWN_SOURCE' -or $own.checks.functional -ne '49_UNAFFECTED_PASS_PLUS2_RECHECK_PASS_COMPLEMENTARY' -or $own.checks.build -ne '66_PASS' -or $own.checks.scan -ne 'PASS'){throw 'OWN78_NOT_QUALIFIED'}
$priorWatch=[Diagnostics.Stopwatch]::StartNew()
while($true){if(Test-Path work/w2x-commercial-name-full-checkpoint.json){$prior=Get-Content work/w2x-commercial-name-full-checkpoint.json -Raw|ConvertFrom-Json;if($prior.publication -eq 'PUBLISHED'){break}};if($priorWatch.Elapsed.TotalMinutes -gt 60){throw 'PRIOR1869_NOT_PUBLISHED_NO_DISPATCH'};Start-Sleep -Seconds 5}
if($prior.browser_status -ne 'PASS1869'){throw 'PRIOR1869_FAILED_NO_DISPATCH'}
if((git -C $repo rev-parse HEAD) -ne $prior.sha -or (git -C $repo status --porcelain)){throw 'CHECKOUT_NOT_PRIOR_CLEAN'}
git -C $repo switch --detach $own.sha
if($LASTEXITCODE){throw 'SOURCE_SWITCH_FAILED'}
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$own.branch)
if($LASTEXITCODE -or -not $remote.StartsWith($own.sha)){throw 'REMOTE_PIN_MISMATCH'}
Push-Location $repo
$ErrorActionPreference='Continue'
node -e "require.resolve('react/package.json',{paths:[process.cwd()]});require('node:fs').accessSync('tests/e2e-preview/fixtures/c360-failure-waiter-child.mjs');process.stdout.write('CWD_PREREQUISITES_PASS')" *> ('../'+$p+'-cwd-preflight.txt');$cwdcheck=$LASTEXITCODE
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-commercial-overdue-full.config.cjs --list *> ('../'+$p+'-collection.txt');$collection=$LASTEXITCODE
Pop-Location
$ErrorActionPreference='Stop'
if($cwdcheck -or $collection -or (Get-Content ('work/'+$p+'-collection.txt') -Tail 1) -ne 'Total: 1887 tests in 109 files'){throw 'CWD_OR_COLLECTION_MISMATCH_NO_DISPATCH'}
if(Test-Path ('work/'+$p+'-requested.json')){throw 'ALREADY_DISPATCHED'}
@{state='REQUESTED_ONCE';sha=$own.sha;tests=1887;files=109;workers=1;retries=0;timeout=60000;execution_cwd=$repo;cwd_preflight='PASS'}|ConvertTo-Json|Set-Content ('work/'+$p+'-requested.json')
Push-Location $repo
$ErrorActionPreference='Continue'
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-commercial-overdue-full.config.cjs *> ('../'+$p+'-browser.txt');$actual=$LASTEXITCODE
Pop-Location
$actual|Set-Content ('work/'+$p+'-browser-exit.txt')
$ErrorActionPreference='Stop'
python ('work/checkpoint-'+$p+'.py')
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_PRESERVE'}
$final=Get-Content ('work/'+$p+'-checkpoint.json') -Raw|ConvertFrom-Json
. ./work/CrmGitHub.ps1
$nl=[string][char]10+[char]10
$body='CI LOCAL W2-X78 — regresión comercial con contactos legibles y coherencia de vencimiento. Fuente '+$final.sha+', árbol '+$final.tree+', CLAIM6253675507. Resultado '+$final.browser_status+', exit '+$actual+', resumen '+($final.browser_summary -join '; ')+'. Colección real1887/109archivos:1869anteriores+9Contactos77+9vencimiento78. Ejecutada completa tras165browser/funcionales49anteriores+2recheckcomplementarios(buildoriginal50PASS1FAILpreservado)/build66/lint/scan/visual/publicación78 y1869terminal/PUBLISHED/PASS. CLI14/testDir14/CWD14/preflightReactchild/pin remoto/workers1/retries0/timeout60000;sin herencia/cancelación/duplicación.'+$nl+'El predicado existente rechaza overdue=true sin due_on;factura sinfecha/no vencida sigueválida. No recomputa reloj/as_of ni cálculo,SQL,RLS,permisos ocontrato wire. Tresfixturespositivos antiguos reciben fechas sintéticas coherentes,sinrelajaraserciones ni reinterpretar flag-only72/73. Fuente78 requiere revisión/consumoW1propietario antes de integrar;W4 independiente.'+$nl+'HTTP/DTO sintético concomponentes/repositorio/parsers reales ycomandos manualessimulados enregresiones. AuthDB/JWT/RLS/SQL/Nextintegrado/modelo vivo NOT_RUN/API0;sinprueba de productorSQL,derivaciónrealdiaria,ausencia,autoridad,durabilidad oseguridad independiente. Visual individual parcial,no1887capturas completas. Matriz342/30PARTIAL/312sinreconciliar/0READY,HIGH5/W4pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED.'+$nl+'F736/B9/981/1266/fixtures/causales/preparación/finanzas conservados,incluyendo fuente72original144PASS3FAILfixture+3PASScomplementarios y74lanzadorantesdedispatch. LosPASSposteriores conservan SHA propio. Fuentesajenas/PR38/142/153/main/W3/W4/W5/recursointactos. SiFAIL,conservarcausaantesdereintento;siPASS,noaceptaciónintegral niherencia aotroSHA.'
$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$final.sha;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content ('work/'+$p+'-publication.json')}
@{sha=$final.sha;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content ('work/'+$p+'-publication.json')
python ('work/checkpoint-'+$p+'.py') published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}

