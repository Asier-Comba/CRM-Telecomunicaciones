# Unidad04: una propuesta antigua abre otro contexto

Fuente comercial888ecaae; banco nuevo sobre24c2aee con config/spec propios, hashes en [result.json](evidence/night-unit04/result.json). **15casos:3PASS/12FAIL,retries0,exit1,168198ms**. Reutiliza el fixture existente sin editarlo. No se repiten los30casos de unidad03.

| Caso a390/768/1440 | Resultado |
| --- | --- |
| Propuesta retenida, mismo cliente: al liberar abre editor correcto | PASS3, control positivo |
| Propuesta A retenida → seleccionar B → liberar A | FAIL3: selector principalB, editorA |
| Propuesta A retenida → retirar selección → liberar A | FAIL3: se abre editorA sin contexto seleccionado |
| Propuesta A retenida → propuestaB válida → falloA tardío | FAIL3: errorA contamina editorB |
| Frase original con «por soporte, vencimiento en 15 días» | FAIL3: no abre propuesta; no llega a invoice.propose |

Los tres primeros negativos de carrera demuestran falta de retiro de una respuesta de propuesta al cambiar el contexto; no se afirma fuga entre tenants: son dos clientes de un mismo espacio sintético. Los15casos comprueban ausencia de cualquier ruta `/commands` y errores JavaScript no capturados; no se ejecutan escrituras. Los errores403 de relaciones corresponden al fixture, no se atribuyen al cloud.

Se conservan24archivos de evidencia (12PNG/12ZIP) y observaciones JSON con selección, input de propuesta y cliente del editor. Las72URLs únicas observadas en las peticiones de trazas sonloopback. Capturas de cambio de cliente1440,error tardío1440 y concepto390 vistas. No son capturasNetlify ni voz real ni Auth/DB.

Lint de config/spec y tscnoEmitPASS. Compilación del componente en fixture ejecutada. Build completoNOT_RUN, no cambio de app. Source/fixtures/lock intactos. La causa está localizada en el callback async de `invoice.propose` de IntegratedBilling: su resultado/error no se retira junto al cambio de cliente. Corrección e integración pertenecen a Asier hasta ACK exacto; no se aplicó parche ni se atribuye una solución causal.

Reproducción: seleccionar intento nuevo `OIER_QA_ATTEMPT=night-unit04-attemptNN`, verificar que no exista `../oier-billing-cloud-20261019/<intento>`, ejecutar `node node_modules/@playwright/test/cli.js test --config tools/oier_billing_qa/browser.config.ts`. Conserva salida1, sinretries/xfail ni cambiar expectativas.

Siguiente: publicar comprobación puntual del cuerpo hospedado de invoice.propose (lectura, sinSQL) y preparar cambio mínimo del parser para revisión si sigue pendiente la delegación. Netlify/cohorte/ACK pendientes; IAcomercialOFF/W4independiente/P0Storage/cincoHIGHabiertos/releaseNOT_ACCEPTED.
