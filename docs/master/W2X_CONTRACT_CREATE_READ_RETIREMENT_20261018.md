# Contratos: retirar la lectura dependiente al desmontar el formulario

CLAIM 6254662742. Rama `codex/w2x-contract-create-read-retirement-20261018`, desde `e7bc18e3f6d0ca0d18d966e99bae0f4571946314`.

Al cambiar cliente, empresa, actor o rol mientras se recibía una creación, el formulario anterior iniciaba una consulta del contrato después de desmontarse. La reproducción original dejó **4 fallos y 1 positivo en 48,6 s**. Se conservan el log, el código de salida, el banco y las cinco observaciones. Todos tenían cero lecturas antes del recibo y una después, un comando, un efecto sintético y ningún error de página.

Una referencia local registra el montaje y desmontaje del formulario. La continuación la consulta antes de iniciar la lectura dependiente. Se conserva el efecto de la creación; no se cancela una consulta ya emitida. No se cambia el servicio, el comando, SQL ni las reglas de autoridad. La reversión exacta devuelve el producto y la extensión del fixture al padre. El banco final es idéntico al causal.

**156 passed (3.7m) propios**: 15 casos nuevos y 141 regresiones. Los doce contextos retirados no inician la consulta; los tres actuales consultan una vez y muestran el enlace al ID exacto. Cada caso conserva un comando y un efecto sintético. Compilación: 66 rutas; lint, scan, diff, cola y bundle se verifican antes de publicar. Funcionales: `NOT_RUN_UI_COMPONENT_LIFETIME_BEFORE_DEPENDENT_READ`.

## Evidencia visual y límites

Quince capturas revisadas a 390, 768 y 1440 píxeles: inventarios vacíos declarados en los contextos retirados y estado/enlace registrado en el actual. No hay filas reales ejercitadas. Los controles del fixture no son interfaz comercial. La entrada reutiliza el servidor HTTP existente y los componentes, repositorio y parsers reales; no duplica el recurso W5.

El cambio de ámbito simula el desmontaje por las claves del Provider. No acredita revocación real, Auth/DB/JWT/RLS/SQL, Next integrado, ausencia o quiescencia nativa, reinicio, handler ni full23. No se ejercitan peticiones ya emitidas. Modelo vivo: NOT_RUN; llamadas de pago: 0. Las mediciones de peticiones cliente no representan los cinco campos no medidos ni efectos SQL.

El primer registrador de evidencias buscaba un nombre de carpeta sin la abreviatura que aplica Playwright. Falló antes de modificar el checkpoint o crear el documento. Las quince capturas estaban intactas; se corrigió únicamente la búsqueda para obtener las observaciones desde sus carpetas. Se conserva el registrador original y el fallo de preparación. No se repitieron pruebas.

## Continuación

1908/source80 y 1968/source84 conservan sus pines. 1968 no contiene las correcciones 85/86 y no puede acreditarlas. La colección coalescida preparada contiene 2007 pruebas en 116 archivos; solo se solicitará tras esta publicación y 1968 terminal/PUBLISHED/PASS. 1992 quedó preparado sin ejecución.

Matriz: 342 requisitos, 31 PARTIAL, 311 sin reconciliar y 0 READY. Cinco HIGH y revisión W4 pendientes; IA comercial writes OFF, issue10 OPEN, release NOT_ACCEPTED. F736/B9 y las evidencias anteriores mantienen su alcance. Consumo en principal pendiente de ACK exacto independiente. Main, PR38/142/153 y las fuentes W3/W4/W5 permanecen intactas.

- contract-retirement-reference-768.png — SHA256 cd43c953fb523bbb34d75ec0a89ddc3c7e6e7824dad1e604a50c034c746a3e9f
- contract-retirement-actor-1440.png — SHA256 8808e934d3df571f561dee4612add118a5dde405feb1801ce172f46ee0976949
- contract-retirement-viewer-1440.png — SHA256 ba0f04b16937f0d21be6731058e3e6d025e09d1513f2d2fb65b2199008d597e6
- contract-retirement-current-768.png — SHA256 ca40c2d6e748fea15b6c784fd224beb39dd86faf8d11c726939b95e65682d185
- contract-retirement-reference-390.png — SHA256 778df32dc27014e67e113a1633a9cd9e8f1af2f1e70b4274ba41c6a1a69c8df1
- contract-retirement-company-768.png — SHA256 401804be83e0c70d18a3daa61bad01dd1d83c83e7a07558bbfa2a7055ac39209
- contract-retirement-viewer-768.png — SHA256 d3fd23d110d03552c1cadde3c35d04d43ef3ef6803ab9177b23e9a71abad2722
- contract-retirement-actor-390.png — SHA256 7314acb5f66d6837d983cb76b21f5a07e03e1fcabd52381b554fe81626c419c1
- contract-retirement-actor-768.png — SHA256 8f7dad11d50d03b4bf71bd900b8b57143bdf4aa114c87025b0bc578dbc656817
- contract-retirement-current-390.png — SHA256 d134b4814f0a78924d21242f52344d0f2c8721f65d3cc43222371ff76021a9a1
- contract-retirement-company-1440.png — SHA256 ff790a3e22bcbf7cbe188076a44e22cf587e824e9af9bc36f18e3664b3d53c2e
- contract-retirement-reference-1440.png — SHA256 9ea553e705887bc30aa772a445f1eda9ec0b3639cae403107ae14a08e239de13
- contract-retirement-viewer-390.png — SHA256 c4573bd291b9620adddb201da33401e1d512395309b1ae3606cc4385c6b42d3a
- contract-retirement-company-390.png — SHA256 0c045809ecf51f14b8b98a3239a82570b81f42ab19112094bc82e646b014a1c8
- contract-retirement-current-1440.png — SHA256 4b8aaff62b96a0be1642db6a94a93f5263963ffa616bd3027bff43d41f6e0177
