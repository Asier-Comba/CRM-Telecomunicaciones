$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-customer-attention-context'
$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=84061}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while(-not(Test-Path ('work/'+$prefix+'-build-exit.txt'))){if($watch.Elapsed.TotalMinutes -gt 45){throw 'NO_TERMINAL_CONTROLS'};Start-Sleep -Seconds 5}
python ('work/checkpoint-'+$prefix+'.py') preflight
if($LASTEXITCODE){throw 'CONTROLS_OR_FINGERPRINT_FAILURE_PRESERVED'}
node work/crm-w2x-document-upload-uncertain/scripts/product/build-release-queue.mjs --check *> ('work/'+$prefix+'-queue.txt')
if($LASTEXITCODE){throw 'QUEUE_FAILED'}
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'fix(attention): preserve customer context from Customer360'
if($LASTEXITCODE){throw 'COMMIT_FAILED'}
$sha=(git -C $repo rev-parse HEAD).Trim();$tree=(git -C $repo rev-parse 'HEAD^{tree}').Trim()
$publication=@{sha=$sha;tree=$tree;publication='LOCAL_COMMIT_PUSH_PENDING';handoffs=@()}
$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
git -C $repo push origin ('HEAD:refs/heads/'+$cp.branch)
if($LASTEXITCODE){throw 'PUSH_UNCERTAIN_INSPECT_NO_RETRY'}
$bundle=Join-Path $PSScriptRoot ($prefix+'.bundle')
git -C $repo bundle create $bundle HEAD
if($LASTEXITCODE){throw 'BUNDLE_FAILED'}
git -C $repo bundle verify $bundle
if($LASTEXITCODE){throw 'BUNDLE_VERIFY_FAILED'}
. ./work/CrmGitHub.ps1
$nl=[string][char]10+[char]10
$body='HANDOFF W2-X: Customer360 → Centro de atención conserva el cliente. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', base '+$cp.base+'. CLAIM 6212750000.'+$nl+'Original a 1440: 5 FAIL y 4 PASS. Dos enlaces perdían customer; dos consultas iniciales y el intento denegado salían sin customer_id. Se conservan log y test originales. Ahora el enlace pasa customer, la página Next espera searchParams y el componente valida UUID/normaliza antes del filtro inicial. Paginación, actualizar y reintentar conservan el cliente; Limpiar filtros lo elimina junto al cursor. Sin parámetro o con forma inválida, consulta general. Contrato, permisos y servicio reutilizados.'+$nl+'Controles propios: 60/60 PASS en 1.2 minutos (27 contexto/negativos +33 regresiones Customer360), build66, lint exit0 con warnings conservados, scan/diff/cola/bundle y seis capturas realmente vistas A/B a390/768/1440. Visual parcial de filtros y segunda página vacía; inferior móvil fuera del viewport. El selector aún muestra Cliente seleccionado. Fixture refinado antes del final: 20 filas ordenadas y cursor de última tupla; original inválido se conserva y los fallos causales ocurrieron antes de consumirlo.'+$nl+'HTTP controlado con componentes/parsers reales: enlace y componente destino por separado. Ruta Next compilada y revisada en fuente, navegación Next integrada NOT_RUN. Auth/DB y modelo vivo NOT_RUN, API0. No heredar global1266 de21a75fa ni2741fb8. Cola342_21PARTIAL_321sinreconciliar_0READY; HIGH5/W4 pendientes, IA writes OFF, issue10 OPEN, release NOT_ACCEPTED. Fallos históricos preservados. PR38/142/153/main, coreW3/W4/W5/recurso intactos. Siguiente defecto comercial independiente con CLAIM propio; no aceptación por silencio.'
foreach($n in @(67,153,38,142)){
 $c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body}
 $publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF'
 $publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}
