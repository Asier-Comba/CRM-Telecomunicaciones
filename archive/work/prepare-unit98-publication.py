from pathlib import Path
w=Path('work');s=(w/'close-w2x-customer-services-review.ps1').read_text(encoding='utf-8-sig').replace('customer-services-review','agenda-presentation-review').replace("'docs(product): reconcile Customer360 services evidence individually'","'docs(product): append source-specific Agenda presentation evidence'")
a=s.index('$body=@"');b=s.index('\nforeach($n in',a)
body='''$body=@"
HANDOFF W2-X98 — PAR-086 Agenda: evidencia de presentación añadida con su fuente exacta.

Fuente de metadata $sha; árbol $tree; rama $($cp.branch); padre8d1f8e6bb73056f8f0dafde1479f63591e165a4b; CLAIM6256186931. Runtime/build/AuthDB/modelo en este SHA:NOT_RUN. La evidencia nueva mantiene fuente93/93bf52435b1b8e10070880bd2c2109a8d282f170 y árbol eb9f287189f5e494876d714fcd319a39e6df3800, con72 propios1,8min/build66/lint0errores3avisos/scan/publicación de93. Ningún resultado se hereda a metadata98.

Solo dos entradas SOURCE/VISUAL añadidas a PAR086. Fuente primaria282f2e1, sus dos evidencias, etapas, permisos y pendientes idénticos. Las31 otras revisiones,341otras filas,metadata global/src/tests no cambian. Matriz342/32PARTIAL/310sinreconciliar/0READY igual, sin promoción de BROWSER/BACKEND/SECURITY/release. Guardias, cola, diff, scan y copia Git verificada.

De72 en93, nueve pertinentes: seis títulos largo/ordinario y tres foco/filtros de Agenda a390/768/1440. Los63 restantes son contexto. Estos nueve montan Calendar directo con entradas sintéticas yHTTP de assets: no atraviesan repository/parsers ni acreditan calendario integrado. Título completo,próximas citas por geometría,detalle local y filtros/fecha/Hoy tienen ese alcance limitado.

Seis cuadros iniciales de Agenda realmente vistos en93 yhashes de bytes revalidados en el documento nuevo. Seis fotos de detalle son contexto; próximas citas390/1440 queda parcialmente debajo del cuadro. El documento98 indexa originales93, no es runtime de93 ni fotos de98. Sin aceptación de todos los estados/campos/columnas/roles/accesibilidad/táctil.

Originales93 conservados por intento y causa:2rutas de fixture,2selectores ambiguos,1fallo real de geometría+1nombre de cierre erróneo en test;control ordinario corregido1PASS12s sobre padre intacto. También guard de observaciones de preflight,corregido sin repetir suite. No reempaquetar como1FAIL1PASS. F736/B9 yresto de originales conservan su causa y alcance.

AuthDB/JWT/RLS/roles/membresía/multiempresa física/modelo vivoNOT_RUN/API0, sin ausencia/quiescencia/reinicio/handler/full23. CincoHIGH/W4 pendientes,IA comercial writesOFF,issue10OPEN,releaseNOT_ACCEPTED.2043/source88 activo53189,2109/source92 waiter93887 y2139/source97 waiter26311 conservan FIFO,pines ycontroles propios. Main,ramas principales/ajenas/congeladas,W3/W4/W5/recurso yproducción intactos. Continuar otra unidad comercial útil independiente tras checkpoint, sin repetir verdes de fuentes sin cambios.
"@'''
s=s[:a]+body+s[b:];(w/'close-w2x-agenda-presentation-review.ps1').write_text(s,encoding='utf-8-sig')
