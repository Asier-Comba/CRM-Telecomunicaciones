# Customer360: conservar la ubicación de teclado al paginar

CLAIM6298317033, orden19830c9c y coordinación6297630755. Rama propia existente `codex/oier-review175-20261020`; integración exclusiva de Asier.

**Problema:** al abrir la siguiente página de Servicios con Enter, el control queda deshabilitado durante la lectura y el foco termina en `BODY`. Sucede tanto al cargar correctamente como al recibir403. La ubicación de teclado se pierde y no hay anuncio de la nueva página.

**Antes:** seis fallos causales, éxito/denegación ×390/768/1440. En los seis casos se midió `document.activeElement.tagName === BODY` después de la respuesta. No fallo de fixture o datos; logs y capturas originales conservados. Fuente de tests6ca6f42cb58470d12699c4adf32e1b636cf7106f.

**Cambio mínimo d5922d843cac660f6bc954875a289267c5299f2b:** foco en indicador de página cargada o error, anuncio `aria-live=polite` y foco visible. Tras denegación se puede llegar con Tab al reintento; al regresar se anuncia la página anterior. Sólo restaura el foco si sigue en el control que inició la navegación o en BODY; no lo roba si el usuario ha elegido otro control. Reutiliza el patrón existente de notas de incidencia, sin primitivas nuevas.

**Después:**9/9 casos PASS, sin retries/skips/flaky: seis nuevos y tres regresiones existentes de cambio de cliente, cursor/filtro y respuesta tardía. Comprobado también el reintento403 y no robar foco al filtro durante otra lectura. Ningún comando emitido en estos casos. El403 se muestra como error, no como lista vacía. Lint global/build/TypeScript: estado final en [paging22/acceptance.safe.json](paging22/acceptance.safe.json).

**Alcance:** componente/repository/DTO reales con HTTP controlado; no prueba de Auth, RLS, Supabase persistente, lector de pantalla físico o Netlify. Foco DOM y atributo de anuncio verificados. Capturas revisadas [390](paging22/ready-390.png), [768](paging22/ready-768.png), [1440](paging22/ready-1440.png): página2, servicio21 y ubicación de foco en tarjetas/tabla; no aceptación completa de Customer360.

**Integración:** seleccionar únicamente tests6ca6f42c y fixd5922d84. Ambos se aplican a175/b9e con `git apply --cached --check` en índice temporal propio, sin modificar rama/workspace/índice del integrador. Función de lectura y efecto que gestiona respuestas idénticos byte a byte; sin cambios de API, cursores, SQL, permisos, dinero o contratos. No dependen del parser21 ni del caller20, ni requieren importar toda esta rama. Aplicación textual limpia no equivale a ACK, integración o despliegue.

**Dependencias:** nueva comprobación legítima `Supabase.list_projects` sigue devolviendo lista vacía para este Work. No SQL ni cambio de permisos; no evidencia de caída del proyecto. W5 presupuesto6296238416 y ventana/contexto propios siguen pendientes. CORE162 mantiene2mutaciones; la cadena telecom requiere alcance y precio/versiones acordados.

El timeout de emisión175 conserva causa/efecto UNKNOWN; no repetido ni corregido por esta unidad. Facturación21/caller20 esperan selección de Asier. CincoHIGH, Storage/W4 y releaseNOT_ACCEPTED permanecen visibles; IA writesOFF.

Próximas tres unidades condicionadas: verificar selección exacta y composición Asier; ejecutar CORE162 sólo con acceso/ventana/fixtures aprobados; aceptar contrato→servicio→línea sólo con alcance/condiciones y limpieza acordados. No repetir bancos verdes o fabricar actividad mientras faltan esas entregas.
