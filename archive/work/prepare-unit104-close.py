from pathlib import Path
w=Path('work');r=w/'crm-w2x-document-upload-uncertain';p='w2x-domain-operator-label-wrap'
(r/'docs/master/W2X_DOMAIN_OPERATOR_LABEL_WRAP_20261019.md').write_text('''# W2-X104: nombre de operador en Servicios globales

Sobre producto002c2565894e26eafa6349e29aac391c1e607873, un operador válido160 sin espacios genera tabla2235,296875 dentro de1198 ycelda1291,296875:3FAIL a1280/1440/1920. Nombres ordinarios ylectura de operador denegada:6PASS, misma fuente,1,0min. Se conserva evidencia original.

NamedOperator envuelve su texto existente en span nativo con overflow-wrap:anywhere; no cambia efectos, consultas, caché, contexto, permisos, fallback ni props. Reutiliza fixture de Servicios globales existente, sin otro servidor. HTTP403 de operator.get mantiene servicio ycliente autorizados ytexto Operador no disponible, sin cuerpo privado. Banco final idéntico al causal.

Controles de esta fuente:99casos/9archivos, nueve nuevos de operador y90contextuales recién ejecutados. Compilación66, lint0errores/tres avisos previos, scan ycola. Nueve capturas primarias long/ordinary/denied en1280/1440/1920 revisadas con hashes en checkpoint; nombre completo, cliente yoperador dentro del contenedor. Alcance de una fila sintética, no todas las entidades/roles/filas/importes.

Componentes/repository/parsers reales con HTTP controlado sintético; primarios sin comandos,errores de página ni operaciones inesperadas. AuthDB/JWT/RLS/membresía física,navegación Next integrada,modelo vivo NOT_RUN/API0. No ausencia/quiescencia/reinicio/handler/full23 ni aceptación a11y completa. Los90 del padre no se heredan.2109source92PASS43,9min;2139source97 y2172source102 mantienen sus propios pines, sin acreditar104.

Matriz342/33PARTIAL/309sin reconciliar/0READY intacta. CincoHIGH/W4 pendientes,IA comercial writesOFF,issue10OPEN,releaseNOT_ACCEPTED. F736/B9 conservan causa completa desconocida. Coordinación:guard lector de comentarios detuvo antes del CLAIM por anidado de arrays;corregido sin modificar producto ni publicar entonces. Intento auxiliar de regex de lectura del cuerpo falló antes de PATCH; cuerpo exacto verificado posteriormente. Sin nuevos CLAIM ni repeticiones de pruebas por esos auxiliares.
''',encoding='utf-8')
s=(w/'preflight-unit103.py').read_text(encoding='utf-8').replace('domain-customer-label-wrap','domain-operator-label-wrap').replace('90 passed','99 passed').replace('90 tests in 8 files','99 tests in 9 files').replace('W2X_DOMAIN_CUSTOMER_LABEL_WRAP','W2X_DOMAIN_OPERATOR_LABEL_WRAP').replace("'tests/e2e-preview/fixtures/customer-domain-entry.tsx',",'').replace('domain-customer-label-*.png','domain-operator-label-*.png').replace('CUSTOMER_LABEL_AND_OPERATOR_VISIBLE_SAFE_FALLBACK','OPERATOR_LABEL_AND_SERVICE_VISIBLE_SAFE_FALLBACK').replace('OWN90_BUILD66_VISUAL9','OWN99_BUILD66_VISUAL9').replace('controls_session=84090','controls_session=56302').replace('90_PASS_OWN_SOURCE','99_PASS_OWN_SOURCE')
a=s.index("f=(w/(p+'-fixture-before.tsx'))");b=s.index("assert not git('diff'",a);s=s[:a]+s[b:]
(w/'preflight-unit104.py').write_text(s,encoding='utf-8')
s=(w/'close-w2x-domain-customer-label-wrap.ps1').read_text(encoding='utf-8-sig').replace('domain-customer-label-wrap','domain-operator-label-wrap').replace('session=84090','session=56302').replace('preflight-unit103.py','preflight-unit104.py').replace('fix(customers): wrap global customer labels without losing service context','fix(customers): wrap operator labels while preserving service context')
a=s.index('$body=@"');b=s.index('\nforeach($n in',a)
s=s[:a]+'''$body=@"
HANDOFF W2-X104 — operador completo en Servicios globales sin desplazar el resto de la fila.

Fuente $sha; árbol $tree; rama $($cp.branch); padre $($cp.base); CLAIM6256685133. Propios $($cp.browser_summary), compilación66, lint0errores/3avisos previos, scan, cola y copia Git verificada. Nueve casos nuevos de operador,nueve anteriores de cliente global,21 previos de Servicios y60contextuales de Incidencias/SIM/Contratos recién ejecutados. Sin heredar90 del padre ni PASSglobal.

Causal3FAIL6PASS1,0min sobre producto padre: operador válido160 sin espacios hace tabla2235,296875 dentro de1198 ycelda1291,296875 a1280/1440/1920. Ordinarios ydenegados pasan. NamedOperator incorpora solo span nativo con envoltura alrededor del texto existente; efectos,consultas,contexto,permisos,fallback yprops idénticos. Sin otra primitiva/pantalla/servidor.

Nueve capturas actuales realmente vistas long/ordinary/denied×tres anchos, hashes ygeometrías en checkpoint. Nombre completo,cliente yoperador visibles.403operator.get conserva fila autorizada yOperador no disponible,sin nombre privado/cuerpo de error. Banco final idéntico al causal. Primarios sin comandos/errores/operaciones inesperadas.

Componentes/repositorio/parsers con HTTP sintético. AuthDB/JWT/RLS/membresía física/navegaciónNext integrada/modelo vivo NOT_RUN/API0;no todas las entidades/filas/roles,a11y completa,ausencia/quiescencia/reinicio/handler/full23. F736/B9 yfallos anteriores intactos. Guard auxiliar lector de coordinación falló antes de CLAIM por arrays anidados;corregido,comentarios guardados. Auxiliar regex de cuerpo falló antes de PATCH,cuerpo exacto verificado;sin duplicar CLAIM/pruebas por ello.

2109source92PASS43,9min publicado;2139source97ejecución única26311;2172source102wait76705,FIFO intacto. No acreditan104. Matriz342/33PARTIAL/309sinreconciliar/0READY;HIGH5/W4 pendientes;IA writesOFF;issue10OPEN;releaseNOT_ACCEPTED. Ramas ajenas/principales/congeladas,W3/W4/W5/recurso yproducción intactos. Handoff para consumo principal con ACK exacto. Continuar siguiente defecto comercial reproducido ycheckpoint íntegro.
"@'''+s[b:]
(w/'close-w2x-domain-operator-label-wrap.ps1').write_text(s,encoding='utf-8-sig')
