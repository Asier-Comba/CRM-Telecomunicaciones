# W2-X — foco al paginar contactos de Customer360

CLAIM issue67 comentario6157389360. Base cualificada9c361c9ce7e32ba202f0c6e24aacd371c5026e04; rama propia codex/w2x-contact-page-focus-20261014. No se publica encima de controles activos de la uniónPR153/d764.

Al activar la siguiente página con Enter, los controles se deshabilitan durante la consulta y el foco acaba en BODY. La reproducción original en390 registra tagBODY/bodytrue después de cargar20+4 y falla en el estado de página sin foco. Ahora la página cargada o su error recibe foco cuando este se ha perdido. Si el usuario elige otro control durante la carga, se respeta su selección.

Navegador Chromium3/3 en390/768/1440: primera página20, siguiente4, cursor e inputs exactos, retirada de filas durante carga, foco de estado, vuelta sin robar el foco de Añadir, denegación sin filas con foco en alerta y reintento vigente, comandos0 y sin overflow. El probe final registraSPAN/bodyfalse. Capturas cargadas del pie y página inspeccionadas en tres anchuras; no aceptación visual de todos los contactos a la vez. Componente/repositorio/parsers reales con HTTP controlado, no AuthDB.

Typecheck y lint del alcance pasan. El consumidor AuthDB existente `polished_contacts_cursor_settings_assistant_day` conserva petición/cursor/aserciones20+3+20 y añade Enter/foco después de cargar la segunda página; ejecución física de este delta PENDING hasta unión propia y controles nuevos. No se cambian timeout, SQL/RLS, roles, DTOs, lecturas privadas, repositorio o primitivas.

No se heredan108Auth de9c361 ni109previstos de d764. Reproducción negativa y probe originales preservados; PAR042 completa/W4/cincoHIGH/full23/staging/modelo/release pendientes. IA writesOFF/issue10OPEN; integración principal solo con ACK exacto. La entrega se publica como delta independiente para futura composición enPR153 después de terminar sus controles, sin otraPR innecesaria.
