from pathlib import Path
w=Path('work');s=(w/'close-w2x-calendar-event-title-wrap.ps1').read_text(encoding='utf-8-sig');s=s.replace('calendar-event-title-wrap','customer-domain-title-wrap').replace('session=51709','session=38603').replace('preflight-unit93.py','preflight-unit94.py').replace("'fix(calendar): wrap complete event titles inside agenda cards'","'fix(customers): wrap full service names inside collection cards'")
a=s.index('$body=@"');b=s.index('\nforeach($n in',a)
body='''$body=@"
HANDOFF W2-X94 — Cliente: nombre completo del servicio dentro de la tarjeta.

Fuente $sha; árbol $tree; rama $($cp.branch); padre $($cp.base); CLAIM6255882075. Propios $($cp.browser_summary): nueve casos primarios y66 regresiones de foco/paginación/retirada de colección, incidencias, SIM y contratos. Build66, lint con avisos preservados, scan, diff, cola y bundle verificado. No se heredan72 de93 ni resultados de otras fuentes.

Causal propio1FAIL1PASS21,8s. Nombre de servicio160 en390: h3 ancho308/contenido1684, tarjeta340/1700, enlace hasta1725,390625 fuera del borde365; documento390 pese al recorte. Ordinario:308/308 y enlace196,640625. Fuente intacta hasta medición; banco final idéntico al causal. Sin comandos, errores de página ni operaciones inesperadas en primarios.

Una sola clase de h3 existente: mínimo0, máximo100% y envoltura completa. Sin cambiar nombre, href, tabla, columnas, umbrales responsive, consultas, cursores, filtros, permisos, callbacks o servicios. Las tarjetas390/768 conservan nombre completo y enlace exacto;1440 mantiene tabla con desplazamiento horizontal intencional, sin afirmar que todas las columnas quepan.403no deja filas/nombre/cuerpo privado ni lecturas dependientes. No se afirma privacidad/AuthDB real por esa prueba.

Nueve capturas realmente vistas: largo/ordinario/denegado390/768/1440. Solo alcance identificado, no todos los dominios, roles, accesibilidad o táctil. Se reutiliza servidor CustomerDomain existente, componentes/repositorio/parsers reales con HTTP controlado. Contextuales ejercitan comandos/efectos sintéticos, no datos reales. AuthDB/JWT/RLS/SQL/Nextintegrado/modelo vivoNOT_RUN/API0; sin ausencia/quiescencia/reinicio/handler/full23. F736/B9 y demás fallos históricos mantienen causa y evidencia; no se les atribuye esta corrección.

2007/source86 PASS55,8min publicado;2043/source88 en curso una vez53189 y2109/source92 en cola93887 tras2043terminal/PUBLISHED/PASS. No acreditan fuente94. Matriz342/31PARTIAL/311sinreconciliar/0READY; cincoHIGH/W4 pendientes, IA comercial writesOFF, issue10OPEN, releaseNOT_ACCEPTED. Sin cambios a main, ramas principales/ajenas/congeladas, W3/W4/W5, recurso nativo o producción. Consumo principal pendiente de ACK exacto. Continuar siguiente unidad comercial útil después del checkpoint.
"@'''
s=s[:a]+body+s[b:];(w/'close-w2x-customer-domain-title-wrap.ps1').write_text(s,encoding='utf-8-sig')
