# Integridad documental: conservar el intento al cerrar el panel

CLAIM W2-X #67 /6165613407. Base61dff0ab46ea8ff86023ecce120b0654f2096960.

## Defecto reproducido

El panel de metadatos permitía cerrar con una verificación en curso o incierta. DocumentIntegrity guardaba la intención en un ref local; desmontarlo perdía UUID, ticket y versión de recuperación. La reproducción con respuesta HTTP retenida falla porque Cerrar panel está habilitado. El log original y la captura se conservan; no se sustituyen por el resultado corregido.

## Corrección

El panel posee su bloqueo de cierre y recibe el estado pendiente del componente de integridad. Se bloquean botón, Escape y fondo mientras hay petición activa o intención recuperable; el mismo comando continúa mediante Reintentar comprobación exacta. Éxito o denegación explícita sin recibo pendiente liberan el cierre.

La instancia del panel se identifica por actor, espacio, rol, destino y documento. Un cambio de contexto o retirada de selección desmonta el panel y su bloqueo; una respuesta tardía de esa instancia no bloquea la siguiente. El hook existente conserva sus reglas de retirada de datos. No se cambia autorización de backend, Storage, contratos ni servicios.

## Verificación propia

- 49 pruebas HTTP controlado PASS:21 escenarios de integridad con cierre/petición retenida/reintento/403/lectura posterior,12 regresiones de selección vigente y16 de archivo/restauración/limpieza.
- 9 pruebas adicionales PASS: cambio de empresa, actor y rol a lector en390/768/1440 después de respuesta incierta; desaparece el panel anterior, no se repite el comando y el nuevo panel no hereda bloqueo.

Los nueve casos se añadieron en un archivo separado después de terminar49, sin cambiar los blobs de producto ni los tests ya ejecutados. Lint y compilación66 PASS de los cambios de producto; lint adicional y typecheck final constan en checkpoint. No repetición de verdes sin cambio ni resultados heredados de otro commit.

Navegador, componentes, repositorio y validadores reales con HTTP y persistencia simulados. No demuestra Auth/RLS/DB/Storage reales: NOT_RUN. El cambio de contexto es un evento sintético externo, no una gestión real de usuarios.

Tres capturas verify-invalid inspeccionadas en390/768/1440: cierre deshabilitado, reintento visible y completo, contenido legible y sin overflow horizontal. Revisión visual parcial, no aceptación integral ni auditoría completa de accesibilidad.

La revisión React conserva estado local por identidad, eventos explícitos y el Drawer existente; sin efectos nuevos, dependencias ni infraestructura duplicada. Fallo de preparación de pruebas de contexto (aserción antes de escribir archivo) separado de reproducción causal.

HIGH5/W4/ACK principal pendientes; writesOFF, modeloNOT_RUN/API0, issue10OPEN, releaseNOT_ACCEPTED. PR1537F y fallos históricos permanecen visibles. Siguiente unidad: composición propia con Agenda/SIM una vez terminen sus controles activos.
