# Facturación PRO: aceptación parcial, producto pendiente

Fuente evaluada: `888ecaae57e9021ca0cb25d4da0657c1f6ac9b40` (PR156 observada al iniciar esta unidad). No es una afirmación sobre futuros HEAD ni sobre el deploy de Netlify.

Se ejecutó el parser real con entradas sintéticas: **10 escenarios, 24 comprobaciones, 21 PASS y 3 FAIL**, salida 1. Resultado íntegro: [parser-original.json](evidence/parser-original.json). No se corrigió ni modificó código comercial: delegación exacta de Asier pendiente en [CLAIM6275538377](https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-6275538377).

| Caso | Esperado | Resultado real |
| --- | --- | --- |
| Frase obligatoria: concepto | instalación de fibra | instalación — FAIL |
| Frase obligatoria: quince días desde 2026-10-19 | 2026-11-03 | null — FAIL |
| Control numérico: «por soporte, vencimiento en 15 días» | soporte | cadena vacía — FAIL |
| Frase obligatoria: base / IVA / total | 300 / 63 / 363 EUR | PASS en parser y cálculo puro |
| Control numérico: vencimiento en 15 días | 2026-11-03 | PASS |
| Cliente desconocido / ambiguo | sin UUID inventado, revisión pendiente | PASS con catálogo sintético suministrado |

Reproducción desde la raíz del checkout con Node24:

```powershell
node --experimental-strip-types tools/oier_billing_qa/parser-acceptance.mjs --output resultado-nuevo.json
```

El archivo de salida debe ser nuevo: el banco rechaza sobrescribir evidencia. Verifica blobs de parser/modelo/cálculo contra el SHA fijado antes de importar. Para evaluar una corrección, utilizar `--source <SHA-exacto>` y conservar ambas ejecuciones; los blobs del checkout deben coincidir con ese SHA. No convertir estos FAIL en expectativas verdes ni añadir xfail. La advertencia de Node sobre paquete sin type es diagnóstica; no se cambió package.json.

| Capa | Estado de esta unidad |
| --- | --- |
| Parser real / entradas sintéticas | FAIL de aceptación, 21 positivos conservados |
| Catálogo real autorizado de clientes | NOT_RUN |
| Propuesta validada por servidor | NOT_RUN |
| Voz con micrófono real | NOT_RUN |
| Navegador de Facturación en Netlify | BLOCKED_NETLIFY_TEAM_LOGIN |
| Acceso administrativo Supabase por navegador | VERIFIED tras inicio de sesión del propietario |
| Persistencia Auth/DB cloud / recarga / nueva sesión / aislamiento | NOT_RUN |
| PDF / Storage / emisión fiscal | NOT_RUN; sujetos a autorización y revisión |
| Modelo vivo | NOT_RUN |
| Release | NOT_ACCEPTED |

Cinco HIGH, P0 Storage, revisión independiente W4 e issue10 abierto se conservan. IA comercial general writes OFF. El acceso al panel administrativo no equivale a sesión Supabase Auth del CRM ni autoriza escrituras de QA.
