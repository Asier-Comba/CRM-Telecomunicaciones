from pathlib import Path
import json
w=Path('work');r=w/'crm-w2x-document-upload-uncertain';p='w2x-collection-page-error-back'
(r/'docs/master/W2X_COLLECTION_PAGE_ERROR_BACK_20261019.md').write_text('''# W2-X108: volver a página anterior después de un error

Sobre productoe8b45e225760b372d4e2600e06abd0284befcd19 (metadata107 con src/tests idénticos a106), fallar la siguiente página dejaba deshabilitado el retorno anterior en Servicios yComunicaciones vinculadas. Causal390px:2FAIL4PASS46,2s. Dos fallos son los dos recorridos tras403 de página2;cuatro controles positivos mantienen botón bloqueado ante primererror sin cursor opágina siguiente pendiente. Logs/banco/fotos/observaciones originales conservados. Otros anchos solo se verifican en banco final.

Dos condiciones nativas de disabled existentes ahora distinguen error de carga. Se permite volver si existe cursor anterior yla lectura falló;durante carga ysin cursor sigue bloqueado. Se reutilizan manejadores/cursor/repositorios/refs de foco/cancelaciones. Volver dispara lectura normal nueva sin after_id al recuperar página1;no reproduce caché,omite permisos,modifica contratos oenvía comandos. No nueva primitiva/hook/servicio ni navegación automática.

45casos propios/5archivos:18nuevos (dos recorridos×tresestados×3907681440) y27contextuales de paginación/cambio de colección/Comunicaciones/cambio de cliente en detalle/contexto/resumen. Banco final idéntico al causal. Los nuevos verifican primererrorbloqueado,pendientebloqueado,403siguiente→Anterior conEnter→nueva primera página,botón vuelve a bloquear mientras espera,resultadoconfoco ycursor/paginación normales. Consultas exactaslimit20/cursor ycustomer_id/sort solo paraServicios. Sin comandos,errores de página,operaciones inesperadas ocuerpo privado. Compilación66,lint0errores/3avisos previos,scan/cola y18capturas originales vistas con hashes encheckpoint.

Fotos de retorno muestran el resultado después de recuperar página1,normalmente cerca del pie por foco;no las20filas completas. Carga/botón bloqueado intermedio se compruebaDOM,no una captura porfase. Primererror no acredita orientación de foco inicial. No todas las páginas/roles/concurrencia/a11y/táctil. HTTP sintético con componentes/repositorios/parsers reales;AuthDB/JWT/RLS/membresía física/Nextintegrado/modelo vivoNOT_RUN/API0. No ausencia/quiescencia/reinicio/handler/full23. No se heredan21/111/2109 de fuentes previas.

Matriz342/34PARTIAL/308sinreconciliar/0READY intacta. PAR056 sigue parcial sobre106,no adopta108porherencia. HIGH5/W4pendientes,IA writesOFF,issue10OPEN,releaseNOT_ACCEPTED. F736/B9 yoriginales conservan causa completa desconocida. FIFO2139source97/2172source102/2214source106 mantiene pines/sesiones;2214noincluye nuevo banco18 ni108. Principales/ajenas/congeladas,W3/W4/W5/recurso yproducción intactos.
''',encoding='utf-8')
s=(w/'preflight-unit106.py').read_text(encoding='utf-8').replace('communications-page-focus','collection-page-error-back').replace('21 passed','45 passed').replace('21 tests in 2 files','45 tests in 5 files').replace('W2X_COMMUNICATIONS_PAGE_FOCUS','W2X_COLLECTION_PAGE_ERROR_BACK').replace("paths=['src/features/customers/CustomerCommunications.tsx'","paths=['src/features/customers/CustomerDomainPages.tsx','src/features/customers/CustomerCommunications.tsx'").replace("'tests/e2e-preview/fixtures/customer-resource-entry.tsx',",'').replace('communications-page-focus-*.png','collection-error-back-*.png').replace('len(frames)==12','len(frames)==18').replace('len(obs)==12','len(obs)==18').replace("x['interaction']=='LINKED_CONVERSATION_PAGINATION_FOCUS_AND_CHOSEN_CONTROL'","x['phase']=='PREVIOUS_ERROR_RECOVERY_AND_PENDING_GUARDS_PASS'").replace('OWN21_BUILD66_VISUAL12','OWN45_BUILD66_VISUAL18').replace('controls_session=26832','controls_session=38232').replace('21_PASS_OWN_SOURCE','45_PASS_OWN_SOURCE')
a=s.index('change=read(');b=s.index("assert not git('diff'",a)
s=s[:a]+'''changes=read(w/(p+'-source-reversal.json'));assert len(changes)==2
for c in changes:
 before=Path(c['snapshot']).read_text(encoding='utf-8');text=(r/c['path']).read_text(encoding='utf-8');assert text.replace(c['after'],c['before'])==before and git('show','HEAD:'+c['path'])==before.strip()
assert (r/paths[2]).read_bytes()==(w/(p+'-final-bank.ts')).read_bytes()==(w/(p+'-causal-bank.ts')).read_bytes()
'''+s[b:]
s=s.replace('12linkedcommunications paginationframes success/denied/chosen/empty3907681440;one syntheticterminalpage/record21;notallconversations/roles/Nextnavigation/a11yacceptance','18currentframes services+communicationsbackafter403/initialerror/pending3907681440;returnedpage1atfooter/nottwentyrowsvisual;pendingdisabledDOMonly;notallpages/roles/Nextnavigation/a11yacceptance')
(w/'preflight-unit108.py').write_text(s,encoding='utf-8')
s=(w/'close-w2x-communications-page-focus.ps1').read_text(encoding='utf-8-sig').replace('communications-page-focus','collection-page-error-back').replace('session=26832','session=38232').replace('preflight-unit106.py','preflight-unit108.py').replace('fix(customers): preserve pagination focus for linked conversations','fix(customers): allow safe previous page recovery after read errors')
a=s.index('$body=@"');b=s.index('\nforeach($n in',a)
s=s[:a]+'''$body=@"
HANDOFF W2-X108 — retorno a página anterior tras error en Servicios yComunicaciones.

Fuente $sha; árbol $tree; rama $($cp.branch); padre $($cp.base); CLAIM6256891004. Propios $($cp.browser_summary),compilación66,lint0errores/3avisos previos,scan,cola ycopia Git verificada.18nuevos (dos recorridos×error siguiente/primererror/pendiente×3907681440) y27contextuales recién ejecutados. No resultados heredados.

Causal390sobre107consrcidéntico106:2FAIL4PASS46,2s.403de página2 dejaba Anterior deshabilitado en ambos recorridos;primererror sin cursor ypendiente ya bloqueaban correctamente. Dos condiciones disabled ahora distinguenerror de carga. Se conserva bloqueo mientrascarga/sincursor,yse permite retorno con cursor existente trasfallo. Reutiliza manejadores,refs/cursor/cancelación/repositorios,ninguna nueva primitiva/hook/servicio/contrato.

Anterior conEnter dispara lectura normal nueva sin after_id para página1,no caché/bypass/commands;mantiene consultaslimit20/customer_id/sort cuandoaplican ypermisos existentes. Banco final idéntico al causal. Resultadoconfoco,botones vuelvenabloquear durante espera,cursor yterminales normales. Primarios sin comandos/errores de página/operaciones inesperadas/cuerpo privado.

18capturas actuales realmente vistas con hashes. Retorno fotografiado después de recuperar página1,cerca del pie porfoco,no20filas visuales. Estado pendiente intermedio/botón bloqueadoDOM,no unafoto porfase. Primererror no acredita foco inicial. Otrosanchos solo verificados finalmente,no causalprevia allí. No todas laspáginas/roles/a11y/táctil.

Componentes/repositorios/parsers reales con HTTP sintético. AuthDB/JWT/RLS/membresía física/Nextintegrado/modelo vivoNOT_RUN/API0;no ausencia/quiescencia/reinicio/handler/full23. F736/B9 yoriginales intactos. Matriz342/34PARTIAL/308sinreconciliar/0READY,PAR056con106nohereda108. FIFO2139source97/2172source102/2214source106wait16884 intacto;2214noincluye108ni18nuevos. HIGH5/W4 pendientes,IA writesOFF,issue10OPEN,releaseNOT_ACCEPTED. Ramas principales/ajenas/congeladas,W3/W4/W5/recurso yproducción intactos;consumo principal requiereACK exacto. Continuarunidad comercial útil conCLAIM ycheckpoint.
"@'''+s[b:];(w/'close-w2x-collection-page-error-back.ps1').write_text(s,encoding='utf-8-sig')
