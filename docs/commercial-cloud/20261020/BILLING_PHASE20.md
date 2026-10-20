# Diagnóstico mínimo20 del primer efecto de facturación

CLAIM6296698021. Fuente de caller **3e7f43c043c7f95bd552a7155ffcd14835fb3f4e**, desde c7763a378b514d8740292288f8c1916aecd7fbc0 en rama Oier de revisión175. Producto/banco siguen idénticos a b9e; no escribir o integrar en rama Asier.

El fallo físico175 conserva causa y efecto UNKNOWN. El marcador original `invoice.issue:first_effect` agrupaba clic, espera de alerta, guard de efecto y cierre; la captura final no identifica la aserción que expiró. Este cambio **sólo asigna seis fases fijas** al report existente:

1. `first_effect` original permanece durante el clic.
2. `first_effect:alert` antes de esperar el mensaje original.
3. `first_effect:effect_guard` antes de comprobar status200 y un único envío.
4. `first_effect:close_disabled` antes de comprobar Cancelar/Cerrar deshabilitado.
5. `first_effect:close_click` durante el intento existente de cierre programático.
6. `first_effect:escape` durante Escape.
7. `first_effect:dialog_visible` antes de verificar que sigue abierto.

Un archivo,3 líneas añadidas/1 sustituida. Sin nueva lectura, SQL, espera, selector, assert, timeout, error, fixture, imagen, recurso o API; sin datos privados en fases. Aplica también a respuesta perdida, conservando prefijo y operación originales.

Guard local: al eliminar únicamente los seis marcadores se recupera **la fuente original normalizada byte a byte**, hashes en [billing-phase20-delta-proof.json](billing-phase20-delta-proof.json). Node syntax y ESLint dirigido PASS. No repetir build/84+6 verdes: no cambio de aplicación y esos bancos no ejecutan el caller físico. **Prueba Auth/DB de este nuevo caller NOT_RUN**; no heredar114/115, ni declarar arreglo o elegibilidad por esos controles sintéticos.

REQUEST Asier: revisar sólo commit3e7f43c0 e integrar cuando corresponda en su fuente; no reenviar componentes172/173, bancos ya adoptados o toda la rama de evidencia. La fuente que lo adopte requiere controles físicos propios y conservación del fallo original. Sin PR nueva, rerun/cancelación, reintento de efecto incierto, infraestructura, SQL o hosting por Oier.

Presupuesto privado W5 pendiente6296238416: sin compra/protección. CincoHIGH, seguridad y Storage abiertos, IA writesOFF, voz/modelo realesNOT_RUN, releaseNOT_ACCEPTED.
