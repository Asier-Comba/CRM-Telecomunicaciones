param([int]$BrowserExit)
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
 if(Test-Path work/w2x-commercial-portfolio-invalid-full-close-requested.json){throw 'CLOSE_ALREADY_REQUESTED;INSPECT_CHECKPOINT_BEFORE_ANY_RETRY'}
 @{browser_exit=$BrowserExit;publication='PENDING';handoffs=@()}|ConvertTo-Json -Depth 8|Set-Content work/w2x-commercial-portfolio-invalid-full-close-result.json
 @{sha='9956bd10cde0e6d2ff09a3a9f6e6f15a67ce2b56';utc=(Get-Date).ToUniversalTime().ToString('o')}|ConvertTo-Json|Set-Content work/w2x-commercial-portfolio-invalid-full-close-requested.json
 python work/checkpoint-w2x-commercial-portfolio-invalid-full.py
 if($LASTEXITCODE){throw 'LOCAL_EVIDENCE_BINDING_FAILED'}
 $cp=Get-Content work/w2x-commercial-portfolio-invalid-full-checkpoint.json -Raw|ConvertFrom-Json
 . ./work/CrmGitHub.ps1
 $outcome=if($cp.full_suite_pass){'876/876 HTTP controlado PASS, ejecución propia completa; lint/build66/scan del mismoSHA y cola342/15PARTIAL/327sinreconciliar/0READY. Visual parcial7 del mismoSHA de unidad172; sin promoción de matriz.'}else{'FALLO del control completo876 conservado; no se califica PASS. Código de salida'+$BrowserExit+'. Logs/checkpoint con hash, causa pendiente de inspección, sin retry automático ni relajación. Banco172 anterior conserva solo su alcance.'}
 $body='CI LOCAL W2-X cerrada fuente exacta9956bd10cde0e6d2ff09a3a9f6e6f15a67ce2b56 / árbol34c07bfc0eb7047544404c0e1729f30bc75e1515, rama codex/w2x-portfolio-invalid-receipt-20261015, CLAIM6188526258 (handoff6188941328). '+$outcome+' Cwd/React/child verificados antes de iniciar, workers1/retries0/60000 y fuente intacta. No se heredan740 de b509 ni57 de2268; sus resultados/fallos originales se conservan porSHA. Auth/DB/Storage/renderizado fiscal real/modeloNOT_RUN/API0; HIGH5/W4/ACK principal pendientes, IA writesOFF/issue10OPEN/releaseNOT_ACCEPTED. Sin cambios38/142/153/W3/W4/W5 ni recursos. Fuente/bundle publicados y checkpoint local íntegro. Siguiente: investigar una unidad comercial independiente desde fuente elegible y publicar CLAIM antes de modificar; este cierre no inicia otra unidad. Si falta sesión/equipo/cuota no se promete ejecución.'
 $posts=@();foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi "/issues/$n/comments" Post @{body=$body};$posts+=[pscustomobject]@{issue=$n;id=$c.id;url=$c.html_url};@{browser_exit=$BrowserExit;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content work/w2x-commercial-portfolio-invalid-full-close-result.json}
 @{browser_exit=$BrowserExit;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content work/w2x-commercial-portfolio-invalid-full-close-result.json
 python work/checkpoint-w2x-commercial-portfolio-invalid-full.py
 if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
 $pr=Invoke-CrmApi '/pulls/153'
 if($pr.head.sha -eq '7f6626e32a609eb22ffdd8052c9cc59e60d98453'){
  $old='fuente9956:control global876 pendiente de cierre, sin resultados heredados.'
  if($pr.body.Contains($old)){
   $replacement=if($cp.full_suite_pass){'fuente9956:876/876 propias PASS en ejecución completa, sin resultados heredados.'}else{'fuente9956:control global876 FALLIDO conservado, requiere revisión; no se califica PASS.'}
   $bodyUpdated=$pr.body.Replace($old,$replacement)
   $null=Invoke-CrmApi '/pulls/153' Patch @{body=$bodyUpdated}
   $bodyUpdated|Set-Content work/w2x-pr153-current-failure-body.md
  }
 }
 $posts|ConvertTo-Json -Compress
}finally{Pop-Location}
