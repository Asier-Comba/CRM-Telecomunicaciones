# Texto y voz: contrato de aceptación preparado

Frase obligatoria: «Hazme una factura para Bilbao Telecom Demo SL de 300 euros más el 21% de IVA por instalación de fibra, con vencimiento en quince días».

Entrada de aceptación: catálogo real autorizado del usuario QA; base300, IVA63, total363EUR; concepto íntegro; vencimiento15días desde fecha aplicable; propuesta editable con `saved=false/requires_review=true` del servidor, sin número fiscal ni emisión automática. Guardado sólo tras revisión explícita y recibo validado; recarga y nueva sesión conservan el mismo borrador. No inventar UUID ni éxito por haber construido un objeto local.

| Prueba preparada | Resultado actual |
| --- | --- |
| Frase obligatoria escrita / controles numéricos / negativos de cliente e importe | Parser ejecutado; ver PRODUCT_ACCEPTANCE, no E2E |
| Dictado real es-ES / transcripción editable / detener | NOT_RUN |
| Micrófono denegado / no soportado / fallo / cancelación | NOT_RUN |
| Navegador offline y recuperación sin falso éxito | NOT_RUN |
| Importe ambiguo / varios conceptos / falta de importe | E2E NOT_RUN; no aceptar selección silenciosa |
| Revisión y validación de propuesta por servidor | NOT_RUN |
| Guardar, recargar y abrir nueva sesión | NOT_RUN |
| Doble clic / pérdida de respuesta: mismo comando, un único efecto | NOT_RUN |
| Viewer / identidad de otra empresa | NOT_RUN; requiere cuentas QA autorizadas |
| Revisión fiscal, emisión y PDF privado | NOT_RUN; requiere permisos explícitos y gateStorage/W4 |
| Recorrido Cliente → Cartera → Factura → Documento → Asistente | NOT_RUN |
| Visual390/768/1440 de Facturación real | NOT_RUN |

Fuente888ecaae: PromptBuilder usa SpeechRecognition/webkitSpeechRecognition, es-ES, textarea y fallback escrito. La interpretación es determinista; esto no demuestra que el reconocimiento de voz sea local o no envíe audio al proveedor del navegador. No se contrató API ni se activó micrófono en esta unidad. El componente se muestra en IntegratedBilling sólo con cliente seleccionado y listo; ese catálogo se limita al seleccionado para la propuesta. La integración llama invoice.propose y exige savedfalse/requires_review antes de abrir el editor.

Antes de ejecutar escrituras hospedadas: ventana QA de Cowork con origen/sourcepin, usuarios sintéticos/roles/tenant, operaciones permitidas y limpieza; sesión Supabase Auth del producto; revisión de restricciones Storage/W4. No crear usuarios ni datos usando el panel para saltarse estos pasos. Pruebas controladas de HTTP o SpeechRecognition stub, si se añaden, conservarán esa etiqueta y no sustituirán la voz real.
