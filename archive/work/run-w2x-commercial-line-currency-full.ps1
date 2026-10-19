$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$repo=Join-Path $PSScriptRoot 'crm-w2x-commercial-composition'
Set-Location $root
$prefix='w2x-commercial-line-currency-full'
if(Test-Path ('work/'+$prefix+'-requested.json')){throw 'ALREADY_REQUESTED'}
$cp=Get-Content work/w2x-line-context-retirement-checkpoint.json -Raw|ConvertFrom-Json
if($cp.publication -ne 'PUBLISHED' -or $cp.checks.browser -ne '330_PASS_OWN_SOURCE' -or (git -C $repo rev-parse HEAD) -ne $cp.sha -or (git -C $repo status --porcelain)){throw 'SOURCE_NOT_OWN_PUBLISHED_CLEAN'}
$ErrorActionPreference='Continue'
node work/crm-w2x-commercial-composition/node_modules/@playwright/test/cli.js test --config work/playwright-w2x-commercial-line-currency-full.config.cjs --list *> ('work/'+$prefix+'-collection.txt')
$collection=$LASTEXITCODE
$ErrorActionPreference='Stop'
if($collection -or (Get-Content ('work/'+$prefix+'-collection.txt') -Tail 1) -ne 'Total: 1266 tests in 80 files'){throw 'COLLECTION_NOT1266'}
@{state='REQUESTED_ONCE';sha=$cp.sha;tests=1266;files=80;workers=1;retries=0;timeout=60000}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-requested.json')
$ErrorActionPreference='Continue'
node work/crm-w2x-commercial-composition/node_modules/@playwright/test/cli.js test --config work/playwright-w2x-commercial-line-currency-full.config.cjs *> ('work/'+$prefix+'-browser.txt')
$actual=$LASTEXITCODE;$actual|Set-Content ('work/'+$prefix+'-browser-exit.txt')
$ErrorActionPreference='Stop'
python ('work/checkpoint-'+$prefix+'.py')
if($LASTEXITCODE){throw 'CHECKPOINT_GUARD_FAILED'}
$final=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
. ./work/CrmGitHub.ps1
$body='CI LOCAL W2-X: global propio de la corrección de selección y lectura dependiente de línea. Fuente '+$final.sha+' / árbol '+$final.tree+', CLAIM 6204361588. Resultado '+$final.browser_status+', exit '+$actual+', resumen '+($final.browser_summary -join '; ')+'. Son 1266 casos recogidos en 80 archivos, ejecutados de nuevo sobre esta fuente porque cambia el helper UI compartido; no se hereda el global verde de 21a75fa. Controles locales propios previos 330/330, build66, lint0errores3warnings, scan/cola y bundle. HTTP controlado y DTO sintético, componentes/parsers reales. Visual NOT_REVIEWED_CURRENT_SHA; Auth/DB y modelo vivo NOT_RUN; API0. HIGH5/W4 pendientes, IA writes OFF, issue10 OPEN y release NOT_ACCEPTED. Se conservan F736/B9/981 original, primer210 y fallo de sintaxis del script de checkpoint33 anterior a commit, corregido sin repetir verdes. Ninguna prueba declara perfección del producto ni ausencia global de defectos. Fuentes propietarias y PR38/142/153 intactas. Siguiente unidad Customer360 → atención, CLAIM separado 6212750000, con pruebas propias sin atribuirle este PASS.'
$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$final.sha;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 7|Set-Content ('work/'+$prefix+'-publication.json')}
@{sha=$final.sha;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 7|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
