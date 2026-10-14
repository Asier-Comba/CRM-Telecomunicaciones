# Facturación: distinguir el contrato por operador

CLAIM W2-X #67 /6166621850. Base94816d3bd36218bc60f646e3541089e4f04fe8c2.

## Defecto y corrección

En el editor de factura, veinte contratos cargados de dos operadores distintos compartían la etiqueta «Contrato del 01 oct 2026 · Activo». La reproducción controlada confirma la ausencia del operador después de comprobar las21 opciones del selector. Se conserva el fallo causal y su captura. Un intento previo no encontró pruebas por un filtro con anclaje inicial incorrecto; ese error de preparación se conserva separado y no cuenta como reproducción del defecto.

InvoiceRelationSelect usa loadCollectionLabels existente para añadir operador antes de fecha/estado. La página realiza una lectura por operador distinto:20 contratos y2 operadores requieren2 consultas de etiquetas. La selección mantiene su verificación específica porid mediante lectura de límite1; las etiquetas no conceden autorización ni sustituyen esa verificación. Los datos de otro cliente se rechazan antes de consultar sus operadores. Un operador denegado se muestra como «Operador no disponible», sin UUID visible ni nombre inventado.

Se conservan customer_id, contract_id de servicios, sort id_asc, límite20, cursor y límite1 de verificación. Las consultas de etiquetas se retiran con el contexto activo. No cambios de contratos/backend/permisos/servicios ni dependencias nuevas.

La primera revisión visual detectó que las tres columnas reducían demasiado el selector en768/1440. Los vínculos autorizados ocupan ahora una fila completa dentro del panel existente; conservan controles y resumen completo de selección. El editor no autorizado de demostración mantiene su estructura propia.

## Verificación propia

- 42 pruebas finales de navegador HTTP controlado PASS:15 nuevas (selección, página, operador denegado, contratos denegados, cliente incompatible, por390/768/1440) y27 regresiones de preparación/cierre y cliente activo/inactivo/archivado.
- Las pruebas verifican destino exacto, consulta del contrato seleccionado, filtro de servicios y ausencia de comandos comerciales durante selección. No guardan ni emiten una factura real.
- Lint completo y build66 inicial PASS; después del ajuste visual,42 pruebas finales, lint de archivos cambiados y build66 final PASS. Las evidencias iniciales siguen conservadas, sin trasladar su resultado a la versión cambiada.
- Tres capturas finales390/768/1440 inspeccionadas: operador visible en móvil y etiqueta completa bajo el selector; a768/1440 el selector muestra operador/fecha/estado y los controles se distribuyen en todo el ancho. Sin desbordamiento horizontal visible. Revisión parcial del panel, no aceptación visual de toda facturación.

Auth/DB/Storage real NOT_RUN; modelo vivo NOT_RUN/API0. HIGH5, revisión W4 y ACK principal pendientes; IA comercial writesOFF, issue10OPEN, releaseNOT_ACCEPTED. Fallos7F/F736/B9/3c7 conservados sin atribuirles corrección causal. La fuente integrada4d25 conserva sus566 propios; estas42 pertenecen únicamente a esta unidad. Su composición posterior requiere pruebas nuevas.
