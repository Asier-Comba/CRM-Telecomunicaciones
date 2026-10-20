# Unidad15 — confirmación de archivo incierto

Fuente ddf3ef26e6d50cc5bda7d3cb6515d2e8e456014d, árbol972ef4edfd204240598a1c7a414f015313c78ead. Cambio mínimo de un consumidor y dos bancos publicados por Oier en6b5d069eb24af2aaeaed7974f0778c30c33bdd53; ACK6289588784.

Procedencia verificada: parcheSHA25695bbe1c29ce9f955ea4e97af679305f3d3e0f1c57fc3f0a04a763c14b35905fa; parentblob50aca4d1de2af92f56491a9b97ec0ea0ba83b905 coincide con la composición; target3463aa030ab05b409ec6b73d7f60b8d7b58cf030 coincide tras aplicar. Bancos exactos8e5925268e9b9e72c395fab60a3ebe3a2b2e6879 yb6304d48fc6de28319e4361054f6a5abe774a30f. Sin edición de la rama ajena o incorporación de pipeline30noiniciado.

Ante pérdida de respuesta/JSONilegible/recibo ajeno, ConfirmDialog recibe cancelDisabled y mantiene Cancelar/X/Escape bloqueados; onCancel también protege la intención. Se explica el resultado incierto y se reintenta el mismo archivo. Primitiva y comando compartido intactos. Rechazo autorizado permite cancelar; éxito y recibo confirmado con lectura fallida conservan sus recorridos.

## Evidencia propia

- Antes sobre9cfc:18casos,9FAIL/9PASS390/768/1440. Fallan los tres resultados inciertos en tres tamaños; positivos conservados.
- Después sobre ddf3:36PASS de archivo y creación,1.8min;9PASS de regresión de consulta/catálogo,41.9s. Total45casos,0fallos/saltos/reintentos/inestables. Mismos45s/4s/retries0, componentes/repositorio/DTOs reales con HTTPcontrolado.
- Bootstrap completo:650PASS/6FAILde656; cinco fallos de permisosPOSIXWindows conocidos y el rechazo real del perfil85/86sobre87. Assistant827PASS,0fallos/saltos; sin modelo externo.
- Lintdirigido, tipos ybuild44 finales PASS. No se convierte el fallo de perfil nativo enPASS.

Bancos en tools/oier_commercial_qa/opportunity-archive* y oportunidad de unidad13. Configuración de integración work/crm-unit15.config.cjs; evidencia work/unit15-*.log y qa-unit15-{before,after,pipeline}/. Contador simulado no acredita idempotencia AuthDB. Otros movimientos/asignación/ganada/perdida no se promueven por analogía.

Esta fuente incluye código de13/14, pero sus339/52resultados mantienen fuente propia; no se suman como una batería completa sobre ddf3. La nueva composición requiere CI propia. Perfil87/W5manifest/W4/P0Storage/EdgeAccess y cohorte siguen bloqueantes para aceptación completa. Sin flags reales, cloud, main, secretos o resellpro; IA writesOFF/gasto0, AuthDBhospedadoNOT_TESTED, releaseNOT_ACCEPTED.
