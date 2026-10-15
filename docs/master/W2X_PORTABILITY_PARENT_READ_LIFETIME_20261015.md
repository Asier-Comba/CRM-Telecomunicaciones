# W2-X · Portabilidad: retirar lectura inicial antes de consultar relaciones ·15/10/2026

CLAIM6200377934. Base originala4ef01b90025614ff5e42cff10225e9b5bc11e1f, propia102PASS. Antes del banco final se incorpora fuente15 publicada por avance directo; SHA padre exacto en checkpoint.

Original: portability.getA pendiente, abrirB y liberarA. El consumidor inicia line.listA y consulta de clienteA después de retirarA; aserción línea esperado0/observado1 FAIL, positivo vigente PASS52.8s en la misma ejecución. Logs y consultas completas conservados. No demuestra acceso SQL ni permiso real cruzado.

La carga inicial pasa su vigencia al read privado. Tras portability.get se comprueba vigencia antes de readLineContext/cliente y otra vez antes de devolver estado. El refresco mantiene su comportamiento con callback predeterminado y valida que hay valor antes de mostrarlo; no se certifica postcomando por esta unidad. No se modifica readLineContext compartido, backend, comandos, DTO ni primitivas.

Banco previsto36:15 propios referencia/empresa/actor/lector/vigente por390/768/1440 y21 de composición servicio/scope comercial. Cuando el nuevo contexto conserva IDs se espera la cabecera actual con cliente/operadores y se miden deltas reales de consultas; no se fabrican ceros totales. Los registros permanecen sintéticos con transporte HTTP controlado y parsers/componentes de producción.

Fases internas de readLineContext después de iniciarse, recuperación postcomando, AuthDB/Storage/modelo y aceptación W4 no acreditados. Capturas y resultados reales en checkpoint; visual pendiente hasta inspección. HIGH5/IAwritesOFF/issue10OPEN/releaseNOT_ACCEPTED. Sin fuentes38/142/153/main/W3/W4/W5 ni recursos.
