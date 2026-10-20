# Unidad14 — rutas cerradas con admisión desactivada

Fuente9cfc8aaf2eadd772dc1f5242684a33394e6d8fce, árbol6b8651dbb13f4d285776c9980593cea3709dc4e1. Completa la propuesta inactiva de unidad10; no habilita staging ni producción.

El Proxy rechazaba configuración inválida, pero con APP_ENVstaging/production y flag ausente/false continuaba hacia páginas protegidas, aunque el SDK de usuario de servidor ya estaba denegado. Se reproduce en cuatro casos de Proxy real transpilado:200 frente a503esperado. Esto prueba continuidad de ruta, no una exposición de datos demostrada.

La corrección bloquea páginas/API protegidas con503yCache-Control:no-store antes de construir SDK. Login, restablecimiento, callback, signout y salud conservan su contrato público/operativo. El guard local y el transporte next-start loopback permanecen separados; no se abre ninguna URL remota por fallback.

Pruebas:4FAIL→4probePASS;52controles de admisión/integración/entorno/AuthGate PASS, sin saltos/reintentos. Los nuevos casos cubren páginas, APIs con terminación de imagen, ausencia de SDK, cabeceras y rutas públicas/salud. Lintdirigido, tipos ybuild44PASS. Evidencia work/unit14-*.log y unit14-disabled-admission-probe.mjs.

La prueba usa puertoSDK controlado; no es routing/AuthDB hospedado. El CLI real se registra por su SHA propio, no se hereda. Cohorte autorizada no proporcionada; flags reales sin configurar, manifiestoW5 y revisiónW4 independiente pendientes. No modificaciones de hosting, SQL alojado, seguridadStorage, main o resellpro. ReleaseNOT_ACCEPTED.
