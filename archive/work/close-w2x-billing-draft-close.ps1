$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-billing-draft-close';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=36896}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(billing): disable draft close while command outcome is pending'
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
$body='HANDOFF W2-X50:cierre visual de editor alineado conbloqueo existente. Fuente '+$sha+',árbol '+$tree+',rama '+$cp.branch+',base '+$cp.base+'. CLAIM6251143949.'+$nl+'Original2FAILcreate/update1440:Xhabilitada conrecibo incierto aunque handler rechazaba cierre. Ahora propopcionalcloseDisabled=false enInvoiceEditor pasa aDrawerexistente;padre usa blocked(busy/registrado/incierto),no locked queincluyeconflicto con cierre legítimo. Handler/pendientes/comandos/CAS/queries/recibos intactos mediante reversióntextual exacta;primitiva sin cambios. Default conserva preview.'+$nl+'Controles propios60PASS:18draftreceipt+42recibos deotras7acciones;Xdisabled yEscape no descartan intención,reintentoexacto,403conserva edición/cierre,positivos válidos/readback. Build66/lint0errores3warnings/scan/diff/cola/bundle. RevisiónReact aplicada:booleanderivada,sin estado/efecto/dependencias;disablednativo conetiqueta existente,scope limitado,no auditoría integral.'+$nl+'Siete capturas actuales realmente vistas:incierto create3anchos/update3901440 superiorXgris/retry/camposbloqueados;denegadoscreate390/update1440 inferior datos/importes/acciones,error/header fuera viewport. Visualparcial. Componentes/repositorio/parsers reales,HTTPcontrolado;AuthDB/JWT/RLS/Nextintegrado/modelovivoNOT_RUN/API0;noSQLausencia/idempotencia/persistencia acreditados. Ninguna emisión enbanco nuevo.'+$nl+'Cola342/26PARTIAL/316sinreconciliar/0READY;global1416BF72propio,no herencia. HIGH5/W4/IAwritesOFF/issue10OPEN/releaseNOT_ACCEPTED;originalesF736/B9/981/1266yfixture45/harness48intactos. Fuentesajenas/PR38/142/153/main/W3/W4/W5/recurso sin cambios. Siguiente:recuperación postrecibo válido de creación/edición si falla lectura actual,sin reenviar comando,conCLAIM/banco propios.'
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}
