from pathlib import Path
w=Path('work');s=(w/'close-w2x-customer-list-refresh-focus.ps1').read_text(encoding='utf-8-sig').replace('customer-list-refresh-focus','customer-domain-table-title-wrap').replace('session=1405','session=71101').replace('preflight-unit101.py','preflight-unit102.py').replace("'fix(customers): restore explicit refresh and retry outcome focus'","'fix(customers): wrap record labels to preserve service table context'")
a=s.index('$body=@"');b=s.index('\nforeach($n in',a)
body='''$body=@"
HANDOFF W2-X102 — Servicios del cliente: nombre completo y operador visibles en la tabla.

Fuente $sha; árbol $tree; rama $($cp.branch); padre $($cp.base); CLAIM6256461650. Propios $($cp.browser_summary):21 casos pertinentes de Servicios y60 contextuales de Incidencias/SIM/Contratos. Compilación66, analizador con tres avisos previos conservados, scan, diferencias, cola y copia Git verificada. Los93 del padre mantienen solo su propio SHA, sin heredarlos.

Causal3FAIL3PASS43,9s: título válido160 hace tabla2071,296875 dentro de1198,primera celda1287,296875 yoperador fuera del recorte en1280/1440/1920. Los tres ordinarios pasan,tabla1198/celda201,046875. El documento no crecía;se miden contenedor,tabla,celda,enlace yoperador. Logs, geometrías, capturas, banco ycausas conservados.

Una sola clase de la primera celda existente añade envoltura. Mismos mínimo de ancho,texto completo,href,tipografía,columnas,controles,datos,consultas yestados;sin otra primitiva/pantalla/servicio/contrato. En los seis casos finales,tabla1198 yoperador/nombre dentro del viewport;celda larga411,890625. El scroll sigue disponible para dominios con muchas columnas;no se afirma que todos deban caber.

Seis cuadros de tabla realmente vistos,con hashes,long/ordinario en1280/1440/1920. Solo un servicio sintético con siete campos cortos o no registrados,no todas las filas/importes/dominos/roles. Banco final idéntico al causal. Nueve casos de tarjeta/denegación,seis de foco/paginación/cambio de colección y60contextuales se ejecutan de nuevo en esta fuente.

Componentes/repository/parsers reales con HTTP sintético. Primarios sin comandos,operaciones inesperadas oerrores de página. AuthDB/JWT/RLS/roles/membresía/multiempresa física/navegaciónNext integrada/modelo vivoNOT_RUN/API0;sin ausencia/quiescencia/reinicio/handler/full23 ni accesibilidad/táctil completos. F736/B9 y originales conservan causa yalcance.

Matriz342/33PARTIAL/309sinreconciliar/0READY sin promociones. Las imágenes94 mantienen su alcance de tabla anterior;no reinterpretarlas.2007/source86 y2043/source88 publicados PASS55,8min/52min;2109/source92 activo93887 y2139/source97wait26311 mantienenFIFO/pines yno acreditan102. CincoHIGH/W4 pendientes,IA comercial writesOFF,issue10OPEN,releaseNOT_ACCEPTED. Main,ramas principales/ajenas/congeladas,W3/W4/W5/recurso yproducción intactos;consumo principal requiere ACK exacto. Continuar otra unidad comercial útil independiente tras checkpoint, sin repetir verdes sin cambio.
"@'''
s=s[:a]+body+s[b:];(w/'close-w2x-customer-domain-table-title-wrap.ps1').write_text(s,encoding='utf-8-sig')
