# W3: firma PDF comprobada byte a byte

El padre `b6336e8fadf20247ba23f22bc653a7868153dd53` comprobaba `%PDF-` después de decodificar ASCII. El runtime observado elimina el bit alto en esa conversión: la primera variante sintética con cabecera distinta, tamaño y SHA256 coincidentes con su metadata aprobada producía un handle `prepared` y llegaba al adaptador de extracción. La regresión previa FAIL queda conservada.

La preparación documental ahora compara los cinco bytes exactos, además del tamaño y digest existentes, antes de llamar al extractor. Una regresión recorre las31 combinaciones de bits altos en esos cinco bytes: todas devuelven `invalid_source`, handle nulo y cero llamadas de extracción. Las fuentes con la firma exacta mantienen los controles existentes de autorización, revisión explícita, versión, hash, cancelación y revocación.

Verificación local:11 pruebas de preparación documental y643 pruebas del asistente PASS; tipado estricto focalizado y lint PASS. Bytes, documento y adaptadores sintéticos; no PDF real extraído, Auth/Storage real documental, embedding, índice, búsqueda ni modelo ejecutados. La firma exacta no valida la estructura completa de un PDF ni certifica contenido seguro; esa responsabilidad del extractor configurado sigue pendiente. RAG operativo NOT_TESTED.

Los controles propios de cada SHA son obligatorios antes de su composición; el fallo anterior no se convierte en PASS. No cambia permisos, schemas, planner, W4/W5 ni activa llamadas externas. IA writes OFF; release NOT_ACCEPTED.
