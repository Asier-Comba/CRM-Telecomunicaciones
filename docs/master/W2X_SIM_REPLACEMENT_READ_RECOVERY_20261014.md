# SIM/eSIM: recuperar lectura de sustituciones

CLAIM W2-X #67 /6164978509. Base282f2e1efb8d38d9d06682060ae80bd2d8042434.

## Defecto reproducido y cambio

ReplacementSelect deshabilitaba el selector y la navegación cuando fallaba sim.list, sin ofrecer una nueva lectura. La reproducción causal alcanza la SIM activa autorizada y el error del selector, y falla porque no existe Reintentar SIM de sustitución.

Una revisión local de consulta permite reintentar/actualizar la misma página conservando customer_id, operator_id, prepared/manual, límite20 y cursor. El estado de carga oculta datos de una consulta previa y bloquea nuevas recargas hasta terminar. El efecto existente descarta respuestas antiguas al desmontar o cambiar la clave. No se crea servicio ni cambia contrato, permisos, runtime o comandos.

## Fallos conservados

El primer fixture usó asteriscos en vez de la máscara cerrada de cuatro puntos y tres dígitos; el parser rechazó correctamente antes del editor. La primera suite corregida expuso otro fallo del fixture: next_id no nulo con una sola fila y limit20. El contrato exige20filas para continuar; el fixture se corrige a20más una página terminal, sin relajar el validador. Estos fallos no son la reproducción causal del selector.

El build de checkout6 falla porque node_modules es un junction fuera de la raízTurbopack. El mismo componente se verifica en checkout15 con dependencias físicas y configuración original. El log fallido se conserva; no se modifica next.config ni el paquete para ocultarlo.

## Alcance de verificación

Pruebas nuevas de primera y segunda página, transporte/503/403 en390/768/1440. Verifican consulta idéntica, conservación de selección previa al cambiar de página, recuperación positiva, denegación persistente, ausencia de comandos y acceso a la confirmación de sustitución sin ejecutarla. Regresiones de recursoSIM/incidencia existentes acompañan la unidad. Resultado propio24PASS (18 nuevas y6regresiones), lint y build66 PASS. Los logs y hashes se registran en checkpoint; build físico verifica los mismos blobs de producto/pruebas. La suite previa15FAIL/9PASS queda preservada por fixture inválido, no se reemplaza su resultado.

Navegador/componentes/repositorio/validadores reales con HTTP controlado. Auth/DB y modelo vivo NOT_RUN. Revisión React aplicada: contador funcional, clave estable de consulta, limpieza de efecto, sin nuevas dependencias o abstracciones; controles de carga/error y botón semántico accesible.

CincoHIGH, W4, ACK principal y REQUEST6162715998/6162753210 pendientes. PR1537F conserva fallos. WritesOFF, issue10OPEN, releaseNOT_ACCEPTED; ninguna promoción de matriz.

## Visual parcial inspeccionada

Tres capturas390/768/1440 de error503 y botón de recuperación realmente revisadas. En móvil muestra la zona superior hasta el reintento, no la pantalla completa. Sin overflow horizontal; selección bloqueada mientras no hay lectura válida. No aceptación de todos los estados, Auth o accesibilidad integral.

- sim-replacement-first-server-1440.png: SHA256 `a3c687bdb6e563c87ea0313691a6ed82da2c97297a1dca829a635fece34009f5`.
- sim-replacement-first-server-390.png: SHA256 `490400d5c847f83953e2a1de342192fde8057b1a6e045c48270dd9951015c106`.
- sim-replacement-first-server-768.png: SHA256 `c0b169b102a5625115568f45cc1f0fbb0f949e518139e5c1f3a358b7a11890e7`.
