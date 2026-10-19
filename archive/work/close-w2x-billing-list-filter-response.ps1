$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-billing-list-filter-response';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=59147}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(billing): bind invoice rows to explicit filters'
if($LASTEXITCODE){throw 'COMMIT_FAILED'}
$sha=(git -C $repo rev-parse HEAD).Trim();$tree=(git -C $repo rev-parse 'HEAD^{tree}').Trim()
$publication=@{sha=$sha;tree=$tree;publication='LOCAL_COMMIT_PUSH_PENDING';handoffs=@()}
$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
git -C $repo push origin ('HEAD:refs/heads/'+$cp.branch)
if($LASTEXITCODE){throw 'PUSH_UNCERTAIN_INSPECT_NO_RETRY'}
$bundle=Join-Path $PSScriptRoot ($prefix+'.bundle');git -C $repo bundle create $bundle HEAD
if($LASTEXITCODE){throw 'BUNDLE_FAILED'}
git -C $repo bundle verify $bundle
if($LASTEXITCODE){throw 'BUNDLE_VERIFY_FAILED'}
. ./work/CrmGitHub.ps1
$nl=[string][char]10+[char]10
$body='HANDOFF/REQUEST W2-X72 — consumo estricto de filtros del listado. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', base '+$cp.base+'. CLAIM6253057995. Solicito revisión/consumo del propietario W1/W2 de esta semántica compartida antes de integrar en susramas;sin ACK inferido.'+$nl+'Causal3FAIL1PASS46,8s:DTO válido paraespacio,pero distinto delcustomer/status/overdue solicitado,semuestra bajo filtrocontradictorio. Solo condición enbucleexistente parseBillingReadV1(invoice.list):coincidircliente/estado;overdue exigeissued+flagtrue. Positivosespacio,draft/trashed/issued/paid yoverduepreservados. Wire/queries/SQL/RLS/permisos/cálculo intactos,sinnuevosservicios. HTTPsintético,noprueba fugarealAuthDB nirevisiónW4.'+$nl+'Propios147original=144PASS3FAIL3,2min;3workspacepositivosfallan porque fixturedefecto abreinvoice.get alentrarsinparámetro. Solo fixtureworkspacecorregido ainiciarA yborrarmanualmente cliente paraespacioB,sinrelajarasercionesni tocarproducto. Solo3fallidosrechecados3PASS10,2s,144+3complementarios NO147singlePASS. Originales/snapshot/contextos/exit1 preservados;guardiareviertesolo3reemplazosdefixture yreconstruyebancocausal. Nuevo18,129regresiones;50/50funcionales817,5852ms/build66/lint0errores3warnings/scan/diff/cola/bundle propios.'+$nl+'Diez capturasvistas:clientecontradictorio/current3907681440,estado/overduecontradictorios1440,current-overdue1440,workspacecorregido1440. Negativossinfilas,nofalsovacío,pagingdisabled;errorsegurovisible7681440,arribadeviewport390. Positivosfactura12/Emitida/30,25EUR/acciones;workspaceTodoelespacio/Nuevodisabled/sinPrompt. Flagoverduepositivo muestraVencida ySinvencimiento enfixture:acepta solo binding alflag,no derivación defechas,coherenciafiscal realniSQL. Visualparcial,bannerexcluido.'+$nl+'342/29PARTIAL/313sinreconciliar/0READY,HIGH5/W4pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED;AuthDB/JWT/RLS/SQL/Nextintegrado/modelovivoNOT_RUN/API0.1806fuente69único18288activo sin71/72;1842/106recolectado,noejecutado;solocontroladortras72publicado y1806terminal/PUBLISHED/PASS. F736/B9/981/1266/fixtures/preparaciónconservados;fuentesajenas/PR38/142/153/main/W3/W4/W5/recursointactos. Continuarunidadcomercialindependiente.'

foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}








