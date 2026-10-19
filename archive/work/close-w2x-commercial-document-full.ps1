param([int]$BrowserExit)
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
 if(Test-Path work/w2x-commercial-document-full-close-requested.json){throw 'CLOSE_ALREADY_REQUESTED;INSPECT_CHECKPOINT_BEFORE_ANY_RETRY'}
 @{browser_exit=$BrowserExit;publication='PENDING';handoffs=@()}|ConvertTo-Json -Depth 8|Set-Content work/w2x-commercial-document-full-close-result.json
 @{sha='dec2edcad7f4796440daff2c1e59dde6ca7981c1';utc=(Get-Date).ToUniversalTime().ToString('o')}|ConvertTo-Json|Set-Content work/w2x-commercial-document-full-close-requested.json
 python work/checkpoint-w2x-commercial-document-full.py
 if($LASTEXITCODE){throw 'LOCAL_EVIDENCE_BINDING_FAILED'}
 $cp=Get-Content work/w2x-commercial-document-full-checkpoint.json -Raw|ConvertFrom-Json
 . ./work/CrmGitHub.ps1
 $outcome=if($cp.full_suite_pass){'704/704 HTTP controlado PASS, ejecución propia completa; lint/build66/scan del mismoSHA y cola342/15PARTIAL/327sinreconciliar/0READY. Visual parcial3 del mismoSHA de unidad73; sin promoción de matriz.'}else{'FALLO del control completo704 conservado; no se califica PASS. Código de salida'+$BrowserExit+'. Logs/checkpoint con hash, causa pendiente de inspección, sin retry automático ni relajación. Unidad73 anterior conserva solo su alcance.'}
 $body='CI LOCAL W2-X cerrada fuente exactadec2edcad7f4796440daff2c1e59dde6ca7981c1 / árbold918183704f2d0936a93cadd784f044d4e81b7b8, rama codex/w2x-document-download-lifetime-20261015, CLAIM6181197466. '+$outcome+' Cwd/React/child verificados antes de iniciar, workers1/retries0/60000 y fuente intacta. No se heredan677 de c137 ni653 de a292; sus resultados/fallos originales se conservan porSHA. Auth/DB/Storage/renderizado fiscal real/modeloNOT_RUN/API0; HIGH5/W4/ACK principal pendientes, IA writesOFF/issue10OPEN/releaseNOT_ACCEPTED. Sin cambios38/142/153/W3/W4/W5 ni recursos. Fuente/bundle publicados y checkpoint local íntegro. Siguiente: CLAIM6181243189 ya tiene reproducción preparada y gated detrás de este704; revisar su propio resultado antes de modificar. Este cierre no inicia otra reproducción ni unidad. Si falta sesión/equipo/cuota no se promete ejecución.'
 $posts=@();foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi "/issues/$n/comments" Post @{body=$body};$posts+=[pscustomobject]@{issue=$n;id=$c.id;url=$c.html_url};@{browser_exit=$BrowserExit;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content work/w2x-commercial-document-full-close-result.json}
 @{browser_exit=$BrowserExit;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content work/w2x-commercial-document-full-close-result.json
 python work/checkpoint-w2x-commercial-document-full.py
 if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
 $pr=Invoke-CrmApi '/pulls/153'
 if($pr.head.sha -eq '7f6626e32a609eb22ffdd8052c9cc59e60d98453'){
  $old='Sobre dec2 se ejecutan704/60archivos ahora: RUNNING, no resultado heredado.'
  if($pr.body.Contains($old)){
   $replacement=if($cp.full_suite_pass){'Sobre dec2:704/704 propios PASS en ejecución completa, sin resultados heredados.'}else{'Sobre dec2:control completo704 FALLIDO conservado, requiere revisión; no se califica PASS.'}
   $bodyUpdated=$pr.body.Replace($old,$replacement)
   $null=Invoke-CrmApi '/pulls/153' Patch @{body=$bodyUpdated}
   $bodyUpdated|Set-Content work/w2x-pr153-current-failure-body.md
  }
 }
 $posts|ConvertTo-Json -Compress
}finally{Pop-Location}
