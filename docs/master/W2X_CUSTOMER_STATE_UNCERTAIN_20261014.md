# W2-X — confirmar archivo/restauración tras respuesta perdida

CLAIM issue67 comentario6157869961, precisión6157927433. Rama propia codex/w2x-customer-state-uncertain-20261014 desde9c361 cualificada. HeadF79 dePR153 no se modifica durante sus checks.

El diálogo de archivo/restauración permitía cancelar y borraba archiveIntent después de transport_uncertain. La reproducción sobre base hace desaparecer la confirmación tras pulsar Cancelar, perdiendo la misma intención. Al repetir con un identificador nuevo y versión anterior podía producirse conflicto, aunque el efecto original ya existiese.

Ahora la incertidumbre mantiene el diálogo, deshabilita cancelar/cerrar, protege Escape y ofrece Reintentar la misma acción. Se conserva el mismo comando y, al recibir confirmación, se vuelve a leer el cliente. El cierre normal antes de una acción incierta sigue disponible. Se reutiliza cancelDisabled de ConfirmDialog existente, sin otra primitiva ni cambios de SQL/RPC/roles.

Chromium6/6: archive/restore ×390/768/1440, efecto controlado con respuesta perdida, intento de Cancelar/Escape protegido, dos peticiones idénticas/un efecto simulado, estado posterior y cancelación normal del diálogo siguiente. Typecheck/lint pasan; captura de archivo incierto inspeccionada en tres anchuras. Componente/repositorio/parsers reales, HTTP controlado, no AuthDB.

El check AuthDB existente customer_archive_restore_persist conserva archivo/restauración, lecturas, reloads y nombre final; ahora pierde la respuesta después de cada efecto real y exige replayigual/comando1/audit1. Status de primera respuesta registrado y cualquierno200 falla dentro de check; no excepción lanzada desde callback de interceptación. Esta ejecución física está PENDING hasta nueva unión propia; no se heredan108 de base ni109previstos deF79, sin aumentar/relajar timeout o aserciones.

No garantía nueva para recarga/cierre del ordenador. La entrega se publica independiente y se compondrá en la PR153 existente después de sus controles terminales, sin otraPR ni push sobre checks activos. PrincipalPR38 soloACK exacto; IA writesOFF/issue10OPEN/cincoHIGH/W4/full23/staging/modelo/release pendientes.
