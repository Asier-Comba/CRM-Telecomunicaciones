# Facturación: conservar la velocidad y cifras del servicio

Orden7f16f11c; CLAIM6297132282. Propuesta en la rama Oier existente `codex/oier-review175-20261020`; Asier conserva revisión e integración. No rama, runner o PR nuevos.

## Defecto demostrado

«Factura para Bilbao Telecom Demo SL por conectividad 600 Mbps de 300 euros…» llega al editor como **«conectividad»**. Se pierden la velocidad vendida y, en otros formatos reproducidos, cifras de cobertura o producto. El texto original de prueba y las comparaciones están en [concept21/acceptance.safe.json](concept21/acceptance.safe.json).

La causa es el delimitador de concepto que corta ante cualquier cifra precedida por espacio. Un número dentro de una descripción no demuestra que haya comenzado el precio. No se atribuye este defecto a Supabase, modelo, permisos o emisión.

## Corrección mínima

Fuente **146a5433f28fd22eda0fb96373ffef3b5f2bf5c7**: el delimitador numérico sin preposición exige un importe con moneda ya reconocida por el parser. Conserva 600 Mbps, 1 Gbps, 24x7 y Microsoft 365; sigue separando el precio final, incluso 1.200,50 euros. No cambio de dinero, IVA, vencimientos, clientes, recibos, contratos, SQL, proveedor o permisos. Sigue siendo parser determinista con revisión humana, no IA generativa ni interpretación general de cualquier frase.

Tests causales **7aa8e869fc652f14eee95722c4b804eb97d5b918**. Ambos commits se pueden seleccionar sobre **PR175/b9e1eefeea3342b40bdd9584747e9e7ff47bf1cd**: comprobación `git apply --cached --check` en índice temporal propio PASS, sin tocar índice/workspace/rama de Asier. No requieren adoptar los commits de documentación o el caller20. La compatibilidad textual no es ACK, integración o aceptación.

## Evidencia propia

- Antes7aa: **3 fallos UI**,390/768/1440, esperado «conectividad 600 Mbps», recibido «conectividad»; cinco fallos del parser conservados,11 casos positivos.
- Después146: **39/39 UI PASS**, sin retries/skips/flaky, banco existente de prompt ampliado con un caso causal por anchura. Incluye frase obligatoria 300 EUR+21%/15 días, corrección humana y negativos de propuesta. No repetidos los84+6 de revisión anterior.
- Conceptos: **16/16 PASS**. Banco de aceptación del parser: **24/24 comprobaciones en10 escenarios**, incluidos cliente autorizado/ambiguo,300+63=363,fecha,moneda y negativos originales.
- Lint global y compilación/TypeScript propios: estado y hashes finales en [acceptance.safe.json](concept21/acceptance.safe.json). No heredar el build de b9e.

Capturas revisadas [390](concept21/reviewed-390.png), [768](concept21/reviewed-768.png), [1440](concept21/reviewed-1440.png): concepto completo y precio300 visibles. No aceptación visual de todo el drawer; los errores de vínculos son respuestas denegadas intencionadas del fixture. No se ocultan o convierten en listas vacías.

HTTP/SpeechStub y parsers reales, **no persistencia AuthDB/cloud, micrófono o modelo vivo**. El campo de concepto correcto llega a la propuesta revisable; este banco no guarda/emite facturas. La validación alojada requiere fuente integrada, acceso y ventana propios.

## Integración y siguiente paso

REQUEST Asier revisar/seleccionar únicamente tests7aa y fix146, conservando sus controles de composición. No importar toda esta rama ni reimportar172/173. No modificar contratos compartidos. Mantener la matriz canónica sin promoción de filas completas.

El timeout físico175 (`invoice.issue:first_effect`) continúa **UNKNOWN**, efecto desconocido no repetido. Este arreglo de concepto no lo corrige. Caller3e7f43c0 espera decisión exacta/composición/recurso de Asier. W5 mantiene presupuesto privado6296238416 y ventana; CORE162 sigue2mutaciones. Telecom16 requiere acuerdo de condiciones/versión/precio del servicio y fixtures/limpieza. Sin compra/protección, Storage/IAwritesOFF, cincoHIGH/revisión independiente abiertos, issue10OPEN y releaseNOT_ACCEPTED.
