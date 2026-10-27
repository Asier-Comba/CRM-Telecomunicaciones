# Unidad 64 — diagnóstico Auth y QA de membresía

27/10/2026. Implementación/diagnóstico propio; W4 independiente conserva la
revisión. `RELEASE_NOT_ACCEPTED`. No hay cambio de producto, API, RLS, ACL,
migraciones, dependencias, workflows, alojamiento, main o Arizan.

## 64A publicada: NOT_REPRODUCED / BLOCKER_CAUSE_UNKNOWN

PR Draft196, CLAIM67/6438782921, cierre67/6439585930. Fuente
`e0c6c301f94bf806bd10c26adcf8d62e1c1492fa`, árbol
`83f3c472d952f24a703449e6f8c55eb07910bed0`. Actions ejecutó
`7bc590105ac3330f5f65f6db48f8a60880a96cd9`, árbol idéntico verificado por Git
Data API. Base A294. La observación y doce pruebas estaban publicadas en ese
commit; esta unidad ejecutó una única aceptación real autorizada, sin cambios
en acciones, esperas, aserciones o los116 escenarios.

Auth40484968948/job122124366768: **116/116 PASS**,3815W1+227W2=4042backend,
87migraciones,CLI2.119.0,Auth/PostgREST/Storage/tenant/revocación/teardown PASS.
1440/768/390 completaron fill/submit/ready: cada ancho observó una búsqueda,
una respuesta2xx, cero pendientes/fallos, mismo documento y sin truncamiento.
Layout completo120758ms; no es duración del subpaso. El observador procesa
JSON transitoriamente pero publica sólo contadores/categorías. HTTP2xx no
prueba DTO válido ni lecturas hermanas completas: parcial/denegación específica
del cuerpo quedan NOT_OBSERVED en esta proyección.

Artefactos descargados y huellas verificadas:

| ID | Contenido | SHA256 |
|---|---|---|
|12726476078|safe Auth|a72aae00840e19483d168f89435604384a8204a7c0054c45d1e1522e823476bf|
|12726061655|capturas sintéticas|3e38e6864904184462321e1b8504daed4b36ad976154745d77898f764890974a|

Se inspeccionaron seis capturas de Cartera, superior/inferior en tres anchos.
El desplazamiento interno limita cada captura a su ventana. No prueban todos
los elementos intermedios. La matriz CSV de116 casos y el checkpoint seguro
se conservan en outputs/Integration-2026-10-27/unit64 fuera del código.

El original A294,run40410711152/job121880872621, **sigue115/116 FAIL** en
desktop_tablet_mobile_layouts/layout:portfolio:390:bounded_search, causa
UNKNOWN. Sus124439ms son del grupo. El nuevo PASS no acepta A294, no demuestra
que el observador arregle nada y no justifica integrar195. El control aislado
anterior9PASS no reproduce Auth/AppShell ni estado acumulado. No se descartan
datos, permisos, red, fixture, sincronización o geometría por falta de prueba.

Handoff Oier/W2: siguiente experimento focal sobre el documento/fixture real
acumulado. Si fill/submit: observar count/connected/editable/enabled y geometría/
intersección/estabilidad del control, sin texto ni nuevas esperas. Si ready:
correlacionar401/403/otros4xx/5xx/requestfailed, cabeceras/cuerpo/parser y medir
portfolio.get aparte. Sin otro banco completo idéntico ni arreglo especulativo.

CI40484968909: calidad PASS672bootstrap/827assistant/lint/tipos/build/audit0;
unión1010PASS/job122128452654. Native122124367412 FAIL antes del checkout por
ECR Data limit exceeded; no fue fallo de migración ni se relanzó. Dependency
Review y Critical Playwright SKIPPED. Plataforma40484968933:5jobsPASS,
incluido recovery122124366974; vendor FAIL(n8n94HIGH13CRITICAL/Postgres25HIGH
1CRITICAL). All-ref40484968910/job122124366245:28coincidencias/454refs/
1672commits/0excepciones,raw no publicado. Repo PUBLIC: decisión del propietario
y clasificación privada pendientes. Sin aceptación alojada o de release.

W4 verificó run/árbol/huellas y la interpretación NOT_REPRODUCED, sin datos
privados en las muestras nuevas. Su revisión no abarca toda la privacidad de
artefactos/capturas y no concede W4_ACCEPTED ni integración/release.

## 64B — QA propia de revocación durante el guardado

CLAIM67/6439601790, base A294, rama separada. W4/W5 no mantienen CLAIM ni
encuentran cobertura publicada de esta secuencia exacta. Sólo tools/asier_compat62,
tests/unit62 y esta documentación; no se incorpora196 ni se modifica195/191.

Tras la preparación fiscal y revisión visible, una barrera retiene exactamente
la primera petición invoice.create_draft de ese cliente/oportunidad/command_id.
Lee su propia sesión SSR en memoria, suspende únicamente la membresía sintética
activa y continúa la petición intacta al servidor real. Nunca sustituye una
respuesta. Exige403/envelope access_denied,JWT exacto validado por getUser y
no caducado, fila suspended y cero efectos globales en facturas/líneas, también
si se insertara en B por error. El cliente de prueba existe y no tiene factura.
Tokens, cookies, cuerpos e IDs no se incluyen en el informe ni en trazas.

Finally aborta/libera la petición pendiente, retira la barrera y restaura sólo
esa membresía. Después otra acción explícita de guardar continúa el recorrido
original y exige una factura/una línea, nuevo command_id y readback/recarga.
Esto no acredita deduplicación ni revocación dentro de una transacción ya
autorizada. Oráculo negativo local separado de la aceptación real:500/401,
envelope ajeno,JWT inválido,fixture ausente,counters inválidos,otra petición o
inserciones nunca cuentan como PASS.

Fuente/árbol final y run/job de64B se publican en la PR/Issue67 tras el push.
Resultados reales de64B: NOT_RUN en este checkpoint de preparación. Se reutiliza
workflow62 intacto. El perfil87→overlay88 es sólo desechable y mantiene sus
contratos documentales negativos; documentos/IA/proveedores OFF en el recorrido.

NEXT3: ejecutar banco real de64B en su SHA exacto; revisión independiente del
resultado y diff; handoff al propietario si descubre defecto, sin autoaprobar.
