# DEMO-UX-07 — textos del transporte integrado

Propuesta exclusiva sobre3b80, CLAIM6291349464/6291377217. Fuente funcional7e1919d6b6e365ee068b01187d9a25c4619f6712. Tres componentes cambian sólo presentación; tres specs conservan aserciones y actualizan locators exactos. Integración, despliegue y contratos siguen siendo de Asier/W5.

## Problema y resultado

integrated_local también es el transporte real de staging: las etiquetas base/servidor local eran engañosas allí. PreviewNotice dice ahora Integración de prueba, datos sintéticos y necesidad de confirmación del servidor; no promete un guardado antes del recibo. Facturación describe borradores revisables; mensajes de guardado se muestran en las mismas ramas confirmadas por servidor. No cambia lógica, permisos, operaciones, límites, parser, importes, emisión o gestión de incertidumbre.

InvoiceEditor usa la prop integrated ya existente: integrado muestra Revisar/Guardar borrador y conserva revisión explícita, vista previa y emisión posterior. Modo de demostración en memoria conserva su etiqueta local y aviso de pérdida al salir. El parser local/sin IA externa sigue siendo descripción correcta y no se cambia. PDF sólo cambia nombre de descarga; no activa contenido ni declara Storage seguro.

Compatibilidad: runnerQA de PR162 fuente13aa9ce4 acepta exclusivamente Guardar borrador local o Guardar borrador. Adoptar esa revisión junto con esta propuesta; no desplegar la copia dejando un consumidor incompatible. Esto no autoriza --run o acceso cloud.

## Comprobaciones propias

51/51 regresiones existentes sobre7e1919d6,17casos en390/768/1440, cero flaky/skips/retries: prompt editable, frase comercial/importes/vencimiento, revisión de guardado, tres carreras originales y cuatro diálogos no sustituidos. HTTP y SpeechRecognition controlados: voz real, AuthDB y cloudNOT_RUN. No añadir esas51aotras baterías.

Lint dirigido0, TypeScript0. Build predeterminado Next16.3.8/TurbopackPASS,44páginas, con las mismas dependencias físicas. Fallos previos de entorno preservados por intento:
1. Enlace node_modules fuera de raíz rechazado por Turbopack antes de compilar.
2. Conservé el enlace dentro del proyecto con otro nombre; TypeScript recorrió dependencias como fuentes. Error de preparación propio, no defecto causal del CRM. Se movió el enlace intacto fuera del checkout; no excluir archivos ni relajar tipos.
3. Copia física idéntica, raíz limpia: buildPASS. Sin cambiar versiones/config/flags/aserciones. El intento inicial de retirar el enlace fue rechazado automáticamente; se completó de forma reversible renombrándolo y preservándolo fuera. Sin eliminar dependencias o fuentes.

Originales completos locales y hashes en DEMO_UX07.json. Estos fallos no reparan causalmente F736/CASE_NOTE_CURSOR/otros originales. No build o verde heredado por SHA.

## Visual observado

Tres PNG de la misma ejecución, copiados byte-idénticos y revisados: ux07/IMAGE_MANIFEST.json. Encabezado/editor/aviso se ajustan a390/768/1440 sin corte material en zona capturada; móvil muestra una columna y tablet/escritorio dos. Fondo visible desktop confirma rótulos integrados neutros. Sólo parte superior/visible, no controles fuera del scroll. Los mensajes rojos de vínculos son denegaciones deliberadas del fixture, no prueba de permisos cloud. No capturas Auth/HAR ni datos reales.

Pendientes: adopciónAsier, nueva fuente/deploy trazadosW5 y QAindependiente alojada. Dashboard sigue ámbito integrador, no se fabrican números. CincoHIGH, W4 independiente, StorageP0 yreleaseNOT_ACCEPTED; IA writesOFF.
