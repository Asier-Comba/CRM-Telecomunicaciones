# W2 — Cierre estable del activo referenciado

Tres negativos Chromium390/768/1440 sobre9EE (UI blob388e1309 también exacto
RootDA2): cerrar el panel y provocar un render del padre con objeto nuevo pero
mismo tipo/ID volvía a consultar y reabría la selección. No comandos. No prueba
la causa completa de Sup16B106/1 ni de E13 startup768, que se conservan.

El efecto depende ahora de repository/tipo/ID, no identidad del objeto prop.
Mismo contexto/ref conserva cierre y hace una consulta; nueva referencia sigue
abriéndose y mostrando su DTO. El fencing/epoch existente al cerrar, al cambiar
selección y al desmontar se conserva; permisos, servicios y controles intactos.
No se cambia AuthGate, W4/W5 kernel, timeouts ni mecanismo de Drawer.

Tres positivos del cierre/ref nueva y tres regresiones previas de selección
tardía PASS con tipos/lint; capturas sintéticas de tres anchuras revisadas.
Modelo/Auth real no acreditados por ese fixture. El test nuevo añade6 ejecuciones
en los dos proyectos CI: preview340 propio requerido. El helper real existente
mantiene todos sus assertions y divide el marcador después del DTO actual en
dialog_visible/close_panel/card_visible_after_close: current_render antes también
cubría estas operaciones y no identificaba cuál fallaba.

Fuente incluye la lectura Case y plazo total20s anteriores:737 pruebas assistant
locales sin rerun por cambio UI; requiere nuevos propios1280 (543+737)/340/
native85_320+dos audit13/probe conexión/Supabase107. Case Auth/DB real y ledger
33/19/14 de esta rama NOT_RUN hasta nueva fuente.35/216/220 y38/22/16 requeridos
al componer SIM. Driver solo connectWorker; full23/recurso/reinicio W5/W4/cincoHIGH
pendientes. IA writes OFF; modelo vivo NOT_RUN; release NOT_ACCEPTED.
