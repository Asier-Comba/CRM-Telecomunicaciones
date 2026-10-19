$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-billing-zero-total-draft';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=99610}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'test(billing): verify reviewed zero-total draft journeys'
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
$body='HANDOFF W2-X64 — borrador totalcero con revisión manual. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', base '+$cp.base+'. CLAIM6252130268. Solo test/doc;src y todos los tests previos idénticos al padre por guardas;sin defecto previo inventado.'+$nl+'Propios18/18 browser31,6s:crear/editar×sinrevisar/revisado/revisiónreiniciada×3907681440. Crear parte del texto descuento100%;precio100/cantidad1/descuento100/IVA21/IRPF0 dan todos los totales cero. Seis sin revisión no envían comando ni lectura de supuesta creación. Doce positivos envían un único comando manual simulado con10000bps/versión esperada,recibo estricto ylectura0. Cambiar notas reinicia revisión yexige confirmar otra vez. Sin emisión.'+$nl+'Funcionales propios49/49 en868,9198ms,siete bancos financieros/parser/modelo/PDF/contrato/diagnóstico con stubs. Original40de58=35PASS5FAIL y5de60 conservan fuente/resultado;49actuales no se heredan. Build66;lint0errores/3warnings;scan/diff/cola/bundle propios. Seis capturas realmente vistas:create revisado/update sinrevisar3907681440;conceptos/porcentajes/totales0/revisión/Guardar enabled-disabled. Superior cliente/fiscal/fechas ydetalle guardado no aceptados visualmente;fixture excluido.'+$nl+'Primer listado agrupado falló al mezclar CLI15/testDir14,instancias distintas Playwright;log conservado. Config exclusivo de listado alinea CLI15/testDir15 yconfirma1755/101 sin ejecutar. Controlador real85193 mantiene CLI14/testDir14 yespera esta publicación y1575terminal/PUBLISHED/PASS. No duplicarlo. Full1755real comprobará otra vez colección/pin/CWD antes de ejecutar;ningún PASS heredado.'+$nl+'HTTP/DTO sintético,componentes/repositorio/parsers reales;AuthDB/JWT/RLS/Next integrado/modelo vivoNOT_RUN/API0. No persistencia/ausenciaSQL/autoridad/durabilidad/fiscalidad/seguridad independiente acreditadas.342/27PARTIAL/315sinreconciliar/0READY,HIGH5/W4 pendientes,IA writesOFF,issue10OPEN,releaseNOT_ACCEPTED. F736/B9/981/1266 y originales propios/históricos preservados. Fuentes ajenas/PR38/142/153/main/W3/W4/W5/recurso intactos. Siguiente: cerrar global1755sobreesta fuente sin interferir yseguir defecto o aceptación individual comercial independiente.'
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}






