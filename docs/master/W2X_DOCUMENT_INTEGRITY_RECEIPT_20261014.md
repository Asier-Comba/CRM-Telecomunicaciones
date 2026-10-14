# Integridad documental: recuperar una respuesta ilegible

CLAIM W2-X #67 /6165347515. Base dbcdb15b221518117078f6b73d446d8b33643c0c.

## Problema y corrección

DocumentIntegrity descartaba su intención pendiente cuando un recibo de descarga o verificación no superaba el validador. La verificación podía haber avanzado versión y auditoría; repetir con otro command_id producía un intento distinto. La reproducción original alcanza el error en el panel real y falla porque falta el botón de recuperación exacta.

Se conserva la intención también para internal_safe, igual que transport_uncertain. Se reutilizan command_id, ticket, cuerpo y versión originales; un recibo confirmado evita volver a verificar cuando falla la lectura posterior. Un 403 confirmado sigue liberando el intento. Contratos, backend, Storage, permisos y servicios no cambian.

## Evidencia propia

37 pruebas de navegador HTTP controlado PASS:21 nuevas (descarga/verificación, recibo inválido/transporte/403, lectura posterior fallida;390/768/1440) y16 regresiones de archivo/restauración/limpieza. Componentes, repositorio y validadores reales; respuestas y persistencia simuladas. Los positivos verifican un ticket, un efecto de verificación, versión2 y repetición idéntica del comando; después de recibo confirmado solo se repite lectura. No equivale a Auth/DB/Storage real ni modelo vivo: NOT_RUN; API0.

El intento inicial quedó incompleto en17/37 tras interrupción de sesión, sin resultado ni proceso activo. Se conserva, junto a la reproducción causal original, y la ejecución de recuperación usa registros y capturas distintos. No se heredan resultados de otros SHAs.

Tres capturas verify-invalid realmente inspeccionadas en390/768/1440: mensaje y reintento legibles, botón completo en pantalla, sin overflow horizontal. La revisión es parcial; no acredita accesibilidad completa ni el cierre del panel durante incertidumbre, pendiente de unidad propia.

La compilación y lint se registran en el checkpoint de este commit. No se promociona aceptación individual/global. PR1537F sigue fallida; HIGH5/W4/ACK principal pendientes, IA writesOFF, issue10OPEN, releaseNOT_ACCEPTED. Fallos históricos F736/B9 y solicitudes6162715998/6162753210 conservan su alcance.
