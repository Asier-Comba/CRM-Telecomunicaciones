from pathlib import Path
w=Path('work');s=(w/'close-w2x-customer-list-filter-priority.ps1').read_text(encoding='utf-8-sig').replace('customer-list-filter-priority','customer-list-page-focus').replace('session=35154','session=9111').replace('preflight-unit97.py','preflight-unit99.py').replace("'fix(customers): prioritize mobile inventory with persistent collapsible filters'","'fix(customers): restore pagination outcome focus without stealing user intent'")
a=s.index('$body=@"');b=s.index('\nforeach($n in',a)
body='''$body=@"
HANDOFF W2-X99 — Clientes: orientación por teclado al terminar la paginación.

Fuente $sha; árbol $tree; rama $($cp.branch); padre $($cp.base); CLAIM6256232595. Propios $($cp.browser_summary):27 casos relacionados con inventario y51 contextuales. Compilación66, analizador con tres avisos previos conservados, scan, diferencias, cola y copia Git verificada. Padre98 solo añade evidencia y conserva src/tests de97; ningún66 u otro PASS se hereda.

Causal2FAIL1PASS49,6s sobre producto intacto: Enter enPágina siguiente con respuesta retenida deja BODY como foco al llegar página válida o403. Resultado/alerta ya visibles; comandos y errores de página vacíos. Control positivo elige Nuevo cliente durante la espera y conserva BUTTON. Se mantienen logs, observaciones, capturas, banco y causas; no fallo de backend/roles real.

Se consume el patrón de foco ya existente en CustomerDomainPages: intención solo siguiente/anterior, resultado/alerta enfocables y orientación al terminar si el foco continúa en el cuerpo. Elegir otro control se respeta. Filtrar/actualizar retira intención; las respuestas tardías siguen usando la retirada de petición existente. Referencia de presentación opcional ytabindex negativo, sin otra primitiva/API/servicio/consulta/permiso. Filtros desplegables97 preservados. Estado de página concuerda1empresa/20empresas.

Doce casos nuevos: éxito,403,foco elegido yfiltro que sustituye a página pendiente en390/768/1440. Se retiran filas durante espera, se recupera primera página con teclado tras denegación yse descarta fila antigua al filtrar,sin foco de paginación filtrado. DTO20+1/cursor válidos, sin comandos. Banco final idéntico al causal, ampliando ejecución a las demás anchuras ycasos previstos; no aserciones relajadas. Los15 controles anteriores de nombres/filtros y51 contextuales se ejecutan de nuevo en esta fuente.

Doce cuadros actuales realmente vistos: foco de estado/alerta,botón elegido yregistro filtrado. La recuperación a página1 tras error es evidenciaDOM posterior a la foto del error;en390 con filtros abiertos la fila filtrada queda debajo del cuadro. No aceptación de todos los campos/columnas/teclado de todos los módulos,roles,accesibilidad completa o táctil.

IntegratedCustomers/Customers/repository/parsers reales con HTTP sintético yRouter de prueba existente. AuthDB/JWT/RLS/roles/membresía/multiempresa física/navegaciónNext integrada/modelo vivoNOT_RUN/API0; sin ausencia/quiescencia/reinicio/handler/full23. No atribuir privacidad real al403 del fixture. F736/B9 y todos los originales conservan causa y alcance.

Matriz342/32PARTIAL/310sinreconciliar/0READY sin promociones;PAR046 conserva94 yPAR086 sus fuentes individuales.2007/source86 y2043/source88 publicados PASS55,8min/52min respectivamente;2109/source92 activo una vez93887 y2139/source97 waiter26311 conservanFIFO/pines yno acreditan99. CincoHIGH/W4 pendientes, IA comercial writesOFF,issue10OPEN,releaseNOT_ACCEPTED. Main,ramas principales/ajenas/congeladas,W3/W4/W5/recurso yproducción intactos;consumo principal requiere ACK exacto. Continuar otra unidad útil independiente tras checkpoint sin repetir verdes sin cambio.
"@'''
s=s[:a]+body+s[b:];(w/'close-w2x-customer-list-page-focus.ps1').write_text(s,encoding='utf-8-sig')
