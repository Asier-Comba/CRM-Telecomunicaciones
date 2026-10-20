# Contraste directo con el CRM de referencia

Referencia leída, sin ejecutar ni modificar remotamente: `iazticontact/crm-inmobiliario-demo@ad3c06e5e6dca8e9cf0342845f670b1b48478851`. `origin/main` observado coincide con ese pin. Lectura directa con Git de Facturación, Customer360, InvoicePromptBuilder e invoice-service; extracción parcial en Windows falló y se conservó, después se usó lectura de blobs. Ningún código histórico se copia al producto. No hay navegador histórico reproducido.

| Capacidad observada en código de referencia | Telecom candidato | Estado de paridad |
|---|---|---|
| Texto y Web Speech API generan propuesta revisable, sin emitir automáticamente | PromptBuilder/parser ordinarios y invoice.propose, separado del planner IA | Parcial: revisión/guardado existen, micrófono real y modelo NO probados/autorizados aquí |
| Guardar borrador, emisión separada, cobro/estado, papelera/restaurar y eliminación con traza | Contratos billing.v1/recibos, operación humana y PDF privados existentes | Parcial: recuperación incierta posterior en revisión; no dar por aprobadas todas las operaciones históricas ni copiar purga |
| Serie, moneda, FX manual con fecha/fuente, conceptos/descuento/IVA/retención | Editor y cálculo exacto Telecom, agregado separado por moneda | Parcial: validación por requisito de las342filas pendiente, no equiparar vista previa con importes de servidor |
| PDF, regeneración y URL privada conservada | PDF y artefactos privados; frontend depende de autorización/backend existentes | Bloqueada aceptación hospedada por Storage; evidencia antigua no se transfiere |
| Customer360: Resumen/Documentos/Operaciones/Visitas y citas/Tareas/Conversaciones/Facturación | Áreas Telecom específicas: contratos/servicios/líneas/SIM/portabilidades/renovaciones/permanencias/incidencias, además de áreas generales | Parcial: adaptación de dominio existente, sin equivalencia automática por pestaña visible |
| Contactos y acciones con métodos personales | Contactos bajo repositorios/recibos y revelado explícito | Parcial: unidades02/03 añaden recuperación y coherencia de estado; Auth/RLS nuevo pendiente |

Fuentes: `src/app/(saas)/facturacion/page.tsx`, `src/app/(saas)/clients/[id]/page.tsx`, `src/components/invoicing/InvoicePromptBuilder.tsx`, `src/lib/invoicing/invoice-service.ts` del pin. La referencia contiene consultas Supabase y reserva de número; esto no aprueba su seguridad ni autoriza reproducirlas. El comentario histórico que describe el reconocimiento de voz no demuestra dónde procesa audio el navegador.

Se conserva PRODUCT_PARITY_STATUS/PRODUCT_RELEASE_QUEUE sin promoción masiva. Este contraste corrige la limitación de lectura exclusivamente documental del diagnóstico inicial, únicamente para las superficies indicadas; no completa toda la paridad ni certifica superioridad visual.
