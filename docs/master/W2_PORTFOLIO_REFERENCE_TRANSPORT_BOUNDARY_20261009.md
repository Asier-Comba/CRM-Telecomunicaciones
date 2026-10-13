# Lectura actual antes de comprobar la apertura de contrato

W5 #92, fuente035de4cdaa0b2c14916d8b4f6665f5311e987d61, ejecutado
f5d9696e0984caa63c1ede3409a3c4e9062292c0/árbolce6a54e982a6f884cbdb6e95814a813ee2cfa634,
terminó Supabase37956588534/job113908530775 FAILURE106/107. Falló
`desktop_tablet_mobile_layouts`, fase`layout:portfolio:390:exact_reference`,
TIMEOUT. La captura real muestra contratos cargando y ningún panel abierto.
No acredita por sí sola cuánto tardó la lectura ni una causa del servidor.

Los blobs IntegratedPortfolio, repository y portfolio-runtime de ese candidato
y la fuente W2 actual18472b4 son idénticos. La navegación por referencia inicia
`portfolio.get` y sólo abre el panel después de recibir y validar el contrato.
La comprobación anterior empezaba el límite de render5s mientras esa lectura
ordinaria seguía pendiente, aunque el repositorio permite15s de transporte y
la página conserva30s. No demuestra una latencia exacta del run W5 original.

Se reprodujo ese mecanismo en Chromium390 con IntegratedPortfolio,
PortfolioEditor, Drawer nativo, React19, repository.post/portfolio y parsers
cerrados reales. Se usaron adaptadores explícitos de presentación/identidad y
HTTP en memoria, sin Auth ni SQL. Una lectura válida demorando6500ms hace
fallar la aserción anterior a5091ms. El helper correlacionado recibe y valida
esa misma lectura y después pasa las mismas comprobaciones de apertura,
cierre y artículo a6861ms. Cuatro lecturas,0comandos,0pageerrors. HTTP503 y DTO
con identidad ajena se rechazan y no abren panel; la UI real muestra error.

El helper inicia un documento fresco, identifica exclusivamente el nuevo POST
de origen/ruta/operación/kind/id exactos y valida HTTP200, envelope cerrado y
DTO actual mediante parsePortfolioGetV1 antes de las aserciones existentes.
Conserva la fase original y añade pasos cerrados sin IDs/contenido en reportes.
No reintenta, escribe, simula éxito ni cambia5s/15s/30s o el conjunto de checks.
No modifica producto, API, backend, contratos, RLS, IA, datos ni infraestructura
W5. Se publica como candidato W2 independiente; no se altera la rama W5.

Requiere su propio gate completo107/107 SUCCESS y revisión de capturas de
cartera antes de consumo. El107 de fuentes anteriores no acredita este árbol.
Los fallos anteriores se conservan. #29/#10/W4/Windows persistente/semántica
viva/comercial siguen pendientes, escrituras IA de negocio OFF.
