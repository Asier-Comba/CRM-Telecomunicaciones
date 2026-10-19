# Supabase: acceso y alcance medido

Único proyecto autorizado: `zgwotxnyqzfuzcnmgvtn`, crm-telecom-staging, organización CRM TELECOM.

El plugin figura instalado/ENABLED. Sus lecturas de organizaciones/proyectos devuelven una organización distinta de CRM TELECOM y cero proyectos; get_project del CRM devuelve «You do not have permission to perform this action». Tras el propietario indicar que ha reconectado, las tres lecturas siguen con el mismo resultado. No se concluye que falte membresía: podría ser cuenta/grant/conexión seleccionada, no resuelto aún.

**El navegador sí quedó autenticado por el propietario.** Se observó título «crm-telecom-staging | CRM TELECOM | Supabase», ref exacta y estado Healthy. En Database → Migrations se leyeron **87 filas**; última visible `20261019180534 / business_conflict_non_retryable`, primera histórica `20261019151747 / 20260925153500_core_tenant_identity`. Inventario observado en [hosted-migration-rows.json](evidence/hosted-migration-rows.json).

Las versiones del ledger hospedado no son los prefijos de los archivos de fuente: el nombre de muchas filas contiene el prefijo original y el campo VERSION refleja otra marca temporal. Este inventario demuestra filas/nombres visibles, **no igualdad del SQL, ACL, RLS ni aceptación de87 migraciones por hash**. No se aplicó, reparó, reseteó ni ejecutó SQL. No se consultaron clientes reales ni claves. No se cambió membresía, credenciales ni configuración.

Acceso por navegador y por conector quedan separados. Sesión administrativa y sesión Auth multiempresa del producto también. El panel Healthy o un aviso sin incidencias no cierra P0Storage, cincoHIGH ni revisiónW4.

## Actualización posterior: autorización y lectura de un SQL

Con confirmación explícita del propietario se completó la reconexión OAuth seleccionando exclusivamente CRM TELECOM. Retorno normal a ajustes de ChatGPT y ChatGPT visible en Authorized apps de la organización. Las llamadas de esta sesión siguen denegando CRM TELECOM (incluido get_organization exacto): **MCP todavía no verificado**, no reiterar grants ni lecturas denegadas en bucle. Navegador sí disponible. No se afirma causa de caché/cuenta/ruteo sin prueba.

Se abrió únicamente el visor «View migration SQL» de VERSION20261019180534, sin editor de ejecución. Selección/copia del contenido visible y comparación contra PR159@2f1b6dd7b449290aeff904f3bd13ca82f83ffecc, archivo20261020100000_business_conflict_non_retryable.sql. [Resultado con hashes y diff](evidence/p1-browser-source-comparison.json): fuente2076bytes, copia2127bytes; comparación byte y LF **false**. Tras normalizar sólo CRLF→LF, la copia contiene exactamente el texto de fuente seguido de un único `;` adicional. No se oculta esa diferencia ni se llama identidad exacta: la causa de serialización del visor/ledger no está establecida. No se colapsó arbitrariamente whitespace ni se modificó ninguna versión.

La comparación acredita lo mostrado por un visor de una migración. No acredita definiciones actuales de funciones, ACL/RLS, cierre de las87, comportamiento HTTP409 ni pruebas de producto. Nada se ejecutó o cambió en Supabase.
