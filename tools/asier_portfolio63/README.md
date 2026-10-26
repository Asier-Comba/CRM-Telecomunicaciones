# Unidad 63: aceptación focalizada

Las configuraciones requieren una carpeta de salida nueva por intento; nunca
sobrescriben evidencia. Chromium debe estar instalado. No requieren acceso a
Supabase alojado ni credenciales. Se ejecutan los componentes, repositorio y
validadores reales con HTTP controlado; estos resultados **no acreditan Auth**.

```powershell
$env:ASIER63_OUTPUT='<carpeta nueva para inventario>'
npx playwright test --config tools/asier_portfolio63/playwright.config.mjs
$env:ASIER63_OPPORTUNITY_OUTPUT='<carpeta nueva para oportunidad>'
npx playwright test --config tools/asier_portfolio63/opportunity.config.mjs
$env:ASIER63_REGRESSION_OUTPUT='<carpeta nueva para regresiones existentes>'
npx playwright test --config tools/asier_portfolio63/regression.config.mjs
```

Inventario: recibo y lectura posterior compatibles antes de invalidar, sin
repetir comandos; conserva filtros, cursores y pestaña, y descarta lecturas de
otro contexto. El rojo de unidad 62 permanece conservado fuera del repositorio.

Oportunidad: acción explícita owner/admin, relaciones y fiscalidad consultadas
de nuevo antes de preparar y guardar; editor existente, conceptos vacíos y
precio inicial cero, sin copiar los 1.200 EUR de la oportunidad. El editor
conserva sus valores numéricos iniciales, sujetos a revisión humana obligatoria.
Crear un borrador no emite ni reserva numeración fiscal. Cambiar una relación
en el editor exige volver al contexto autorizado; no se acepta silenciosamente.

La recuperación conserva el comando y su recibo originales. La lectura de
confirmación comprueba cliente, oportunidad, contrato y servicio. Una lectura
tardía de otro actor/empresa/rol no cambia la URL. El regreso a la oportunidad
sólo muestra la factura después de comprobar su relación mediante invoice.get.

La ejecución real está en `tools/asier_compat62/commercial-browser.mjs`, dentro
del stack desechable existente y con documentos/IA/proveedores desactivados.
Extiende el único recorrido coherente: revisión fiscal mediante formularios,
cliente → contrato → servicio → línea → oportunidad → borrador → recarga →
oportunidad/factura relacionada, y denegaciones de roles y otra empresa.
Los 116 escenarios originales y sus tiempos/aserciones permanecen intactos.

No hay cambios SQL, Storage, RLS, API, dependencias, despliegues o empaquetadores.
Seguridad y aceptación alojada requieren sus revisiones independientes.
