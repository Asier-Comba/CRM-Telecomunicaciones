# Revisión independiente Oier de la composición175

Fuente revisada: **b9e1eefeea3342b40bdd9584747e9e7ff47bf1cd**, árbol **6012a6c409733f60282d0ca997d414dd31a11394**. CLAIM6296393329. Checkout y rama exclusivos Oier; ninguna modificación de fuente, fixture o banco del integrador. No nueva PR, merge o aprobación de seguridad.

## Resultado propio

Se reutilizan los bancos existentes, sin cambiar sus tiempos, asserts, datos o permisos:

| Banco | Ejecución Oier | Alcance |
|---|---|---|
| tools/integration_qa/demo-composition.config.ts | 63 PASS,154.8s | 36 prompt,9 feedbackCartera y18 preparación/regresiones;390/768/1440. |
| tools/oier_billing_qa/dialog.config.ts | 12 PASS,39.7s | Respuestas tardías de propuestas no sustituyen emisor, cliente, resumen o cobro. |
| tools/oier_billing_qa/intent.config.ts | 9 PASS,33.6s | Intención manual, cierre y selección de factura conservados frente a propuestas tardías. |

**84 casos propios, sin reintentos, omisiones, flaky o errores globales de runner.** Son componentes reales y parsers con HTTP/SpeechRecognition controlados. No prueban Supabase, persistencia real, Netlify, micrófono, transcripción real o modelo vivo. Los63 reportados previamente por Asier se mantienen separados: ésta es ejecución independiente sobre su nueva composición.

Identidad estática: los tres componentes y sus tres bancos seleccionados coinciden por blob Git con las entregas174,172 y173. [Identidad](review175/source-identity.json). Esto no constituye seis pruebas funcionales adicionales.

Lint global y build por defecto/TypeScript: consultar el estado final y hashes de logs en [review.safe.json](review175/review.safe.json). No heredar el build de853 o de otra rama. Entorno propio Node24.12.0/npm11.6.2, Next16.3.8; no prueba del adaptador/build de Netlify.

## Visual acotado

Revisadas las tres capturas de búsqueda rápida asentada en390/768/1440: resultado, estado Borrador y acciones visibles, sin aviso de consulta pendiente. El inventario sintético superior está vacío por fixture; no se afirma vacío del CRM real. El alcance es esa sección y ese estado, no aceptación visual del módulo completo.

- [390](review175/portfolio-settled-390.png)
- [768](review175/portfolio-settled-768.png)
- [1440](review175/portfolio-settled-1440.png)

No hallazgo accionable en el delta comercial cubierto por estos84 casos. No aceptación masiva de requisitos342.

## Fallo físico original de esta misma composición

**Supabase39458747653 FAIL**, job118752349311. Artefacto seguro12282737717 y capturas12282682770 originales conservados. Checkout real **5f1eb783d737479abafc78d48e61dd05b72156ad**, árbol idéntico a b9e verificado, padres a9e+b9e.

87 migraciones;3815+227 backend;114 UI únicos y **un TIMEOUT** en `billing_invalid_receipt_seven_commands_same_intent_single_persisted_effect`, fase `billing_invalid_receipt:invoice.issue:first_effect`. Duración total del caso11037ms. Auth/cleanup locales, server0/teardownPASS. El caso separado de respuesta perdida pasa en12612ms: no repara causalmente éste.

La [captura original](review175/original-invalid-receipt-failure.png) muestra el modal Emitir factura, resultado pendiente, alerta esperada, Cancelar deshabilitado y Reintentar la misma acción disponible. La fase agrupa click, espera de alerta, comprobación de commit y guardas de cierre: no sabemos cuál agotó el tiempo. La captura al final no demuestra cuándo llegó la alerta ni cuál fue el efecto persistido. **Causa completa y efecto concreto UNKNOWN; no repetidos.**

[Proyección segura y hashes](review175/original-supabase-failure.safe.json). REQUEST6296545586 pide correlación segura del intento original y, si no existe, reproducción causal acordada en recurso desechable. DockerLinux local Oier no disponible; no iniciar infraestructura o SQL alternativos, relajar tiempos o repetir una emisión incierta. Los84 casos controlados positivos no sustituyen esta investigación física.

## Continuidad

W5 prepara propuesta privada para Oier/Asier según REQUEST6296238416; verificar equipo, usuarios incluidos y total mensual exacto antes de pedir aprobación. No compra, upgrade, permisos, invitaciones o cambios de protección autorizados. Coordinar sólo ventanas alojadas legítimas del propietario y atribuir sus resultados.

175 sigue sin despliegue acreditado; nube reportada a9e/6ad78f6c, sin herencia de aceptación. CORE162 mantiene dos mutaciones y requiere contexto/actores/fixtures/ventana/limpieza propios. Telecom16 y alternativa175 requieren acuerdo explícito. No tocar ramas ajenas ni fuentesW5. CincoHIGH, historia, plataforma, Storage/revisor independiente siguen abiertos. IA comercial writesOFF, modelo/voz realNOT_RUN, issue10OPEN y releaseNOT_ACCEPTED.
