# Portabilidades: cierre del panel durante recuperación

CLAIM 6254841221. Rama `codex/w2x-portability-recovery-close-20261018`, desde `6ab61afddbf4a56b931cb54a1a98609ff7e295d4`.

La reproducción original dejó **seis fallos y dos positivos en 1,5 minutos**, en entradas y salidas a390px. Durante incertidumbre o lectura fallida, X estaba habilitada aunque no podía cerrar. Tras una denegación, cancelar la revisión dejaba X habilitada pero sin efecto. Los dos positivos de revisión/cancelación normal pasaban. Se conservan el log, exit, banco y ocho observaciones; los casos incierto/lectura fallida tenían un comando y un efecto sintético, denegación un comando y cero efectos, revisión cero comandos y efectos. No hubo errores de página.

El panel consume la política existente `closeBlocked` tanto en `closeDisabled` como en su guardia de cierre. No cambia el hook compartido, `locked`, las órdenes, lecturas, servicios, parsers o SQL. No se rehace una primitiva. La reversión exacta devuelve el padre; el banco final es idéntico al causal.

**177 passed (5.3m) propios:**24 casos nuevos y153 regresiones. Los cuatro modos cubren entrada/salida a390/768/1440. Incertidumbre repite la misma orden, conservando un efecto sintético. Recibo confirmado más503 reintenta solo la lectura:un comando,dos GET al ID exacto. Denegación permite salir y reabrir con nuevo command_id; cero efectos antes y uno tras la nueva confirmación. Cancelar revisión no envía orden. Se conservan línea,número enmascarado,dirección,operadores y fecha. Compilación66,lint,scan,diff,cola ybundle se verifican antes de publicar. Funcionales:NOT_RUN_EXISTING_CONTROL_POLICY_CONSUMPTION.

## Evidencia visual parcial

Dieciséis capturas revisadas:las doce recuperaciones críticas(incertidumbre/lectura fallida,en ambas direcciones y tres anchos),más revisión y denegación en entrada390 y salida1440. El cierre del panel padre bajo el diálogo se verifica también por DOM; su apariencia desenfocada no acredita todo el panel. En lectura fallida móvil, la identidad y el inicio de la selección quedan fuera del área desplazada; en escritorio, el mensaje de error queda bajo el viewport, aunque se ven el estado registrado y la acción de relectura. Cantidades, filas y números enmascarados del fixture son declarados,no datos reales o mediciones SQL. Los controles externos del fixture no son interfaz comercial.

HTTP/DTO y efectos sintéticos con componentes, repositorio y parsers reales. AuthDB/JWT/RLS/SQL/Nextintegrado/modelo vivo:NOT_RUN;API0. No ausencia/quiescencia nativa,reinicio,handler o full23. No aceptación integral de portabilidades,roles,privacidad o seguridad W4.

Global1968/source84 y waiter2007/source86 conservan sus pines; ninguno contiene este cambio87. No resultados heredados. Matriz342/31PARTIAL/311sinreconciliar/0READY;cinco HIGH y W4 pendientes,IA comercial writes OFF,issue10 OPEN,release NOT_ACCEPTED. F736/B9 y evidencias anteriores conservan su alcance. Consumo principal pendiente de ACK exacto;main,PR38/142/153 y fuentesW3/W4/W5 intactas.

- portability-recovery-outbound-review-1440.png — SHA256 409744fa51ee00be882a3112acf010c011394b3e32d2db28635b60e4e2b3db86
- portability-recovery-outbound-denied-1440.png — SHA256 59dc5cd0bc25017ef496e01c0e84efa614c1192822a1b5ec82d1f1d02db901df
- portability-recovery-inbound-uncertain-390.png — SHA256 06bdee2f982b63d44c7d1185b5e5e1f5166829e6daa7f1ecb05d5c80a28a7a41
- portability-recovery-inbound-uncertain-1440.png — SHA256 a1896aac4348f363e3791261d2a840733f8f57b22799477d1fbec99b57ceda03
- portability-recovery-outbound-uncertain-390.png — SHA256 692a33331ed68d22102dba79d6838826684c00ad48b816e21c2fcbffe7f89a2c
- portability-recovery-inbound-read_failed-1440.png — SHA256 2b00c13ae240ccb7e2d1a2ea61d6faa6036e94e19f987f3e50a0e28c606ac18a
- portability-recovery-outbound-uncertain-1440.png — SHA256 4431aebde4c01ad19d98da8d1fd58447e1a92f01fe22e61daea849f7b8e6cd09
- portability-recovery-inbound-read_failed-390.png — SHA256 3ed988e70587d5c3b9bd4ccd53c6e37637a93f85012e4229e376d029771b8fdc
- portability-recovery-inbound-read_failed-768.png — SHA256 fd4f2cf5750929c5f21651c54260d169b02c6a38ec556b074bed59b22f008cee
- portability-recovery-outbound-read_failed-1440.png — SHA256 3a56ac1da3da115ea6b6141d1ab9b1249cb6e5a65ac7ccb432dbe59a1c8d7a7b
- portability-recovery-inbound-denied-390.png — SHA256 863981ab01d312dece8ea05dfbe48cda011d2332d7958b44d7d7e444561ea9ae
- portability-recovery-inbound-uncertain-768.png — SHA256 79e90160e527e38f1d512195f391504ed14c68ec3a1d8eec42138e7e1b3d16e2
- portability-recovery-outbound-uncertain-768.png — SHA256 3a118ba83f952aee64fc51bba6e674d238b4afc2e93af56c45b28b1b4bf77b6b
- portability-recovery-inbound-review-390.png — SHA256 dd9c5b984f16418500133ac4dcbacfb64e321eaf868157b245111250c5892493
- portability-recovery-outbound-read_failed-390.png — SHA256 6f061b0add76093a1254ad868f599e5c03a1df4bfa214d8021a62c6e45941029
- portability-recovery-outbound-read_failed-768.png — SHA256 8af0a2cc9704b9c2d62f2067baaa3220cf82bdeeab159806151693c8ad107f38
