# CRM Telecom · Arizan · 26 de octubre de 2026

## Netlify existente: opción principal pendiente de acceso y revisión visual

W5 ha comunicado en [el checkpoint de coordinación](https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-6400953456) que se utilizará el despliegue existente, sin publicar una fuente nueva. **Work todavía no ha comprobado este recorrido en navegador**. Primero debe completarse el acceso de la cuenta existente de Netlify y después el del CRM con el owner sintético A de **W5 P0 Synthetic A**. Contraseñas únicamente en sus páginas legítimas.

W5 reporta la fuente `a9e977adf90b1e83cded23fb54aefc696839d014`, despliegue `6ad78f6c810c781fba4f5880`. Confirmar esos datos y recorrer las pantallas antes de elegir esta opción. La sesión de equipo de Netlify puede caducar: volver a entrar justo antes de la reunión.

| Tiempo | Pantalla y acción | Mensaje y comprobación |
|---|---|---|
| 0:00–1:00 | Login → Panel | «Este entorno de ensayo contiene datos sintéticos.» Confirmar empresa y rol owner. |
| 1:00–2:00 | Clientes → **Estado: Activo** | W5 informa de dos clientes activos. Sin ese filtro también aparecen once archivados. |
| 2:00–4:00 | **Empresa Ejemplo Norte SL** → Customer360 | Mostrar el contacto y la relación con contratos, servicios y próximas acciones. |
| 4:00–6:00 | Cartera, servicios y líneas | Dos contratos, dos servicios y tres líneas según W5. Mostrar operador, tarifa, permanencia y renovación. |
| 6:00–7:00 | Oportunidades | «Ampliación a 10 líneas móviles», 1.200 €, en etapa abierta. |
| 7:00–8:00 | Agenda e incidencias | Tarea de revisar la renovación de fibra e incidencia de conectividad. |
| 8:00–9:30 | Facturación → borrador existente | Abrir el borrador de 363 €, sin número; recargar y releer. Solo owner/admin ven facturación. No emitir ni improvisar escrituras. |
| 9:30–10:00 | Cierre comercial | «Centralizamos cartera, renovaciones y seguimiento y organizamos la preparación de facturas.» Explicar próximos pasos sin inventar ahorros. |

**IA en vivo, PDF privados, emisión fiscal e integraciones externas quedan fuera de este recorrido.** El preflight 16/16 comunicado por W5 es una prueba de backend; no sustituye las pantallas ni acredita una escritura realizada desde este navegador.

Si un cliente no aparece, revisar el filtro y la primera página. Si falta una factura, confirmar el rol owner y el periodo de octubre de 2026. No ampliar permisos ante una denegación. Si el acceso o una pantalla siguen fallando, pasar al respaldo local identificado a continuación.

