$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-customer-communications-scope-review';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='METADATA_PREFLIGHT_DONE_PUBLISH_ONCE'}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'docs(product): append scoped customer communications QA evidence'
if($LASTEXITCODE){throw 'COMMIT_FAILED'}
$sha=(git -C $repo rev-parse HEAD).Trim();$tree=(git -C $repo rev-parse 'HEAD^{tree}').Trim()
$pub=@{sha=$sha;tree=$tree;publication='LOCAL_COMMIT_PUSH_PENDING';handoffs=@()}
$pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
git -C $repo push origin ('HEAD:refs/heads/'+$cp.branch)
if($LASTEXITCODE){throw 'PUSH_UNCERTAIN_INSPECT_NO_RETRY'}
$bundle=Join-Path $PSScriptRoot ($prefix+'.bundle')
git -C $repo bundle create $bundle HEAD
if($LASTEXITCODE){throw 'BUNDLE_FAILED'}
git -C $repo bundle verify $bundle
if($LASTEXITCODE){throw 'BUNDLE_VERIFY_FAILED'}
. ./work/CrmGitHub.ps1
$body=@"
HANDOFF W2-X110 — evidencia adicional individual PAR056,de fuente109.

Metadata $sha;árbol $tree;rama $($cp.branch);padre $($cp.base);CLAIM6257032126. Runtime/build/AuthDB/modelo110NOT_RUN,nohereda12 de109. Fuente10988cb515c792b8136d64b97f077cf86d9e2cc5827 conserva12nuevosPASS22,8s,lintdirigido0/0,scan/cola/12capturas/publicación. Build109NOT_RUN_TEST_ONLY_NO_PRODUCTION_CHANGE,nohereda45/build66del108.

Solo dos evidencias anexas aPAR056,cola ydocumento. Fuente principal106,stages,permisos,pending,dos evidencias anteriores yotroscampos idénticos;33otrasrevisiones/341otrasfilas/global/src/tests intactos. Matriz342/34PARTIAL/308sinreconciliar/0READY,sinpromociónniaceptaciónW4.

109:cuatroescenarios×3907681440,A→BconApendiente,cursorreiniciado yBconservadotraslateA;B403no reutilizaA;página global20deotrocliente vacíalocalmente conserva siguiente hastaA21;lector sintético retira panel/enlaces sinnuevalectura. Consultaslimit20/cursor exactas,sin cuerpos/notas/markread/comandos/errores de página/operaciones inesperadas. Producto/fixtures sinmodificar,no defecto encontrado nipruebas verdes anteriores repetidas.

12cuadros109vistos/hashrevalidados. Identidadhref21/22,retiroduranteespera yvacío inicialDOM,fotosfinalesB/denegación/página2/restringido. Late bodyfinished+dosanimationframes esventanaUIacotada,no ausencia/quiescencia/reinicio/handler/full23. No cambio realdeempresa/tenant/AuthDB/JWT/RLS/membresía física/rolescompletos/Nextintegrado/a11y/táctil/W4. Lector escontextoUI,no aprobaciónbackend. Modelo vivoNOT_RUN/API0.

F736/B9 yoriginales intactos,FIFO2139/2172/2214 conserva fuentes/sesiones,noincluye108/109/110. HIGH5/W4pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. Principales/ajenas/congeladas,W3/W4/W5/recurso yproducción intactos;consumo principalrequiereACKexacto. Guardias/diff/cola/scan/bundleverificados;seguirdefecto comercialreproducido ycheckpoint.
"@
foreach($n in @(67,153,38,142)){
 $c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body}
 $pub.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$pub.publication='PARTIAL_HANDOFF'
 $pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
}
$pub.publication='PUBLISHED';$pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python work/checkpoint-w2x-customer-communications-scope-review.py
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
python work/reconcile-w2x-current-continuation.py
if($LASTEXITCODE){throw 'MANIFEST_FAILED'}
