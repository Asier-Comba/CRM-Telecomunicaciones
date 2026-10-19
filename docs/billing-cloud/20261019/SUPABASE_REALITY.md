# Supabase: acceso y alcance medido

Único proyecto autorizado: `zgwotxnyqzfuzcnmgvtn`, crm-telecom-staging, organización CRM TELECOM.

El plugin figura instalado/ENABLED. Sus lecturas de organizaciones/proyectos devuelven una organización distinta de CRM TELECOM y cero proyectos; get_project del CRM devuelve «You do not have permission to perform this action». Tras el propietario indicar que ha reconectado, las tres lecturas siguen con el mismo resultado. No se concluye que falte membresía: podría ser cuenta/grant/conexión seleccionada, no resuelto aún.

**El navegador sí quedó autenticado por el propietario.** Se observó título «crm-telecom-staging | CRM TELECOM | Supabase», ref exacta y estado Healthy. En Database → Migrations se leyeron **87 filas**; última visible `20261019180534 / business_conflict_non_retryable`, primera histórica `20261019151747 / 20260925153500_core_tenant_identity`. Inventario observado en [hosted-migration-rows.json](evidence/hosted-migration-rows.json).

Las versiones del ledger hospedado no son los prefijos de los archivos de fuente: el nombre de muchas filas contiene el prefijo original y el campo VERSION refleja otra marca temporal. Este inventario demuestra filas/nombres visibles, **no igualdad del SQL, ACL, RLS ni aceptación de87 migraciones por hash**. No se aplicó, reparó, reseteó ni ejecutó SQL. No se consultaron clientes reales ni claves. No se cambió membresía, credenciales ni configuración.

Acceso por navegador y por conector quedan separados. Sesión administrativa y sesión Auth multiempresa del producto también. El panel Healthy o un aviso sin incidencias no cierra P0Storage, cincoHIGH ni revisiónW4.