Fuentes: [guía W5](https://github.com/Asier-Comba/CRM-Telecomunicaciones/blob/8a620584857167de6aa527e5add1eff5b995d9de/docs/w5/ARIZAN_PRESENTATION_READY.md) y [hoja de emergencia](https://github.com/Asier-Comba/CRM-Telecomunicaciones/blob/8a620584857167de6aa527e5add1eff5b995d9de/docs/w5/ARIZAN_EMERGENCY.md). Sus referencias a la copia local anterior 68a/3107 han quedado sustituidas por **c9c/3109**; el alojamiento permanece separado.

## Alternativa local comprobada: abrir y explicar el entorno

Abre **http://127.0.0.1:3109/login en este ordenador** y pulsa **Ver demo telecom**. Si el servidor está cerrado, utiliza `Abrir-CRM.cmd` desde esta misma carpeta y conserva abierta su ventana. Recorre las pantallas antes de la reunión para tenerlas listas.

Esta alternativa es una **demo local sin autenticación real**, con datos sintéticos de la instantánea que indica la aplicación. No es el CRM alojado ni utiliza cuentas de Arizan. Las consultas son de muestra y los borradores de factura son temporales. No se presentan como escrituras persistentes.

La URL privada existente es https://crm-telecom-staging-preview.netlify.app. Conserva su protección de equipo. Su uso para la presentación depende de completar el acceso legítimo, comprobar el despliegue exacto y verificar el recorrido con una cuenta sintética autorizada. No cambiar a ese destino en mitad de la presentación sin haberlo comprobado antes.

## Recorrido local de diez minutos

| Tiempo | Pantalla y acción | Mensaje que puedes decir |
|---|---|---|
| 0:00–0:45 | Login → **Ver demo telecom** | «Vamos a mostrar una muestra sintética del producto. Indicaré qué está conectado y qué está pendiente.» |
| 0:45–2:00 | Dashboard. Mostrar cartera, tareas, renovaciones y siguiente acción. | «El comercial puede ver qué necesita atención sin recorrer varias herramientas. Los contadores corresponden a esta muestra y muestran su cobertura.» |
| 2:00–3:00 | Clientes. Buscar **Empresa Norte**; abrir **Empresa Norte Telecom SL**. | «La búsqueda lleva directamente al contexto completo de una empresa.» |
| 3:00–4:30 | Customer360. Resumen y pestañas Contratos, Servicios, Líneas y Tareas. | «La misma ficha relaciona la cartera telecom, el seguimiento y las próximas acciones. Los datos protegidos no se muestran por defecto.» |
| 4:30–5:45 | Cartera Telecom. Buscar el contrato de Empresa Norte y abrir **Ver detalle**. Mostrar operador, plan y estado; cerrar el panel. | «El contrato conserva su contexto de cliente y operador. Los servicios y líneas se consultan desde esa relación.» |
| 5:45–7:30 | Facturación PRO. Introducir la frase inferior y pulsar **Generar propuesta**. Revisar cliente, concepto e importes. | «El texto prepara un borrador revisable. Aquí usamos un parser local, sin modelo de IA externo. No guarda ni emite automáticamente.» |
| 7:30–8:30 | Oportunidades → Calendario. En móvil, elegir **Agenda**. | «Las oportunidades y las tareas ayudan a organizar el siguiente contacto y las renovaciones.» |
| 8:30–9:30 | Asistente IA. Nueva conversación → **¿Qué renovaciones tengo próximas?** | «Esta consulta es determinista y de solo lectura. Muestra las fuentes y sus límites. El proveedor de IA en vivo está pendiente de activación.» |
| 9:30–10:00 | Volver al dashboard. | «El objetivo es centralizar la cartera, reducir búsquedas y trabajo administrativo y preparar mejor el seguimiento y la facturación. El siguiente paso del piloto es validar el acceso y la operación integrada en el entorno privado.» |

### Frase probada de facturación

> Factura para Empresa Norte Telecom SL por conectividad 600 Mbps de 300 euros + IVA, vencimiento en 15 días

Resultado comprobado: **conectividad 600 Mbps**, base **300,00 €**, IVA **21 % / 63,00 €**, total **363,00 €**. Las fechas corresponden a la instantánea de ensayo, no a una emisión actual.

Puedes marcar la revisión y guardar **un borrador local** si quieres enseñar la interacción. Debes decir que solo existe en esa sesión. Al recargar o salir del módulo desaparece; esa limitación se ha comprobado. **Emitir factura está deshabilitado.**

## Si falla Internet o el acceso privado

La demo de esta máquina funciona en loopback y no necesita Internet para su conjunto de datos sintéticos. Mantén el servidor abierto antes de la reunión.

Abre `Respaldo-visual.html` o las capturas `Local-*.jpg`. El vídeo de respaldo se identifica como **montaje de capturas reales**, no como una sesión en directo ni una grabación continua. Las imágenes del anexo `CI-*` proceden de una aceptación autenticada desechable, con su fuente y fecha indicadas; no son el despliegue actual.

No presentes un formulario renderizado, un borrador temporal o una captura como prueba de persistencia alojada. Si se pregunta por una capacidad no comprobada en esta sesión, remite al estado y a la evidencia exacta del informe.

## Acceso interno pendiente

Netlify requiere primero una cuenta invitada de Netlify; después el CRM requiere su propia cuenta sintética confirmada y autorizada en la cohorte. Las contraseñas se introducen solo en las páginas legítimas y no se incluyen en esta guía.

Para una demostración integrada: iniciar sesión, comprobar empresa y rol, guardar únicamente el cambio sintético acordado, recargar y releerlo; verificar después que otro rol no obtiene acceso indebido. Ese recorrido no se da por hecho por haber pasado pruebas en otro entorno.
