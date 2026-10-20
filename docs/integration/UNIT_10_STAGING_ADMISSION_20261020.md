# Unidad10 — admisión staging preparada, inactiva

**Estado posterior:** corrección474e7e2 conserva el contrato exacto Cache-Control:no-store; dos fallos causales de Proxy se conservan y46controles pasan. Su CLI validó historial Auth/API/browser, pero falló después en transporte de producto con503: el guard rechazaba BDloopback al usar next start/NODE_ENVproduction. Corrección4ef29582 preserva ese transporte existente; APP_ENVstaging/production y URLs remotas siguen cerradas sin admisión, y UIproducción sigue apagada. Dos fallos causales de fábrica→48controlesPASS. Se publica incluida en2f87fdc8 con unidad11 yPT409/87; necesita CI propia. Los apartados siguientes conservan el checkpoint inicial145f01c y sus límites, no el estado final de esta unidad.

Fuente de aplicación: `145f01cc23404b77f60c959b0b066155245e9895`; árbol `bff308855924852e2a84d5f2bcac7267fd8af0d8`. Base888ecaa; PR156 propia. Fecha2026-10-20. No es aceptación de seguridad o release.

## Cambio ejecutable

La aplicación distingue elegibilidad de configuración y admisión por identidad. El guard local original sigue limitado a loopback/no producción. El guard nuevo admite únicamente el proyecto y origen de preview comunicados, APP_ENV=staging, NODE_ENV=production y activación explícita. No admite otro origen HTTPS ni otro proyecto Supabase por semejanza de nombre.

PRODUCT_STAGING_INTEGRATION está apagado por defecto. PRODUCT_STAGING_USER_IDS es privado de servidor:1..64 UUID canónicos únicos, sin comodines. No se han introducido UUID reales ni cambiado flags en cloud. Configuración inválida no cae al modo local. El SDK de usuario de servidor no se construye para proyectos remotos sin esta configuración; se construye por petición y vuelve a consultar getUser. La decisión usa identidad raíz confirmada, no anónima y sintética@example.invalid, nunca user_metadata ni perfil. No concede roles: servicios, membresías y RLS conservan su autoridad.

Proxy cubre páginas y todas las rutas /api, incluidas terminaciones de imagen; responde de forma cerrada o redirige al acceso canónico. Salud mantiene su contrato operativo independiente. Se propagan cookies y cabeceras del SDK SSR0.10; respuestas autenticadas son privadas/no-store y cookies staging Secure. El layout del producto es dinámico. El cliente navegador no se crea durante renderizado de servidor.

El contrato y validador de aplicación registran los dos bindings privados. El manifiesto W5 NO se ha modificado: solicitud de revisión/registro issue67/6275268850. ENV_INVENTORY_DRIFT incluye ahora el delta propio nuevo además del heredado; no se atribuye todo a la base. PR159 altera mode.ts con una política distinta: conflicto explícito pendiente de reconciliar, sin adopción ni despliegue automático.

## Evidencia separada

- Probe original888: rechazo de la nueva elegibilidad hospedada esperado; no defecto del contrato local original.
- Batería bootstrap de esta fuente en Windows:641PASS/5FAIL de646. Los cinco fallos de permisos POSIX en importación permanecen; no son PASS.
- CI39405671293 ejecuta merge889293aa71106f22c173a43799798d111720b4b4. Árbol verificado por Git idéntico a145f01c. En Linux:646bootstrap y825assistant PASS, lint/types/build PASS; audit5HIGH causa FAILURE del job global. Revisión de dependencias y Critical Playwright SKIPPED, no PASS.
- Local825assistant, typecheck y build44 PASS. La reducción66→44 de páginas prerenderizadas resulta del layout dinámico. No se confunde compilación con aceptación de rutas hospedadas.
- Prototipo lint falló por variable reservada module en el banco; corregido antes del commit, log conservado. Lint final fuente congelada y navegador local aún en curso al escribir este punto.
- Banco controlado transpila Proxy/fábricas reales y sustituye únicamente puerto Auth/SDK: cubre orígenes, cohorte, cookies, cabeceras, sesión por petición y rechazo de API. No es AuthDB alojado.
- Nueva aceptación de identidad usa signIn/getUser reales en Supabase LOCAL desechable con dos usuarios existentes y cierre sólo de esas sesiones nuevas. Queda pendiente su resultado CI39405671263; no se declara PASS antes de ejecutarse. Tampoco prueba routing hospedado.
- Navegador local: primer caso escritorio falló esperando/dashboard en5s; traza registra solicitud RSC pendiente, sin respuesta (-1). Causa completa desconocida; se conservan traza/captura/log y no se modifica el timeout. Resto del banco12 aún en curso. No se afirma regresión corregida ni aceptación heredada.

## CI previo888

Run39308242526 SUCCESS; CLI seguro:07e7776284f7280430a1fb171540745c3405bfe3, árbolaf81af54cfb922277f481cd7689595490e682457 idéntico a888.86migraciones,3815+227backend,113UI yteardownPASS. LOCAL_SUPABASE_DOCKER; remotoNOT_TESTED. No asignar esos resultados a145f01c.

## Límites y siguiente trabajo

W4 independiente y W5 deben revisar la propuesta antes de activarla. Cohorte autorizada no proporcionada; acceso Netlify Edge sigue bloqueado según coordinación. W5 reporta87migraciones yPT409 en staging desdePR159; esta composición aún usa86 y requiere incorporar compatibilidad revisada en unidad separada, sin reset/reapply alojado. P0Storage sigue abierto. Ninguna modificación de main, hosting, SQL alojado, secretos o resellpro.

Revisado el delta de tres archivos comerciales dePR160 HEAD8fca4c8: ACK técnico limitado publicado en6288602043. Incorporación con bancos propios pendiente, sin heredar sus resultados. PR161 mantiene trabajo paralelo propio. IA de negocioOFF, modelo realNOT_RUN, gasto0.342requisitos y producto completo siguen NOT_ACCEPTED.
