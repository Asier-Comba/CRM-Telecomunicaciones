param([int]$BrowserExit)
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
 if(Test-Path work/w2x-commercial-case-contract-full-close-requested.json){throw 'CLOSE_ALREADY_REQUESTED;INSPECT_CHECKPOINT_BEFORE_ANY_RETRY'}
 @{browser_exit=$BrowserExit;publication='PENDING';handoffs=@()}|ConvertTo-Json -Depth 8|Set-Content work/w2x-commercial-case-contract-full-close-result.json
 @{sha='b509327bb4ed14fd593ab702b7a905990063b59e';utc=(Get-Date).ToUniversalTime().ToString('o')}|ConvertTo-Json|Set-Content work/w2x-commercial-case-contract-full-close-requested.json
 python work/checkpoint-w2x-commercial-case-contract-full.py
 if($LASTEXITCODE){throw 'LOCAL_EVIDENCE_BINDING_FAILED'}
 $cp=Get-Content work/w2x-commercial-case-contract-full-checkpoint.json -Raw|ConvertFrom-Json
 . ./work/CrmGitHub.ps1
 $outcome=if($cp.full_suite_pass){'740/740 HTTP controlado PASS, ejecución propia completa; lint/build66/scan del mismoSHA y cola342/15PARTIAL/327sinreconciliar/0READY. Visual parcial3 del mismoSHA de unidad45; sin promoción de matriz.'}else{'FALLO del control completo740 conservado; no se califica PASS. Código de salida'+$BrowserExit+'. Logs/checkpoint con hash, causa pendiente de inspección, sin retry automático ni relajación. Unidad45 anterior conserva solo su alcance.'}
 $body='CI LOCAL W2-X cerrada fuente exactab509327bb4ed14fd593ab702b7a905990063b59e / árbol7fc1a70bfe803e471655a5017bd658b82070ccfc, rama codex/w2x-case-contract-selection-20261015, CLAIM6187486280 (handoff6188089728). '+$outcome+' Cwd/React/child verificados antes de iniciar, workers1/retries0/60000 y fuente intacta. No se heredan677 de c137 ni653 de a292; sus resultados/fallos originales se conservan porSHA. Auth/DB/Storage/renderizado fiscal real/modeloNOT_RUN/API0; HIGH5/W4/ACK principal pendientes, IA writesOFF/issue10OPEN/releaseNOT_ACCEPTED. Sin cambios38/142/153/W3/W4/W5 ni recursos. Fuente/bundle publicados y checkpoint local íntegro. Siguiente: investigar una unidad comercial independiente desde fuente elegible y publicar CLAIM antes de modificar; este cierre no inicia otra unidad. Si falta sesión/equipo/cuota no se promete ejecución.'
 $posts=@();foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi "/issues/$n/comments" Post @{body=$body};$posts+=[pscustomobject]@{issue=$n;id=$c.id;url=$c.html_url};@{browser_exit=$BrowserExit;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content work/w2x-commercial-case-contract-full-close-result.json}
 @{browser_exit=$BrowserExit;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content work/w2x-commercial-case-contract-full-close-result.json
 python work/checkpoint-w2x-commercial-case-contract-full.py
 if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
 $pr=Invoke-CrmApi '/pulls/153'
 if($pr.head.sha -eq '7f6626e32a609eb22ffdd8052c9cc59e60d98453'){
  $old='fuente b509:740/62archivos en ejecución, sin heredar resultados.'
  if($pr.body.Contains($old)){
   $replacement=if($cp.full_suite_pass){'fuente b509:740/740 propias PASS en ejecución completa, sin resultados heredados.'}else{'fuente b509:control completo740 FALLIDO conservado, requiere revisión; no se califica PASS.'}
   $bodyUpdated=$pr.body.Replace($old,$replacement)
   $null=Invoke-CrmApi '/pulls/153' Patch @{body=$bodyUpdated}
   $bodyUpdated|Set-Content work/w2x-pr153-current-failure-body.md
  }
 }
 $posts|ConvertTo-Json -Compress
}finally{Pop-Location}
