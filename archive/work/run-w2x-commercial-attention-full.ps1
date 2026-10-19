$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-commercial-attention-full';$repo=Join-Path $PSScriptRoot 'crm-w2x-commercial-composition'
if(Test-Path ('work/'+$prefix+'-wait-requested.json')){throw 'WAITER_ALREADY_REQUESTED'}
@{state='WAIT_OWN1266_TERMINAL_AND_PUBLISHED';source='4221edc8023e68d3497092e92a428838baea1e32';tests=1311;files=82}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-wait-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while($true){
 if(Test-Path work/w2x-commercial-line-currency-full-checkpoint.json){$prior=Get-Content work/w2x-commercial-line-currency-full-checkpoint.json -Raw|ConvertFrom-Json;if($prior.publication -eq 'PUBLISHED'){break}}
 if($watch.Elapsed.TotalMinutes -gt 50){throw 'PRIOR_NOT_PUBLISHED_NO_DISPATCH'}
 Start-Sleep -Seconds 5
}
if($prior.sha -ne '2741fb82047534ecdf27044f25514f0d690b69e3' -or $prior.browser_status -ne 'PASS1266'){throw 'PRIOR_FAILED_OR_WRONG_SOURCE_NO_DISPATCH'}
$cp=Get-Content work/w2x-attention-customer-identity-checkpoint.json -Raw|ConvertFrom-Json
if($cp.publication -ne 'PUBLISHED' -or $cp.sha -ne '4221edc8023e68d3497092e92a428838baea1e32' -or $cp.checks.browser -ne '78_PASS_OWN_SOURCE' -or $cp.checks.scan -ne 'PASS'){throw 'OWN_SOURCE_NOT_QUALIFIED'}
if((git -C $repo rev-parse HEAD) -ne $prior.sha -or (git -C $repo status --porcelain)){throw 'PRIOR_CHECKOUT_NOT_PINNED_CLEAN'}
git -C $repo switch --detach $cp.sha
if($LASTEXITCODE){throw 'SOURCE_SWITCH_FAILED'}
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -or -not $remote.StartsWith($cp.sha)){throw 'REMOTE_SOURCE_PIN_MISMATCH'}
$ErrorActionPreference='Continue'
node work/crm-w2x-commercial-composition/node_modules/@playwright/test/cli.js test --config work/playwright-w2x-commercial-attention-full.config.cjs --list *> ('work/'+$prefix+'-collection.txt')
$collection=$LASTEXITCODE
$ErrorActionPreference='Stop'
if($collection -or (Get-Content ('work/'+$prefix+'-collection.txt') -Tail 1) -ne 'Total: 1311 tests in 82 files'){throw 'COLLECTION_NOT1311'}
if(Test-Path ('work/'+$prefix+'-requested.json')){throw 'ALREADY_DISPATCHED'}
@{state='REQUESTED_ONCE';sha=$cp.sha;tests=1311;files=82;workers=1;retries=0;timeout=60000}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-requested.json')
$ErrorActionPreference='Continue'
node work/crm-w2x-commercial-composition/node_modules/@playwright/test/cli.js test --config work/playwright-w2x-commercial-attention-full.config.cjs *> ('work/'+$prefix+'-browser.txt')
$actual=$LASTEXITCODE;$actual|Set-Content ('work/'+$prefix+'-browser-exit.txt')
$ErrorActionPreference='Stop'
python ('work/checkpoint-'+$prefix+'.py')
if($LASTEXITCODE){throw 'FULL_CHECKPOINT_GUARD_FAILED'}
$final=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
. ./work/CrmGitHub.ps1
$body='CI LOCAL W2-X: global propio de continuidad Customer360 → Atención e identidad del cliente filtrado. Fuente '+$final.sha+' / árbol '+$final.tree+', CLAIM6212889445. Resultado '+$final.browser_status+', exit '+$actual+', resumen '+($final.browser_summary -join '; ')+'. Recogidos1311 casos en82 archivos, banco1266 más27 contexto y18 identidad, ejecutados sobre esta fuente sin heredar PASS. Iniciado después de terminal/publicación de1266 propio2741fb8, sin cancelar ni publicar encima de checks activos. Controles propios previos78/build66/lint0errores3warnings/scan/cola; nueve capturas parcialmente revisadas. Componentes/repositorio/parsers reales con HTTP controlado. Auth/DB, modelo vivo y navegación Next integrada NOT_RUN, API0. Metadata TEL069 posterior es otra fuente, runtimeNOT_RUN. HIGH5/W4 pendientes, IA writesOFF, issue10OPEN, releaseNOT_ACCEPTED. F736/B9/981 original/primer210/script33 intactos. Registro de defectos global NOT_RECONCILED; ninguna suite acredita perfección completa. Próxima unidad independiente autorizada; preservar cualquier fallo de este intento antes de decidir reintentos.'
$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$final.sha;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 7|Set-Content ('work/'+$prefix+'-publication.json')}
@{sha=$final.sha;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 7|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
