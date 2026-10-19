$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$p='w2x-commercial-draft-full';$repo=Join-Path $PSScriptRoot 'crm-w2x-commercial-composition'
if(Test-Path ('work/'+$p+'-wait-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_OWN50_PUBLISHED';tests=1434;files=90}|ConvertTo-Json|Set-Content ('work/'+$p+'-wait-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while($true){$cp=Get-Content work/w2x-billing-draft-close-checkpoint.json -Raw|ConvertFrom-Json;if($cp.publication -eq 'PUBLISHED'){break};if($watch.Elapsed.TotalMinutes -gt 45){throw 'OWN50_NOT_PUBLISHED_NO_DISPATCH'};Start-Sleep -Seconds 5}
if($cp.checks.browser -ne '60_PASS_OWN_SOURCE' -or $cp.checks.build -ne '66_PASS' -or $cp.checks.scan -ne 'PASS'){throw 'OWN50_NOT_QUALIFIED'}
$prior=Get-Content work/w2x-commercial-billing-full-checkpoint.json -Raw|ConvertFrom-Json
if($prior.publication -ne 'PUBLISHED' -or $prior.browser_status -ne 'PASS1416'){throw 'PRIOR_NOT_CLOSED'}
if((git -C $repo rev-parse HEAD) -ne $prior.sha -or (git -C $repo status --porcelain)){throw 'CHECKOUT_NOT_PRIOR_CLEAN'}
git -C $repo switch --detach $cp.sha
if($LASTEXITCODE){throw 'SOURCE_SWITCH_FAILED'}
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -or -not $remote.StartsWith($cp.sha)){throw 'REMOTE_PIN_MISMATCH'}
Push-Location $repo
$ErrorActionPreference='Continue'
node -e "require.resolve('react/package.json',{paths:[process.cwd()]});require('node:fs').accessSync('tests/e2e-preview/fixtures/c360-failure-waiter-child.mjs');process.stdout.write('CWD_PREREQUISITES_PASS')" *> ('../'+$p+'-cwd-preflight.txt');$cwdcheck=$LASTEXITCODE
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-commercial-draft-full.config.cjs --list *> ('../'+$p+'-collection.txt');$collection=$LASTEXITCODE
Pop-Location
$ErrorActionPreference='Stop'
if($cwdcheck -or $collection -or (Get-Content ('work/'+$p+'-collection.txt') -Tail 1) -ne 'Total: 1434 tests in 90 files'){throw 'CWD_OR_COLLECTION_MISMATCH_NO_DISPATCH'}
if(Test-Path ('work/'+$p+'-requested.json')){throw 'ALREADY_DISPATCHED'}
@{state='REQUESTED_ONCE';sha=$cp.sha;tests=1434;files=90;workers=1;retries=0;timeout=60000;execution_cwd=$repo;cwd_preflight='PASS'}|ConvertTo-Json|Set-Content ('work/'+$p+'-requested.json')
Push-Location $repo
$ErrorActionPreference='Continue'
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-commercial-draft-full.config.cjs *> ('../'+$p+'-browser.txt');$actual=$LASTEXITCODE
Pop-Location
$actual|Set-Content ('work/'+$p+'-browser-exit.txt')
$ErrorActionPreference='Stop'
python ('work/checkpoint-'+$p+'.py')
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_PRESERVE'}
$final=Get-Content ('work/'+$p+'-checkpoint.json') -Raw|ConvertFrom-Json
. ./work/CrmGitHub.ps1
$body='CI LOCAL W2-X global propio1434/90archivos. Fuente '+$final.sha+',árbol '+$final.tree+',CLAIM6251143949. Resultado '+$final.browser_status+',exit '+$actual+',resumen '+($final.browser_summary -join '; ')+'.1416previos+18borradorcreate/update;ejecución completa enestafuente trascambioEditor/IntegratedBilling,ningúnPASSheredado. Previo1416BF72terminal/publicado yown60/build66/lint/scan/visual7/publicación50 cerrados antesdedispatch. Workers1/retries0/timeout60000/CWDrepo/preflightReactchild,no cancelación niimagenreintentos. HTTP/DTOcontrolado,componentes/repositorio/parsersreales;AuthDB/JWT/RLS/Nextintegrado/modelovivoNOT_RUN/API0. Col342/26PARTIAL/316sinreconciliar/0READY. HIGH5/W4/IAwritesOFF/issue10OPEN/releaseNOT_ACCEPTED;originalesF736/B9/981/1266/fixture45/harness48intactos. Fuentesajenas/main/PR38/142/153/W3/W4/W5/recursointactos. SiFAIL,conservarcausa antesreintento;siPASS,noaceptación integraldeproducto/release. Noheredar aSHAposterior.'
$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$final.sha;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content ('work/'+$p+'-publication.json')}
@{sha=$final.sha;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content ('work/'+$p+'-publication.json')
python ('work/checkpoint-'+$p+'.py') published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
