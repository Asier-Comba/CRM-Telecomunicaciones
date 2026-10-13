# W5: imagen immutable local verificada

REQUEST6153581382. Se evita un pull repetido solo cuando el daemon local permitido inspecciona la referencia immutable original y devuelve exactamente un image IDsha256/linux con RepoDigests que incluye esa referencia exacta. Tags, digests distintos, datos malformados y errores de inspeccion fallan cerrados. Solo la respuesta exacta de imagen ausente permite el pull original con el mismo limite; despues se exige la misma inspeccion. create --pull never impide descarga implicita y el contenedor debe usar el ID admitido.

No mirror/retag/import/load/cachetar/login/secretos ni imagen alternativa. Confianza limitada al daemon local que ya construia el recurso; no evidencia criptografica independiente de archivos importados o de un daemon comprometido. Cada factory conserva contenedor/volumen/nonce/config privada nuevos y teardown propio; nunca borra la imagen compartida. API, SQL, imagen fijada, tiempos y criterios no cambian. Cache caliente reduce pulls redundantes dentro de un daemon; runners nuevos aun requieren primera descarga y no se prueba eliminacion global de cuota.

Negativos propios de imagen/digest/OS/transporte/timeout/malformado y pull con identidad erronea. Prueba nativa conserva reinicio/almacenamiento/dos conexiones existentes y crea segundo recurso aislado desde cache verificada, prohibiendo pull en ese camino y comprobando teardown sin borrar imagen. Se exige CI nueva en fuente exacta, revision independiente W4 y ACK W2 antes de adoptar. No herencia de antiguos PASS ni ausencia/quiescencia/full23/handler.

Documentacion Docker: https://docs.docker.com/reference/cli/docker/image/inspect/ y https://docs.docker.com/reference/cli/docker/container/create/ . IA writesOFF/releaseNOT_ACCEPTED/modeloNOT_RUN/OpenAI0.
