# Cierre observado de la sesión nativa — W2

La sesión existente podía devolver cierre correcto al leer exitCode o al
agotarse sus2s, sin observar el evento close. Además, en el cierre idle ya se
marcaba closed antes del watchdog; stop no solicitaba entonces la terminación
del backend propio. Dos pruebas negativas lo reproducen sobre el código anterior.

Ahora el cierre resuelve exclusivamente después del close observado. El plazo
mantiene2s: solicita una única terminación del backend identificado por nombre
privado/database, mata solo el hijo propio y devuelve NATIVE_SESSION_UNAVAILABLE.
Un close posterior no convierte esa promesa fallida en éxito. Repetir close
devuelve la misma promesa y no reabre la sesión. No cambian framing,30s de query,
límites de datos, SQL, imagen, contenedor, permisos ni fuente W5.

Las nueve pruebas de framing/límites/cancelación/SQL privado/watchdog/cierre
son sintéticas con streams y proceso simulado. El cierre observado de Docker/
psql todavía requiere las pruebas nativas de la fuente propia; no equivale a
ausencia autoritativa del backend o del efecto de negocio. La comprobación
independiente pg_stat_activity y los controles de recurso siguen obligatorios.

Driver parcial: no metadata/export completo de escenarios ni full23. IA
writesOFF; modelo vivoNOT_RUN; releaseNOT_ACCEPTED; aceptación W4 pendiente.
