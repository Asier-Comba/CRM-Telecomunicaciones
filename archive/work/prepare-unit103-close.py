from pathlib import Path
w=Path('work');r=w/'crm-w2x-document-upload-uncertain';p='w2x-domain-customer-label-wrap'
doc='''# W2-X103: nombre de cliente en Servicios globales

Un nombre válido de 160 caracteres sin espacios ampliaba la tabla a 2229,953125 px dentro de un contenedor de 1198 px y ocultaba el operador. Reproducción sobre producto b84295e96a4396d0e3691407bac11eace28c53fe: 3 FAIL y 3 PASS en 38,5 s, a 1280, 1440 y 1920 px. Cliente ordinario: tabla1198/celda141,859375. Se conservan banco, salida original, geometrías y capturas.

NamedCustomer añade únicamente overflow-wrap:anywhere a su enlace existente. Conserva texto completo, ruta, permisos, repositorio y fallback. El fixture existente admite global=1 para omitir el cliente seleccionado, sin alterar el modo anterior ni servidores/parsers. La denegación HTTP403 de la etiqueta mantiene la fila autorizada y muestra Cliente no disponible; no expone nombre ni cuerpo privado.

Controles propios: 90 PASS en 1,7 min (8 archivos), compilación66, lint0 errores/3 avisos previos. Nueve nuevos casos long/ordinary/denied por tres anchos, 21 anteriores de Servicios y60 contextuales de Incidencias/SIM/Contratos. Banco final idéntico al causal. Nueve capturas originales vistas mediante tres montajes, con hashes en checkpoint. Tabla1198, celda larga252,859375 y operador visible. Sin comandos, errores de página ni operaciones inesperadas en los nueve primarios.

Componentes, repositorio y parsers reales con HTTP controlado sintético. No acredita AuthDB/JWT/RLS/membresía real, navegación Next integrada, todos los dominios/filas/roles, accesibilidad completa ni modelo vivo. Sin consumo de API. No acredita reinicio, ausencia, quiescencia, handler o full23. Los81 del padre y la futura2172 de b842 conservan solo su fuente: esta corrección y banco no están en ella.

Matriz342/33PARTIAL/309sin reconciliar/0READY sin cambios. Cinco HIGH y revisión W4 pendientes; escrituras comerciales IA OFF; issue10 OPEN; release NOT_ACCEPTED. F736 y B9 conservan su causa completa desconocida y evidencia original. No se modifican ramas ajenas, principal, W3/W4/W5 ni producción.
'''
(r/'docs/master/W2X_DOMAIN_CUSTOMER_LABEL_WRAP_20261019.md').write_text(doc,encoding='utf-8')
s=(w/'preflight-unit102.py').read_text(encoding='utf-8').replace('customer-domain-table-title-wrap','domain-customer-label-wrap').replace('81 passed','90 passed').replace('81 tests in 7 files','90 tests in 8 files').replace('W2X_CUSTOMER_DOMAIN_TABLE_TITLE_WRAP','W2X_DOMAIN_CUSTOMER_LABEL_WRAP').replace("'docs/master/", "'tests/e2e-preview/fixtures/customer-domain-entry.tsx','docs/master/",1).replace('customer-service-table-title-*.png','domain-customer-label-*.png').replace('len(frames)==6','len(frames)==9').replace('len(obs)==6','len(obs)==9').replace('TITLE_AND_OPERATOR_IN_VIEW_PASS','CUSTOMER_LABEL_AND_OPERATOR_VISIBLE_SAFE_FALLBACK').replace('OWN81_BUILD66_VISUAL6','OWN90_BUILD66_VISUAL9').replace('controls_session=71101','controls_session=84090').replace('81_PASS_OWN_SOURCE','90_PASS_OWN_SOURCE').replace('6currentservice-tableframes long/ordinary128014401920','9currentglobalserviceframes long/ordinary/denied128014401920')
a=s.index("change=read(");b=s.index("assert not git('diff'",a)
s=s[:a]+'''change=read(w/(p+'-source-reversal.json'));text=(r/paths[0]).read_text(encoding='utf-8');before=(w/(p+'-product-before.tsx')).read_text(encoding='utf-8')
assert text.replace(change['after'],change['before'])==before and git('show','HEAD:'+paths[0])==before.strip()
assert (r/paths[1]).read_bytes()==(w/(p+'-final-bank.ts')).read_bytes()==(w/(p+'-causal-bank.ts')).read_bytes()
f=(w/(p+'-fixture-before.tsx')).read_text(encoding='utf-8');actual=(r/paths[2]).read_text(encoding='utf-8')
assert actual==f.replace('function Fixture(){','function Fixture(){\\n const globalScope=new URLSearchParams(location.search).get(\\'global\\')===\\'1\\'').replace('customerId={customerId}','customerId={globalScope?undefined:customerId}')
'''+s[b:]
(w/'preflight-unit103.py').write_text(s,encoding='utf-8')
s=(w/'close-w2x-customer-domain-table-title-wrap.ps1').read_text(encoding='utf-8-sig').replace('customer-domain-table-title-wrap','domain-customer-label-wrap').replace('session=71101','session=84090').replace('preflight-unit102.py','preflight-unit103.py').replace('fix(customers): wrap record labels to preserve service table context','fix(customers): wrap global customer labels without losing service context')
a=s.index('$body=@"');b=s.index('\nforeach($n in',a)
s=s[:a]+'''$body=@"
HANDOFF W2-X103 — nombre completo de cliente y operador visibles en Servicios globales.

Fuente $sha; árbol $tree; rama $($cp.branch); padre $($cp.base); CLAIM6256563598. Propios $($cp.browser_summary), compilación66, lint0errores/3avisos conservados, scan, cola y copia Git verificada. 9 nuevos casos globales,21 previos de Servicios y60 contextuales de Incidencias/SIM/Contratos. No resultados heredados.

Causal3FAIL3PASS38,5s sobre producto padre: nombre válido160 sin espacios amplía tabla2229,953125 dentro de1198 ycelda cliente1285,953125, desplazando operador a1280/1440/1920. Ordinarios pasan. Una clase overflow-wrap:anywhere en NamedCustomer existente conserva texto completo,href,permisos,repositorio yfallback. Fixture existente con opción global=1, sin otro servidor ni cambio del modo anterior.

Nueve cuadros realmente vistos long/ordinary/denied×tres anchos, hashes ygeometrías conservados. Tabla1198/celda larga252,859375/operador visible. HTTP403 de customer.list muestra Cliente no disponible y conserva fila de servicio autorizada, sin cuerpo privado ni nombre. Banco final idéntico al causal; primarios sin comandos/errores/operaciones inesperadas.

Componentes/repository/parsers reales con HTTP sintético. AuthDB/JWT/RLS/membresía real/navegaciónNext integrada/modelo vivo NOT_RUN/API0. No todos los dominios/filas/roles ni a11y completa, ausencia/quiescencia/reinicio/handler/full23. F736/B9 conservados. Los81 y2172 de source102 b842 no contienen esta corrección/banco, aunque sus controles pasen; el defecto queda anotado en su checkpoint. No retroactividad.

Matriz342/33PARTIAL/309sinreconciliar/0READY sin promociones. FIFO2109source92/2139source97/2172source102 conservado sin duplicar ni cancelar controles. CincoHIGH/W4 pendientes,IA comercial writesOFF,issue10OPEN,releaseNOT_ACCEPTED. Ramas principales/ajenas/congeladas,W3/W4/W5/recurso yproducción intactos. Consumo principal requiere ACK exacto. Continuar unidad comercial independiente tras checkpoint.
"@'''+s[b:]
(w/'close-w2x-domain-customer-label-wrap.ps1').write_text(s,encoding='utf-8-sig')
