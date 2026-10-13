# W3 — Un único presupuesto temporal para preparación documental

Antes, cada espera de autorización/resolución/descarga/extracción disponía de
10s nuevos. Negativos sobre623: descarga6s+extracción6s podía admitir a12s;
autorización6s dejaba descarga hasta16s y no propagaba señal propia. Tres fallos
sintéticos conservados, mediante relojes controlados de Node, no modelo ni DB.

Ahora preparación tiene un único controlador/plazo10s para todo el recorrido.
Propaga la señal a resolver, downloader y extractor; mantiene callbacks fijados
y this original, reautoriza en cada fase y verifica versión/opt-in/hash. Antes y
después de cada espera comprueba reloj monotónico; antes de publicar el handle
comprueba el plazo otra vez. Expiración/cancelación devuelve unavailable/null,
sin material parcial. Finally retira listener/timer en todos los resultados.

No se puede interrumpir código JavaScript sincrónico que bloquee el event loop;
se rechaza su resultado tardío al devolver control. El worker PDF real sigue
siendo el proceso fijo opcional con SIGKILL observado/cancelación y sus propios
límites. No cambia extracción/chunks/permisos ni activa Storage/index/modelo.

16 pruebas de admisión, incluyendo los tres controles nuevos, cancelación,
revocación, high-bit header, privacidad, Unicode, bounds y callbacks fijados.
La nueva fuente requiere1256 (543+713)/334/native85_320+ambos ledger13/Supabase107.
El probe PDF-quote real local se ejecuta con los módulos de admisión/retrieval de
esta fuente; authority/download siguen sintéticos. No se heredan1253/107 de623.

Fuentes/recursos W4/W5 intactos, IA writes OFF, modelo vivo NOT_RUN, cincoHIGH
FAIL, Windows538/543 con5fail y probe canónico conservados, full23/reinicio/
Auth-Storage RAG/ledger presupuestario pendientes y release NOT_ACCEPTED.

Relojes de pruebas: documentación oficial Node24
https://nodejs.org/docs/latest-v24.x/api/test.html#class-mocktimers.
