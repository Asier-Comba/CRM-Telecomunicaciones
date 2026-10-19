$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-customer-documents-recovery-review';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='METADATA_PREFLIGHT_DONE_PUBLISH_ONCE'}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
$cp=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -ne 0 -or $remote){throw 'REMOTE_EXISTS_OR_UNAVAILABLE'}
git -C $repo add -- @($cp.candidate_fingerprints|ForEach-Object {$_.path})
if($LASTEXITCODE){throw 'STAGING_FAILED'}
git -C $repo commit -m 'docs(product): reconcile document destination recovery individually'
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
HANDOFF W2-X112 — revisión individual PAR053 Customer360:Documentos con111.

Metadata $sha;árbol $tree;rama $($cp.branch);padre $($cp.base);CLAIM6257134170. Runtime/build/AuthDB/modelo112NOT_RUN,nohereda24. Evidencia1115e364a786015d5b627ed2ba1dff7158e136189b4:24PASS41,4s/build66/lint0errores3avisos/scan/cola/publicación.12nuevos derecuperaciónService-targets y12contextuales decontratos/etiquetas/página/operadorocontratosdenegados,ambos relevantesparcialmenteaPAR053,no24capacidadescompletas.

SoloPAR053BROWSER_ACCEPTED deNOT_RECONCILED→PARTIAL con111,dos evidenciasañadidas,cola/documento. Fuenteprincipal27b/2evidenciasprevias,otrosstages/permisos/pending/global/src/tests intactos;33otrasrevisiones/341otrasfilas idénticos. Matriz342/34PARTIAL/308sinreconciliar/0READY,sinPASSmasivo/retroPASS27b/seguridadW4.

Retorno tras403vianuevaconsulta,guardiascarga/sincursor,focoaselector/alerta trasretorno/reintento,destinoexplícito1/21o2/21→document.list. GuardiaBODYesimplementaciónestática;negativocontrolelegidoduranteesperaNOT_RUN111,sinheredar105/106. Causal1103FAIL1PASS58,8s390conservado,otrosanchosfinalessolamente.

12fotosprimarias111vistasantesdepublicary12contractualesdelamismaejecuciónvistasahoraCOMPLEMENTO112;24hashesrevalidados,norepetirpruebas. Contractdeniedfotodespuésdereintento,no403visual. Focoantesdeelegir/claveydatostextocompletooptionDOM,no20aceptacionesvisuales;nounafotoporfase.390piedepanelDocumentosparcialmentefueradecuadro.

Faltatodoslosdestinos/contenidos/Storage/AuthDB/JWT/RLS/membresíafísica/roles/Next/a11y/táctil/W4. HTTPsintéticoconcomponentes/repositorios/parsers reales,noaislamientoreal. Modelo vivoNOT_RUN/API0,sin ausencia/quiescencia/reinicio/handler/full23. F736/B9 yoriginalesintactos. HIGH5/W4pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED.

FIFO2139source97/2172source102/2214source106intacto.2256/135realescolectadosparafuente111,NOsolicitadoshastaquedehuecoparaevitarsobrescribirfollowing2214. Principales/ajenas/congeladas,W3/W4/W5/recurso/producciónintactos;principalrequiereACKexacto. Guardias/diff/cola/scan/bundleverificados;seguirunidadcomercialútiltrascheckpoint.
"@
foreach($n in @(67,153,38,142)){
 $c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body}
 $pub.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$pub.publication='PARTIAL_HANDOFF'
 $pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
}
$pub.publication='PUBLISHED';$pub|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python work/checkpoint-w2x-customer-documents-recovery-review.py
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
python work/reconcile-w2x-current-continuation.py
if($LASTEXITCODE){throw 'MANIFEST_FAILED'}
