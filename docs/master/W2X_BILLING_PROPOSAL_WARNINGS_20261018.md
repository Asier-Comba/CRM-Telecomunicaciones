# Propuesta integrada: conservar avisos de procedencia en su editor

CLAIM6252266133. Base `a82920d0642236769b4407ab138dda1dafd6f410`; rama propia `codex/w2x-billing-proposal-warnings-20261018`.

Original: **dos fallos y un caso correcto en39,2s**. El callback integrado conserva el borrador del parser pero descarta warnings/missingFields. No aparece el aviso de IVA incluido ni el de importe no detectado; la propuesta ordinaria pasa. Se conserva log/exit1. No hay comandos de guardado en el banco nuevo ni reproducción de escrituraSQL incorrecta.

Se reutiliza la prop `warnings` existente del InvoiceEditor. Un snapshot asocia los avisos a la referencia del formulario de esa propuesta; solo se proyectan cuando coincide con el editor actual. Al abrir un nuevo borrador manual, el snapshot anterior deja de coincidir. No se añade efecto, temporizador, cálculo o mecanismo de autoridad. Se guarda procedencia, sin clonar ni sincronizar los campos editados. El setter queda detrás de los controles existentes de montaje/solicitud vigente. Revertir las tres inserciones devuelve exactamente el archivo padre; parser, importe de borrador, validaciones, recibos, comandos, CAS, editor y su presentación de avisos permanecen intactos.

Controles propios: **99/99 navegador en2,2min y49/49 funcionales en951,7612ms**. Dieciocho nuevos: IVA incluido/importe no detectado/ordinaria, editor actual/nuevo borrador posterior,390/768/1440. Incluido conserva base100 de texto121; importe no detectado muestra su aviso con el valor de borrador existente, sin modificar el parser. Nuevo borrador no reutiliza los avisos anteriores; ordinaria no recibe avisos inventados. Revisión manual sigue desmarcada/Guardar disabled y no hay comandos. Las81regresiones cubren contexto, fecha, revisión, previsión exacta y guardado manual totalcero. Build66, lint/scan/diff/cola/publicación propios se registran en checkpoint. No se heredan resultados del global1755.

## Capturas realmente vistas

- warnings-included-new-draft-390.png — SHA256 7820ecebe70933d453ce5a6de34cd32767426755b10f20954292d1de495339de
- warnings-missing-new-draft-1440.png — SHA256 74150641472937531056128099ee66750a59dd6ca0650158fef98d79f8c1c192
- warnings-missing-current-390.png — SHA256 6e6f15c5558a4c68f2264dff39b3aef88fcd66a0f28ed7b330f57e5e8451301b
- warnings-included-current-1440.png — SHA256 6b6e6d66c8dec7c4b9b74d502cfd4cd8b0d6c7c23b3bcc4973bffa82f2f7b68e
- warnings-missing-current-1440.png — SHA256 d44100edc80acf988e42518645833f48bb15bf363bebfebca1e72dc880e42a24
- warnings-included-current-768.png — SHA256 6bb9611350892ff3209092129dea7bf5f0c45999c71889889cb8fc6b1fd28f6d
- warnings-included-current-390.png — SHA256 06d2cb4e72dc854a5243e19f8d1d2372a17d2212ff08b05dc867a02123edf94e
- warnings-missing-current-768.png — SHA256 5a99a9a6963dfe83efa916b5ad23edd1be2bb06fc75fc7c583dd5d4e1e62cefc

Ocho capturas superiores: avisos incluido/importe no detectado en390/768/1440, nuevo borrador tras incluido390 y tras importe no detectado1440. Avisos y zona superior de cliente/fechas/divisa/emisor/vínculos legibles; el nuevo borrador deja libre el lugar esperado del aviso anterior. Conceptos, importes, totales, revisión y acciones inferiores mayormente fuera de pantalla, sin aceptación visual completa. Fixture excluido; el banco HTTP verifica campos y ausencia de comandos por separado.

Componentes/repositorio/parsers reales; HTTP/DTO sintético. AuthDB/JWT/RLS/Next integrado/modelo vivo NOT_RUN/API0. Matriz342/27PARTIAL/315sinreconciliar/0READY; cincoHIGH/W4 pendientes, IA writesOFF, issue10OPEN, releaseNOT_ACCEPTED. Global1755fuente64 activo único y sin esta corrección ni18casos nuevos;su checkpoint conserva el fallo posterior de avisos medido sobre64. F736/B9/981/1266 y originales de fixture/preparación preservados. Fuentes ajenas/W3/W4/W5/recurso nativo intactos. Próxima tarea: reconciliación individual del parser determinista con fuentes/evidencias exactas y regresión agrupada1773/102 sobre65 solo después de1755terminal/publicado, sin duplicación ni herencia.
