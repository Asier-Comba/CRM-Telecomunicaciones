# Unidad54 · parche de herramientas para Arizan · 25/10/2026

**PROPOSAL_ONLY / RELEASE_NOT_ACCEPTED.** Seguimiento de seguridad en la PR187 existente, sin nueva PR ni cambios en175. Base68a08a692950a12ab18b3abf8d331cbc8f94fc64. CLAIM #67/6401030637. El SHA final y su CI se registran en PR187/#67 tras publicar.

## Hallazgo actual y alcance

La auditoría fresca del25/10 sobre68a08a69 detecta **1HIGH en zod4.4.3**, GHSA-mrhx-c7xc-m3w5. El resultado0 del23/10 permanece histórico. No se silencia ni se excepciona el aviso nuevo.

La cadena instalada es eslint-config-next16.4.3 → eslint-plugin-react-hooks7.1.1 → zod. El lock lo marca **dev=true**. La búsqueda en src/scripts no encuentra referencias a zod. Eso acota la dependencia observada a herramientas; no acredita por sí mismo la ausencia universal de riesgo o la aceptación de un despliegue.

El [aviso revisado](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) identifica agotamiento de recursos y parche4.6.6. El [cambio del mantenedor](https://github.com/colinhacks/zod/commit/a0ebf970f2d752e5f58527cd2942ff48be4f46bd) comprueba los límites de colecciones antes de recorrer sus elementos. El registro oficial npm devuelve4.6.7 como versión estable actual, dentro del rango ya permitido por el consumidor.

## Cambio mínimo

Solo cambia node_modules/zod de4.4.3 a **4.6.7** en package-lock.json: versión, tarball oficial e integrity SHA512 verificado por npm ci. No se añade dependencia directa, override ni cambio de package.json. Se preservan497paquetes y todas sus rutas; los otros496 mantienen su metadata y versión.

El SBOM se regenera desde el lock con npm10.9.3 fijado, se normaliza y se comprueba con los verificadores existentes.497componentes; SHA256 normalizado **ee9724ab77e765ea629634e6bf4daa0f69f0f3ed2029fff08d22dd14a6f6ee83**. Solo cambia la identidad de Zod y sus referencias, además del digest del lock. Next16.4.3, React19.2.4 y Node24 permanecen.

No cambia código de producto, Auth, origen, SQL, permisos, variables, entrypoint, Dockerfile o hosting. La copia aislada evita alterar la demo local en marcha mientras se valida el parche.

## Evidencia local propia

- npm ci --ignore-scripts: PASS, instalación por lock e integridad.
- Auditoría completa fresca: **1HIGH antes → 0 vulnerabilidades después**.
- Sonda acotada, sin carga de ataque: array de3elementos con límite2. Zod4.4.3 emitía3invalid_type y too_big;4.6.7 emite únicamente too_big, comprobando el rechazo previo al recorrido. No se provoca agotamiento de memoria.
- SBOM/check/inventario: PASS497; cuatro pruebas existentes de supply-chain PASS.
- Lint global: PASS, comprobando el consumidor real eslint-plugin-react-hooks.
- Build Next16.4.3: PASS44rutas.
- Tipos tras build y diff: PASS.

Logs saneados recuperables en work/arizan54-install.log, arizan54-audit-after.json, arizan54-build.log, arizan54-lint.log y arizan54-types.log. La prueba física87/4042/116 y las940UI de68a son evidencia de esa fuente anterior, **no se heredan al nuevo SHA**. CI, contenedor y revisión de esta nueva fuente se califican por separado.

## Presentación y límites

Arizan53 ya comprobó en navegador el recorrido local de68a a1440/768/390, búsqueda y Customer360, menú móvil, contrato, factura de300+63=363, borrador temporal y consulta determinista del asistente. La fuente parcheada solo sustituirá ese servidor local después de las comprobaciones pertinentes; su comprobación y congelación exacta constarán en #67 y en el paquete de presentación.

La demo local es explícitamente sintética, sin autenticación real ni persistencia de servidor. No se inventa un backend para ocultar Docker local no disponible o el acceso Netlify pendiente. La App EasyPanel sigue vacía. El Netlify anterior fue reportado por W5 como a9e/deploy6ad78f6c; no se presume actualizado por esta corrección.

W4/W5 deben revisar este delta y la publicación de187 antes de adopción alojada. Vendor e historial continúan como gates separados; nada los convierte enPASS. IA live/escrituras externasOFF, Storage88NO, coste adicional0EUR. Rollback: retirar esta propuesta; no elegir por ello un alojamiento vulnerable. No se toca main, protección, servicios existentes ni credenciales.
