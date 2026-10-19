# Paridad de Facturación PRO: comparación inicial fijada

Referencia sólo lectura: [crm-inmobiliario-demo@ad3c06e5](https://github.com/iazticontact/crm-inmobiliario-demo/tree/ad3c06e5e6dca8e9cf0342845f670b1b48478851). Fuente Telecom:888ecaae57e9021ca0cb25d4da0657c1f6ac9b40. Dieciocho archivos de referencia descargados con hashes; esta comparación inicial revisa PromptBuilder, parser y los informesP36A/D/F. No afirma revisión exhaustiva ni hereda los PASS declarados en aquellos informes. No se copia SQL, inmobiliario ni lógica de comisiones.

| Capacidad de referencia | Telecom en fuente inspeccionada | Brecha / siguiente aceptación |
| --- | --- | --- |
| Entrada texto/voz visible | PromptBuilder existente, condicionado a cliente seleccionado en IntegratedBilling | Accesibilidad y descubrimiento real por comprobar en Netlify |
| Cliente completo/parcial/ambiguo | Resolución determinista contra catálogo suministrado | Positivos/negativos sintéticos pasan; lectura real Auth/RLS pendiente |
| Propuesta editable sin guardar ni emitir | invoice.propose y comprobación saved/requires_review en componente | Servidor/recarga/persistencia no medidos |
| Conceptos y vencimientos | Un concepto por propuesta; números de días | 3FAIL del banco propio; quince y conceptos con «de»/coma |
| IVA incluido / faltantes | Parser con base inversa y avisos | Positivos puros; fiscalidad/servidor pendiente |
| Editor con varias líneas / descuentos / retenciones | Tipos de formulario y cálculo por línea existentes | No reescribir; aceptar individualmente en UI/servidor |
| Series / revisión pre-emisión | Campo series y ConfirmDialog/numbering servidor | Checklist fiscal y numeración cloud no demostrados |
| Vistas borrador/emitida/pagada/vencida/papelera | Selector de estados existente | No confundir existencia con aceptación individual |
| Papelera/restauración | Acciones visibles para borrador/trashed | Referencia permite archivar más estados; decisión comercial antes de ampliar |
| Cobros / reversión | Acciones mark_paid/reverse_payment existentes | Aceptación Auth/DB y respuesta perdida pendiente |
| Resumen financiero | KPIs por moneda; vencido incluido en pendiente | Referencia convierte aEUR conFX; diferencia explícita, no sumar divisas |
| Monedas / FX | Parser EUR/USD/GBP, snapshot manual sin inventar cambio | Referencia anuncia más monedas; no ampliar backend sin acuerdo |
| PDF privado | Rutas PDF y referencia privada existentes, gatecontent | No descarga/Storage aceptados; P0 abierto |
| Relaciones telecom | contract/service/opportunity del formulario | Conservar modelo y permisos; no copiar propiedades/comisiones |
| Historia / búsqueda / fiscal / móvil | Funciones parciales presentes, inventario no exhaustivo | QA físico y aceptación por capacidad pendientes |

Los textos «base local», «servidor local» y «facturas sintéticas» siguen en IntegratedBilling de este pin. Requieren reconciliación del modo/despliegue y copy veraz, no un cambio cosmético que proclame cloud. El panel Supabase ya accesible aporta evidencia de infraestructura, no de un recorrido comercial persistido.

Siguiente unidad independiente: pruebas de propuesta/texto/voz con recursos existentes, una vez se confirme su alcance; corrección del parser sólo tras delegación exacta. Netlify/cohorte/sourcepin siguen necesarios para la prioridad principal de producto real.
