# Coordinación actual — 20/10/2026

| PR | Decisión del integrador | Fuente / revisión |
|---|---|---|
|163|ACK técnico; delta mínimo adoptado|e42→c0; comentario6291754498;45controles propios |
|164|Seis rutas exactas adoptadas;85/86 intactos|a1ab→c324;6291687724;13controles propios; física W5 acotada |
|165|TOML exacto revisado; workflow NO adoptado|07f97;6291641162: gate87, dispatcher, identidad y reproducción abiertos |
|162|Sólo QA y documentación; sin161 duplicado|dcb4→14e3;6291876371;14QA+10Edge, no ejecución cloud |
|166|Revisión de consumo, NO integración/aplicación|6016;6291730618; no aprobación de seguridad,88 pendiente |
|167|Tres blobs producto+locators y después seis callers exactos|a873/e89→8ff/96f;6292522160;51+3controles separados |
|168|Sólo login y verificador|04b3→a219;6292524028;3FAIL→3PASS estáticos |
|169|Dos componentes+controles; helper real-local propio|6d9f→e3c;6292525735 y CLAIM6292366140;48+7, CI nueva pendiente |

W5 conserva loaders/manifiestos, hosting, SQL, Storage, despliegue y rollback.
Oier conserva ejecución QA independiente, sus bancos y reproducciones. Work
compone únicamente en PR156 y no fusiona main ni ramas ajenas.

REQUEST6293211515 concreta ENV_INVENTORY_DRIFT: flag/cohorte faltantes,
AI_PROVIDER/OPENAI_PROJECT_ID sobrantes, consumidores y86→87. El validador W5
no reconoce uuid_csv y acepta sintácticamente wildcard/duplicados/padding,
mientras el parser de aplicación los rechaza. Sin bypass demostrado; W5 debe
cerrar gramática/required_when/targets y negativos, sin regeneración ciega.
CLAIM6293459620 acota la independencia del nuevo recorrido catálogo;
REQUEST6293547120 entrega el fallo móvil de cartera a QA con fuente/capturas,
sin ampliar presupuestos ni atribuir causa por sus etiquetas de carga.

Solicitudes concretas pendientes: W5 cierre de165/manifiesto de entorno y entrega
de deploy/config/build/ventana; acceso legítimo independiente y A/B admitidos;
propietarios identifican revisor independiente disponible y alcance Auth/cohorte/
RLS/Storage. Un job automático, autor o silencio no sustituyen esa revisión.
Las cuentas fuera de cohorte reportadas por W5 no prueban aislamiento entre A/B
admitidos. No modificar cohorte ni compartir sesión personal.

Auditoría20/10 actual: cinco HIGH, todos en nodos dev de la cadena
eslint-config-next16.3.8 → plugin → fast-glob3.3.1 → micromatch4.0.8 → braces3.0.3.
El advisory [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
no publica versión corregida. La sugerencia npm de bajar eslint-config-next14.2.35
no es una actualización compatible con Next16; no se aplica ni se omite el gate.
Esto no certifica ausencia de riesgo en runtime o en historia.

Referencias de plataforma revisadas: [dispatcher GitHub](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch),
[Next/OpenNext Netlify y pinning](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/).
Netlify recomienda autoactualizar el adaptador; el requisito de reproducción exige
decisión/pin o artefacto/versionado efectivo revisado por W5, sin falsa equivalencia.

Históricos preservados: CLI145/474/2f87, workflow5332cancelado, navegación Windows,
arneses dashboard before01/02/after01 y original Oier103PASS/11TIMEOUT. Ninguno se
convierte en PASS por etiqueta o por resultados de otro SHA.
