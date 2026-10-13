# Runtime CI del extractor PDF existente

W5, 2026-10-13. Base propia: PR144, fuente d7ed68e0efb34438236dd617727b6f7b066a3110.

Esta unidad ejecuta sin modificaciones el worker Python, adaptador protegido, generador sintético y verificador físico existentes de W3. No crea un segundo extractor ni cambia admisión documental, permisos o lógica comercial.

Python 3.12.14 coincide con el runtime local y está disponible en el manifiesto oficial de actions/python-versions. actions/setup-python v6.0.0 se fija al commit e797f83bcb11b83ae66e0230d6156d7c80228e7c. pypdf 6.10.0 se instala en un entorno temporal privado con --require-hashes, --no-deps y --only-binary; hash del wheel oficial: 90005e959e1596c6e6c84c8b0ad383285b3e17011751cedd17f2ce8fcdfc86de.

Referencias primarias: https://pypi.org/pypi/pypdf/6.10.0/json ; https://github.com/actions/setup-python/tree/e797f83bcb11b83ae66e0230d6156d7c80228e7c ; https://github.com/actions/python-versions/blob/main/versions-manifest.json .

Validación local física: PASS, PDF sintético de 1013 bytes/dos páginas/dos chunks; texto largo, cifrado, malformado, límites de páginas/texto y cancelación del proceso propio por SIGKILL. No se imprime texto extraído. El informe de CI incluye el SHA real del checkout; todavía requiere su propia ejecución, sin heredar PASS de PR144.

Límites explícitos: la descarga/autorización de esta prueba es sintética; Auth/Storage reales NOT_RUN, index/retrieval NOT_IMPLEMENTED, modelo real NOT_RUN, IA comercial OFF y release NOT_ACCEPTED. No se usan claves, bases de datos, cuentas externas ni presupuestos OpenAI. Los hallazgos de seguridad de PR144 siguen abiertos. Requiere revisión independiente; W5 no se autoaprueba.
