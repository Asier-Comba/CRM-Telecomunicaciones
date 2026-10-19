$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-document-destination-read-retirement';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='CORRECTED_QA_PREFLIGHT_DONE_ORIGINAL_PRESERVED_PUBLISH_ONCE'}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'test(documents): verify destination retirement with optional customer probe'
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
HANDOFF W2-X113 — QA de foco/retirada de lectura en destinosDocumentos,con originales conservados.

Fuente $sha;árbol $tree;rama $($cp.branch);padre $($cp.base);CLAIM6257170620ampliadoAMEND_EXISTING_FIXTURE_CUSTOMER_PROBEantesdeeditar. Original9exit1:6PASS3FIXTURE_FAIL3,6min;customer_supersedes3907681440noencuentrannavBpor earlyreturnfixture,antesdecambiarpropcliente. Banco/log/directorio/seisobservations/trescapturas/errorcontexts/lintoriginalconservadoshash;no9PASSoriginal niproductoreproducidoenesa fase.

Intentocorregidopropio $($cp.browser_summary),21/2archivos:9primarios+12contract-selectiondefaultreciénejecutadosporqueelfixturecambió. Nocontar27/noreusar6originales. Lintdirigido banco+fixture0/0,scan,cola,bundleverificado;buildNOT_RUN_TEST_FIXTURE_ONLY_SRC_UNCHANGED,no24/build66heredadosde111.

Solo customerProbe=1añadenavA/Bsobreestadoid/entrada/servidorexistentes,nuevoinputdefixture no nueva pantallaProducto/recursoW5. Sinflagotrosmodosbyteidénticos,reversiónexactay12regresionesdefaultverificadas. BancoURLcambiasoloparacustomer_supersedes,sinasercionesquitadasnirelajar60s. SRCproducciónintacto,ningúnarregloproductoafirmado.

9escenarioscorregidos3907681440:mantenerselectortipoelegidoduranteespera;tipo→Empresaretiraintención/registro;clienteA→Bporpropcontroladareseteatipo/target ydocument.listva aB. TrascuerpoHTTPfinished+dosanimationframes,UIactualsemantiene,sinconsultadocument.listdeserviciosinelegir. Ventanaacotada,nopruebaausencia/quiescencia/reinicio/handler/full23.9cuadroscorregidosvistos/hashregistrados;key/foco/rechazoantiguoDOM,fotosfinales,nitodoslos20destinos/a11y/táctil.

Datos/HTTP/contextosintéticos,componentes/repositorios/parsersreales. NoAuthDB/JWT/RLS/tenant/membresía/identidad/rolesreales/Next/W4. Sincommands/uploads/borrados/privadobody/errores/operacionesinesperadasenprimarios. Modelo vivoNOT_RUN/API0. PAR053negativocontrolelegidoNOT_RUN111permanecehistórico;mediciónnueva113nosehereda.

Matriz342/34PARTIAL/308sinreconciliar/0READY,HIGH5/W4pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. F736/B9yotrosoriginalesconservancausadesconocida. FIFO2172/2214/2256pinnedfuentesanterioresnoincluye113/probe. Principales/ajenas/congeladas,W3/W4/W5/recurso/producciónintactos;principalrequiereACKexacto. Seguirunidadútiltrascheckpoint.
"@
foreach($n in @(67,153,38,142)){
 $c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body}
 $pub.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$pub.publication='PARTIAL_HANDOFF'
 $pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
}
$pub.publication='PUBLISHED';$pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python work/checkpoint-w2x-document-destination-read-retirement.py
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
python work/reconcile-w2x-current-continuation.py
if($LASTEXITCODE){throw 'MANIFEST_FAILED'}
