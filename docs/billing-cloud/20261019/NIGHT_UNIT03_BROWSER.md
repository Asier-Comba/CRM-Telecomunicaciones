# Unidad03: texto y dictado desde componentes reales

Fuente comercial888ecaae; banco nuevo ejecutado sobre checkoutd9f59fc con dos archivos propios sin commitear, cuyos hashes están en [result.json](evidence/night-unit03/result.json). **30 casos,27PASS/3FAIL, retries0, exit1; duración140675ms.** No se modificó código comercial ni se relajó el banco original21/3.

Reutiliza `tests/e2e-preview/fixtures/billing-focus-*` sin editarlos. Ejecuta IntegratedBilling, PromptBuilder, parser, repositorio y validadores reales. HTTP y SpeechRecognition controlados; no Supabase/Auth, modelo, micrófono real ni persistencia cloud. Los tres ZIP de trazas fallidas y seis PNG se conservan en Git;18URLs únicas observadas en sus peticiones de red, todasloopback. No credenciales ni cookies de navegador personal.

| Caso, cada uno a390/768/1440 | Resultado |
| --- | --- |
| Texto vacío: no propone ni dispara comandos comprobados | PASS3 |
| Voz no soportada: fallback escrito, propuesta editable y revisión previa | PASS3 |
| Dictado controlado es-ES: espera detener antes de proponer, procedenciaaudio | PASS3 |
| Resultados interinos y edición manual: no duplican texto, procedenciatext | PASS3 |
| Error controlado de voz: permite continuar escribiendo | PASS3 |
| Cambio de cliente: aborta reconocimiento y retira handlers anteriores | PASS3 |
| Propuesta denegada, malformada(savedtrue) y error de red: error visible, sin editor ni comandos comprobados | PASS9 |
| Nueva frase obligatoria: concepto íntegro y quince días en editor | FAIL3 |

La frase llega a `invoice.propose` y abre un editor con **«instalación» y vencimiento vacío**, aunque30000minor/IVA2100bps son correctos. Dos aserciones de aceptación fallan en cada viewport. No se interpreta este negativo como corrección ni aceptación de la funcionalidad. El tercer fallo original de «soporte,» sigue preservado en el banco puro y su fuente no ha cambiado.

Lint dirigido de ambos archivos y `tsc --noEmit --incremental false`:PASS. Compilación del fixture real ejecutada por las pruebas. Build completo Next:NOT_RUN, no hay cambio de aplicación. `npm ci --ignore-scripts --no-audit --no-fund` instaló416paquetes del lock existente sin modificar dependencias.

Reproducción desde la raíz del checkout, usando un intento **nuevo** y conservando el anterior:

```powershell
$env:OIER_QA_ATTEMPT='night-unit03-attempt02'
if (Test-Path -LiteralPath "../oier-billing-cloud-20261019/$env:OIER_QA_ATTEMPT") { throw 'Conserva el intento anterior y elige otro número' }
node node_modules/@playwright/test/cli.js test --config tools/oier_billing_qa/browser.config.ts
```

Se vieron las capturas iniciales del drawer a390/768/1440. En móvil conceptos y pie quedan bajo scroll; **no aceptación visual completa**. Los avisos403 de vínculos corresponden a lecturas deliberadamente denegadas por el fixture, no a un defecto hospedado demostrado.

CLAIM6277961733 pide delegación exclusiva de parse.ts; ACKAsier pendiente. Netlify continúa en loginTeam y se ha pedido al propietario iniciar sesión invitada. MCP del CRM sigue denegado al inicio de esta unidad; no nuevo grant. Próximo banco: respuestas de propuesta retenidas mientras cambia el cliente, con controles positivos del mismo componente. W4/P0Storage/cincoHIGH abiertos; IA comercialwritesOFF; releaseNOT_ACCEPTED.
