$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-billing-selected-customer-label';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=27459}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(billing): show complete selected customer identity'
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
$body='HANDOFF W2-X73 — cliente seleccionado legible. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', base '+$cp.base+'. CLAIM6253173253.'+$nl+'RequisitoUX reproducido1FAIL1PASS23,0s:nombre completo noidentificable fuera delselectcerrado;denegado sinnombreya cumple. No pérdidadelID ni defectoautoridadbackend. Solo registroseleccionado derivado una vez,reutilizado para disponibilidad/archivo,ycaption conajustedeancho. Sinestado/efecto/query/servicio/permiso/cálculo/contrato nuevos. Guardiarevierte3reemplazos ydevuelvepadre;parser/validación72/pruebasprevias intactos;finaltestidénticocausal.'+$nl+'Propios156/156 browser2,9min y50/50funcionales753,2677ms/build66/lint0errores3warnings/scan/diff/cola/bundle.9nuevos:largo/borradomanual/403×3907681440. Nombrecompleto de80caracteresseguidos ajusta;clear quitanombre/propuesta ybloqueaNuevo,sóloeseactoamplíalista;403IDsinverificar,sinlabel/nuevobloqueado. Unaidentidad/unalista,salvoclear2;sincomandos/propuesta/emisión.156nuevo completoconworkspacecorregido,no reescribe72original144PASS3FAIL+3complementarios.'+$nl+'Nueve capturasrealmentevistas:nombrecompletolegible juntoalselectortruncado,sinoverflow;clearTodoelespacio/sincaption/sinPrompt/Nuevodisabled;403errorseguro/Clientesinverificar/sinlabel.390inferiorrecortado,fixturevacío noausenciaSQL,bannerexcluido. Visualparcial,no módulo/accesibilidad/seguridadcompletos.'+$nl+'HTTPDTOsintético,componentes/repositorio/parsers reales;AuthDB/JWT/RLS/SQL/Nextintegrado/modelovivoNOT_RUN/API0.342/29PARTIAL/313sinreconciliar/0READY,HIGH5/W4pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. SemánticaW1de72pendienterevisión/consumopropietario;overduefixtureflag nodemuestrafechas/cálculoreal.1806fuente69único18288activo,1842fuente72waiter71901,sinestaUI9nuevos;noheredar/cancelar/duplicar. F736/B9/981/1266/fixtures/preparaciónconservados;fuentesajenas/PR38/142/153/main/W3/W4/W5/recursointactos. Siguiente:Customer360nombrelargo,reproducir antesdecorregir,coalescersiguientefuentetrascontrolesprevios.'

foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}








