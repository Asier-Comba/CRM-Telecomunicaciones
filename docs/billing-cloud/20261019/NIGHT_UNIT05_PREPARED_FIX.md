# Unidad05: RPC hospedado compatible y cambio preparado

Se leyó desde Database→Functions el cuerpo actual de `public.billing_v1_invoice_propose(uuid,jsonb)` del único staging autorizado. El panel muestra argumentosworkspace/input, retornojsonb y seguridadDefiner. Se seleccionó/copió la definición y se cerró con **Cancel**, sin Save ni ejecuciónSQL.

[Comparación](evidence/hosted-propose-body-comparison.json): cuerpo idéntico al delimitado entre `as $$` y `$$;` en `20261004180000_billing_normalized_proposal.sql` de888ecaae, normalizando sóloCRLF→LF. SHA256 de ambos cuerpos `df637d5d0865b9ece26e2ed0e71e66e9d94d4881eeebb70afb4298a64d882326`. El archivo de esa función también coincide en los pinsPR158be71/PR1592f1. No se asume compatibilidad de toda la composición87/Storage a partir de una función.

El cuerpo declara propuesta revisable/sin guardar, valida alcance e input y recalcula totales. Esto es inspección de metadatos, **no una llamada Auth real**, ni prueba deRLS/ACL/search_path/efectos o guardado hospedado. La API del conector de esta sesión permanece denegada; el panel está disponible. Ningún cliente/usuario/clave/SQL/flag/cloud se modifica.

## Propuesta concreta para Asier

[parser-minimal.patch](../../../tools/oier_billing_qa/candidates/parser-minimal.patch) prepara cuatro sustituciones de líneas enparse.ts: reconocer únicamente «quince» además del formato numérico existente; conservar conectores del concepto y detenerlo ante cláusulas fiscales, importe o puntuación. No crea otro motor ni interpreta lenguaje abierto como un modelo semántico. No cambia clientes, importes, IVA, contratos, servicios, permisos o efectos.

**NO APLICADO; pruebas funcionales del cambioNOT_RUN.** [Metadatos y huellas](evidence/parser-candidate.json). `git apply --check tools/oier_billing_qa/candidates/parser-minimal.patch` termina0 sobre la base fijada; sólo acredita aplicabilidad mecánica. Sourceparse.ts continúa byteequivalenteLF a888ecaae y los fallos originales permanecen abiertos.

Asier puede delegar exactamenteparse.ts sobre una base acordada o aplicar/revisar él mismo la propuesta. Tras delegación: aplicar delta, ejecutar banco original21/3, casosUI de unidades03/04 y regresión existente de facturación; corregir regresiones antes de commit/push/PR/revisión. No afirmar corregidos los casos por tener un patch. Las carreras de IntegratedBilling pertenecen a otra corrección con retiro de respuestas por contexto/intención.

W4/P0Storage/cincoHIGH/NetlifyTeam/cohorteQA/deploy siguen con su alcance pendiente. IAcomercialOFF yreleaseNOT_ACCEPTED.
