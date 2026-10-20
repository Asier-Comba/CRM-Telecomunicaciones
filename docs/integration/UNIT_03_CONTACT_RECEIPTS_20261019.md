# Unidad03 — estado del cliente y recibos de contacto

Fuente ejecutada `8ac7c2b` (SHA completo en JSON), árbol `b873bc9ed6e9f0eddd0428f7234db91a38dbc397`. Merge normal2b8f7b0; adopción selectiva exacta de da1ef4b:ContactEditor+banco+documento. No se incorpora su consumidor Auth/DB ni los commits intermedios ajenos. La documentación upstream describe pruebas del autor, separadas de esta evidencia propia.

Antes:12casos390,7PASS/5FAIL1,7min. Dos fallos permiten acciones para cliente inactivo/archivado; tres permiten cerrar tras respuesta200 ilegible. Negativos403 y lector ya pasaban. Después:59PASS1,3min (18estados/rolesUI+18recibos inválidos/denegados+23regresiones existentes). Recibos incompatibles también probados con UUID768/envelope1440; efecto/replay medidos en HTTP sintético. No nueva aceptación Auth/DB/RLS.

Lint global, typecheck y build66 PASS propios. Cinco capturas vistas: alta con recibo inválido390/768/1440, cliente inactivo390 y archivado768 en solo lectura. No aceptación visual de todos los59casos, roles reales ni toda pantalla. Sin SQL/contratos/dependencias/infra/workers. Bootstrap/assistant anteriores no reejecutados ni heredados; HIGH5/fallosWindows/W4/StorageHTTP siguen abiertos; matrices342sinpromoción,IAOFF,releaseNO.

Incluye contraste directo inmobiliario de Facturación/Customer360 en HISTORICAL_PARITY_20261019.md. Siguiente unidad: facturación ed048f7 revisada; requisito local del Drawer/ConfirmDialog ya integrado9c361c9, contratos billing existentes sin cambio.
