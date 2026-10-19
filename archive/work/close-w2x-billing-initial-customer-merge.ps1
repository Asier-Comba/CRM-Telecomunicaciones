$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-billing-initial-customer-merge';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=54078}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(billing): merge late initial customer identity'
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
$body='HANDOFF W2-X67 — cliente inicial tardío y búsqueda actual. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', base '+$cp.base+'. CLAIM6252473013.'+$nl+'Original1FAIL/1PASS23,5s: tras buscar/seleccionarB, respuesta inicialA sustituye clientes;B conserva suID pero queda «Cliente sin verificar» yNuevo borrador disabled en contexto de error. Control inicial sin búsqueda pasa. Solo setter funcional:actualizaA porid yconserva entradas actuales. Reversión exacta devuelve padre;sin estado/efecto/query/permiso/comando nuevos,avisos65/parser/cálculo/contrato/repositorio/editor intactos.'+$nl+'Propios78/78 browser1,8min y49/49 funcionales830,8381ms.18nuevos:Aactivo/archivado×buscado/seleccionado/inicial×3907681440. B conserva nombre,selección,disponibilidad ytexto de propuesta;Aarchivado sigue bloqueado cuando es seleccionado. Texto añadido al banco final;original guardado yguardia prueba solo dos operaciones añadidas sin relajar aserciones. No se inventa un resultado previo de pérdida de texto. Una identidad/una búsqueda cuando procede;invoice.list siempreA/B explícitos,nuevo banco sin comandos.60regresiones filtro/archivo/preparación/contexto. Build66;lint0errores/3warnings;scan/diff/cola/bundle propios.'+$nl+'Seis capturas realmente vistas:Bseleccionado3907681440 conAactivo/archivado;nombreB,Nuevo habilitado ytexto legibles,sin aviso de archivo incorrecto paraB. EstadoA/opciones cerradas porHTTPDOM,no píxeles visibles;lista vacía de fixture no ausenciaSQL,móvil inferior recortado. Visual parcial,no módulo/autoridad multiempresa completos. HTTPDTO sintético,componentes/repositorio/parsers reales;AuthDB/JWT/RLS/Next integrado/modelo vivoNOT_RUN/API0.'+$nl+'Global1755fuente64/1773fuente65 separados,sin esta corrección ni18casos;no cancelar/duplicar/heredarPASS.342/28PARTIAL/314sinreconciliar/0READY,HIGH5/W4 pendientes,IA writesOFF,issue10OPEN,releaseNOT_ACCEPTED. F736/B9/981/1266/fixtures/preparación intactos;esta causaUI no se atribuye a ellos. Fuentes ajenas/PR38/142/153/main/W3/W4/W5/recurso intactos. Siguiente:revisión individual PAR103 listado/búsqueda/filtro,continuar trabajo útil ycoalescer fuente comercial posterior trascontroles previos terminales/publicados.'
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}








