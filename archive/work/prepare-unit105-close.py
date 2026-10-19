from pathlib import Path
w=Path('work');r=w/'crm-w2x-document-upload-uncertain'
(r/'docs/master/W2X_DOMAIN_RETRY_FOCUS_20261019.md').write_text('''# W2-X105: foco tras reintentar Servicios

El botón Reintentar desaparece al iniciar la lectura. Sobre productoa146988c246152d41176a091a00af6b6b4f9326c, el foco quedaba en BODY tras éxito, segundo error oresultado vacío. Causal390px:3FAIL1PASS48,4s. Elegir Actualizar durante la espera ya conservaba el foco ypasó antes del cambio. No se afirma reproducción causal previa a768/1440; se verifican en el banco final.

Solo se marca restorePageFocus.current=true en el manejador nativo de reintento existente. Se reutilizan las refs de estado/error,el efecto de foco,la protección document.activeElement===document.body yla cancelación de lecturas retiradas. Sin hooks/contratos/consultas/primitivas nuevas ni modificación del foco inicial oactualización manual.

Banco final idéntico al causal:12casos de éxito/denegación/control elegido/vacío a390/768/1440,99contextuales ejecutados otra vez,111total/10archivos. Cada nuevo caso controla primera lectura403,segunda retenida yresultado;no reenvía comandos. Verifica dos service.list con customer_id/limit20/sortid_asc,ausencia de cuerpo privado,errores de página uoperaciones inesperadas. Compilación66,lint0errores/tres avisos previos,scan,cola ycapturas actuales en checkpoint.

Las imágenes acreditan orientación/foco yestado de esa lectura;el foco puede desplazar el contenedor a su pie. No acreditan todas las filas/campos,etiquetas dependientes ya asentadas,accesibilidad completa ni navegación Next integrada. Son componentes/repositorio/parsers con HTTP sintético;AuthDB/JWT/RLS/membresía física/modelo vivo NOT_RUN/API0. No ausencia/quiescencia/reinicio/handler/full23. No se heredan99 ni2109 de sus fuentes anteriores.

Matriz342/33PARTIAL/309sinreconciliar/0READY sin promociones. CincoHIGH/W4 pendientes,IA comercial writesOFF,issue10OPEN,releaseNOT_ACCEPTED. F736/B9 yfallos originales conservados. FIFO2139source97/2172source102,ramas principales/ajenas/congeladas,W3/W4/W5/recurso yproducción intactos.
''',encoding='utf-8')
s=(w/'preflight-unit104.py').read_text(encoding='utf-8').replace('domain-operator-label-wrap','domain-retry-focus').replace('99 passed','111 passed').replace('99 tests in 9 files','111 tests in 10 files').replace('W2X_DOMAIN_OPERATOR_LABEL_WRAP','W2X_DOMAIN_RETRY_FOCUS').replace('domain-operator-label-*.png','domain-retry-focus-*.png').replace('len(frames)==9','len(frames)==12').replace('len(obs)==9','len(obs)==12').replace('OPERATOR_LABEL_AND_SERVICE_VISIBLE_SAFE_FALLBACK','RETRY_OUTCOME_FOCUS_WITH_CHOSEN_CONTROL_PRESERVED').replace(" assert x['geometry']['scroll']<=x['geometry']['client']+1\n",'').replace('OWN99_BUILD66_VISUAL9','OWN111_BUILD66_VISUAL12').replace('controls_session=56302','controls_session=84214').replace('99_PASS_OWN_SOURCE','111_PASS_OWN_SOURCE').replace('9currentglobalserviceframes long/ordinary/denied128014401920;completeprovidedoperator/customer/servicevisible;notallrecords/domains/fields/Nextnavigation/roles/a11yacceptance','12retryoutcome focusframes success/denied/chosen/empty3907681440;focusedfooter may scroll;notallrecords/settleddependentlabels/fields/Nextnavigation/roles/a11yacceptance')
(w/'preflight-unit105.py').write_text(s,encoding='utf-8')
s=(w/'close-w2x-domain-operator-label-wrap.ps1').read_text(encoding='utf-8-sig').replace('domain-operator-label-wrap','domain-retry-focus').replace('session=56302','session=84214').replace('preflight-unit104.py','preflight-unit105.py').replace('fix(customers): wrap operator labels while preserving service context','fix(customers): restore retry outcome focus in service collections')
a=s.index('$body=@"');b=s.index('\nforeach($n in',a)
s=s[:a]+'''$body=@"
HANDOFF W2-X105 — foco de teclado tras reintentar lectura de Servicios.

Fuente $sha; árbol $tree; rama $($cp.branch); padre $($cp.base); CLAIM6256746412. Propios $($cp.browser_summary), compilación66,lint0errores/3avisos conservados,scan,cola ycopia Git verificada.12casos nuevos de éxito/error/control elegido/vacío×3907681440;99contextuales recién ejecutados,sin heredar controles del padre.

Causal390:3FAIL1PASS48,4s sobrea146. Al desaparecer Reintentar,el foco quedabaBODY después de éxito/nuevo403/vacío;Actualizar elegido durante la espera ya mantenía foco. No reproducción causal previa en otros anchos:verificación final propia allí. Una sola señal restorePageFocus.current=true en el manejador existente reutiliza refs/efecto/protección de control elegido/cancelación;sin nueva primitiva/hook/consulta/contrato.

Banco final idéntico al causal. Dos lecturas service.list exactas por caso,primera403/segunda retenida;estado oalerta reciben foco,Actualizar elegido se conserva. Sin cuerpo privado,comandos,errores de página ni operaciones inesperadas en primarios.12capturas realmente vistas con hashes;alcance foco/estado,footer puede desplazar scroll,no todas las filas/campos/etiquetas dependientes asentadas nia11y completa.

Componentes/repositorio/parsers con HTTP sintético. AuthDB/JWT/RLS/membresía física/Next integrado/modelo vivoNOT_RUN/API0;sin ausencia/quiescencia/reinicio/handler/full23. F736/B9 yoriginales intactos.2109source92PASS43,9min publicado;2139source97ejecución26311 y2172source102wait76705 conservanFIFO/pines,no acreditan105.

Matriz342/33PARTIAL/309sinreconciliar/0READY intacta,HIGH5/W4 pendientes,IA writesOFF,issue10OPEN,releaseNOT_ACCEPTED. Ramas principales/ajenas/congeladas,W3/W4/W5/recurso yproducción intactos;consumo principal requiere ACK exacto. Continuar otra unidad comercial independiente con CLAIM ycheckpoint íntegro.
"@'''+s[b:];(w/'close-w2x-domain-retry-focus.ps1').write_text(s,encoding='utf-8-sig')
