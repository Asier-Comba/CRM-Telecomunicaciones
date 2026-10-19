$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$repo=Join-Path $PSScriptRoot 'crm-w2x-commercial-composition'
Set-Location $root
if(Test-Path work/w2x-portfolio-command-read-close-requested.json){throw 'CLOSE_ALREADY_REQUESTED'}
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not(Test-Path work/w2x-portfolio-command-read-browser-exit.txt)){if($watch.Elapsed.TotalMinutes -gt 45){throw 'NO_TERMINAL244'};Start-Sleep -Seconds 5}
@{state='PREFLIGHT244';utc=(Get-Date).ToUniversalTime().ToString('o')}|ConvertTo-Json|Set-Content work/w2x-portfolio-command-read-close-requested.json
python work/checkpoint-w2x-portfolio-command-read.py preflight
if($LASTEXITCODE){throw 'CONTROL_OR_SOURCE_FAILURE_PRESERVED_NO_COMMIT'}
node work/crm-w2x-commercial-composition/scripts/product/build-release-queue.mjs --check *> work/w2x-portfolio-command-read-queue.txt
if($LASTEXITCODE){throw 'QUEUE_FAILED'}
if(git -C $repo ls-remote --heads origin refs/heads/codex/w2x-portfolio-command-read-lifetime-20261015){throw 'REMOTE_EXISTS'}
git -C $repo add -- src/features/portfolio/IntegratedPortfolio.tsx tests/e2e-preview/fixtures/commercial-resource-entry.tsx tests/e2e-preview/portfolio-command-read-lifetime.spec.ts docs/master/W2X_PORTFOLIO_COMMAND_READ_LIFETIME_20261015.md
git -C $repo commit -m 'fix(portfolio): skip post-command reads after context retirement'
if($LASTEXITCODE){throw 'COMMIT_FAILED'}
$sha=(git -C $repo rev-parse HEAD).Trim();$tree=(git -C $repo rev-parse 'HEAD^{tree}').Trim()
@{sha=$sha;tree=$tree;publication='LOCAL_COMMIT_PUSH_PENDING';handoffs=@()}|ConvertTo-Json -Depth 6|Set-Content work/w2x-portfolio-command-read-publication.json
git -C $repo push origin HEAD:refs/heads/codex/w2x-portfolio-command-read-lifetime-20261015
if($LASTEXITCODE){throw 'PUSH_UNCERTAIN_INSPECT'}
$bundle=Join-Path $PSScriptRoot 'w2x-portfolio-command-read.bundle'
git -C $repo bundle create $bundle HEAD
if($LASTEXITCODE){throw 'BUNDLE_FAILED'}
git -C $repo bundle verify $bundle
if($LASTEXITCODE){throw 'BUNDLE_VERIFY_FAILED'}
. ./work/CrmGitHub.ps1
$body='HANDOFF W2-X Cartera fuente'+$sha+' / arbol'+$tree+', CLAIM6199739994, rama codex/w2x-portfolio-command-read-lifetime-20261015, base2468b2d. Alta servicio/activar contrato: dos causales originales tras retirar empresa producen lectura vieja esperado0/observado1, junto con2 positivos vigentes PASS. Primer fixture sin reset de scope fallo2 antes de causal; conservado. Ahora saved comprueba vigencia antes/despues de lectura; comando/recibo/idempotencia intactos.244/244 propias PASS:30 nuevas dos flujos por empresa/actor/lector/referencia/vigente y390/768/1440 +214 regresiones reejecutadas. Build66 PASS, lint0errores/3warnings visibles (Billing previo y dos epoch refs cleanup), cola342/16PARTIAL/326sinreconciliar/0READY, scanPASS. VISUAL NOT_REVIEWED pendiente inspeccion actual; HTTP controlado, AuthDB/Storage/modeloNOT_RUN/API0. HIGH5/W4/ACK principal pendientes; IA writesOFF/issue10OPEN/releaseNOT_ACCEPTED. Ramas38/142/153/W3/W4/W5/recurso intactos. Bundle/checkpoint integro; siguiente revision visual y componer esta fuente en unidad independiente OportunidadesCLAIM6199848668 antes de controles finales.'
$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$sha;tree=$tree;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 6|Set-Content work/w2x-portfolio-command-read-publication.json}
@{sha=$sha;tree=$tree;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 6|Set-Content work/w2x-portfolio-command-read-publication.json
python work/checkpoint-w2x-portfolio-command-read.py published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
