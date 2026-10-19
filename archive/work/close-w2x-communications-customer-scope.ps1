$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-communications-customer-scope';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='METADATA_PREFLIGHT_DONE_PUBLISH_ONCE'}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'test(customers): verify linked conversation scope and retired reads'
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
HANDOFF W2-X109 — QA de filtrado/cambio de cliente/respuesta tardía enComunicaciones.

Fuente $sha; árbol $tree; rama $($cp.branch); padre $($cp.base);CLAIM6256984064. Propios $($cp.browser_summary),12nuevos/1archivo;lint dirigido al banco0errores0avisos,scan,cola ycopia Git verificada. Src/fixtures/reviews/cola intactos con guardias/hash. Solo test ydocumento,no defecto encontrado ni cambio de producto. BuildNOT_RUN_TEST_ONLY_NO_PRODUCTION_CHANGE,nohereda45/build66del108,norepiteverdesanteriores.

Cuatro escenarios×3907681440:A→B con páginaA retenida reinicia cursor/retira filas yconservaBtrasrespuestaA;B403no reutilizaA;página global20deBfiltrada vacíaparaA conserva siguiente yencuentraA21;lector sintético retira panel/enlaces,sin nuevalectura. Dos/tresinbox.list exactaslimit20/cursor,ningún cuerpo denotas/markread/comando/error de página/operación inesperada/cuerpo privado enprimarios.

Respuestas antiguas observadas con bodyfinished ydosanimationframes antes de comprobarUI. Ventana acotada,no ausencia/quiescencia/reinicio/handler/full23 niestabilidad ilimitada.12cuadros actuales realmente vistos/hashregistrados;href21/22,filas retiradas yvacío previoDOM. Imágenes finalesB/denegación/página2/restringido,no una porfase ni20aceptaciones visuales.

CustomerCommunications/repositorio/parser Inbox reales con proveedorcontexto/HTTP sintéticos. Lector es estadodeUI,noAuthDB/JWT/RLS/tenant/membresía física/identidadreal/rolescompletos/Nextintegrado/a11y/táctil/W4. No fabricar causa de cambio de empresa usando providerfixture,ni aprobarseguridad. Modelo vivoNOT_RUN/API0.

Matriz342/34PARTIAL/308sinreconciliar/0READY intacta;PAR056noadopta109porherencia,reconciliaciónindividualsiguienteconSHAexacto. F736/B9 yoriginales intactos;FIFO2139/2172/2214 conserva versiones/sesiones,noincluye109. HIGH5/W4pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. Principales/ajenas/congeladas,W3/W4/W5/recurso yproducción intactos;principalrequiereACKexacto. Seguirunidadútiltrascheckpoint.
"@
foreach($n in @(67,153,38,142)){
 $c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body}
 $pub.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$pub.publication='PARTIAL_HANDOFF'
 $pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
}
$pub.publication='PUBLISHED';$pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python work/checkpoint-w2x-communications-customer-scope.py
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
python work/reconcile-w2x-current-continuation.py
if($LASTEXITCODE){throw 'MANIFEST_FAILED'}
