$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$prefix='w2x-portfolio-selected-title-wrap';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_EXISTING_CONTROLS';session=50587}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
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
git -C $repo commit -m 'fix(ui): contain drawer titles without shrinking close controls'
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
$body='HANDOFF W2-X92 — Título completo del editor y botón de cierre contenidos.'+$nl+'Fuente '+$sha+'; árbol '+$tree+'; rama '+$cp.branch+'; padre '+$cp.base+'; CLAIM '+$cp.claim+'. Propios '+$cp.browser_summary+' (9pertinentes y273regresiones representativas de Cartera,Contratos,Portabilidades,SIM y número protegido),build66,lint,scan,diff,cola ybundle verificado. Funcionales:NOT_RUN_UI_STYLE_ONLY. No237o36heredados;esta ejecución es nueva por el efecto compartido de CSS.'+$nl+'Causal1FAIL/1PASS21,9s conservado,con log/exit/banco y2observaciones. Tras corregir la tarjeta91,abrir una etiqueta válida160 expandía panel389útiles a1971de contenido;el foco/desplazamiento horizontal dejaba el inicio del título en-1561. Cerrar seguía visible por el foco,pero el título quedaba recortado. Ordinario26 pasaba. Se miden panel,header,título ybotón,nosolo el ancho de página.'+$nl+'Únicamente2atributos de clase en Drawer existente:envolver h2 con mínimo0 yevitar compresión del botón nativo. Negrita,color,texto completo,aria-labelledby,props,eventos,estado,callbacks,disabled ypolíticas de cierre idénticos. No nuevo componente,API,primitiva,lógica,consulta oservicio. Reversión exacta al padre;aserciones intactas. Un guard previo rechazó una suposición de clase font-semibold antes de tocar fuente;se ancló a la tipografía real font-bold/text-slate-900,sin repetir causal. Fallo de preparación separado de la causa del producto.'+$nl+'Seis geometrías positivas a390/768/1440 contienen título completo ybotón dentro del panel,sin scroll horizontal. Nombre del campo ylinks exactos cliente/contrato se conservan;clic real enCerrar devuelve a la misma tarjeta. Un search ydos lecturas de servicio por caso,sin comando.403en segunda lectura mantiene la tarjeta autorizada pero no abre editor nimuestra cuerpo privado. No aceptación de AuthDB/privacidad real.'+$nl+'Nueve capturas realmente vistas:header largo/ordinario yerror seleccionado. Valor completo del input yrelaciones también comprobados porDOM;no formulario/editor entero,otros tipos de activo,matriz de roles,táctil oaccesibilidad completa. HTTP/DTO/componentes/repositorio/parsers reales,sin escrituras;AuthDB/JWT/RLS/SQL/Nextintegrado/modelo vivoNOT_RUN/API0. Sin ausencia/quiescencia/reinicio/handler/full23.'+$nl+'Global2007/source86 activo41016 y2043/source88 waiter93361 mantienen pines yno acreditan90/91/92. Colección coalescida2109/121 verificada (2043+48SIM90+9tarjeta91+9título92);solicitar solo trasfuente92 propia publicada/cualificada y2043terminal/PUBLISHED/PASS. Sin reintentos,retarget o cancelación. Matriz342/31PARTIAL/311sinreconciliar/0READY,HIGH5/W4 pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. F736/B9 y evidencias anteriores preservadas. Main,PR38/142/153,ramas congeladas yW3/W4/W5/recurso intactos;consumo principal pendiente de ACK exacto. Continuar otra unidad comercial útil.'

foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$publication.handoffs+=@{issue=$n;id=$c.id;url=$c.html_url};$publication.publication='PARTIAL_HANDOFF';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')}
$publication.publication='PUBLISHED';$publication|ConvertTo-Json -Depth 8|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_INSPECT'}









