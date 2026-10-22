# Recuperación de la comprobación inicial de empresa

Base integrador48e4c64e157e1a66e1fd2d8b6694247c870f2a15. Rama exclusiva
`codex/oier-onboarding-verification36-20261021`. [CLAIM6310227226](https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-6310227226).

La página ignoraba el campo `error` de sesión/membresías y no capturaba rechazos.
Una respuesta errónea podía alcanzar el formulario como si fuera una consulta
vacía; un rechazo dejaba el estado de carga sin recuperación. Los cuatro casos
de390px fallan en e436f123 porque no existe el aviso de comprobación fallida.
Se conservan los resultados originales; no se presentan12 fallos no ejecutados.

Corrección ad54ad38: error seguro y reintento explícito de la comprobación. No
muestra el formulario mientras la comprobación falla. No expone mensajes internos
del SDK. Conserva sesión ausente→login, pertenencia activa→dashboard y consulta
vacía correcta→formulario, junto con las guardas de desmontaje y los filtros
originales. La autorización real sigue en el servidor con getUser y el RPC
canónico; getSession sólo participa en la navegación de esta página.

Resultado propio: **26/26 Chromium PASS**, workers1/retries0, anchuras390/768/1440.
Incluye cuatro errores y recuperación con teclado por tamaño, cuatro rutas
positivas por tamaño y dos respuestas tardías tras desmontaje. Las consultas
exactas y la ausencia de POST se comprueban. Seis capturas de error/recuperación
inspeccionadas directamente, sin desbordamiento horizontal. Tres controles
estáticos existentes de atomic-onboarding PASS; no son ejecución SQL. Lint global,
TypeScript y build por defecto con44 rutas PASS sobre la corrección ad54ad38.
El commit posterior sólo añade este paquete de evidencias.

Se utiliza la página y Button reales, compilados con las dependencias existentes.
Sólo se sustituye el límite SDK/navegación por respuestas HTTP sintéticas locales;
no ejecuta el backend, Auth, RLS, alta o persistencia. No demuestra aislamiento ni
onboarding comercial completo. No modifica API, SQL, AuthGate, roles, permisos,
recursos de W5 o infraestructura. No crea empresas. No sustituye pruebas alojadas.

Evidencia saneada: [acceptance.safe.json](onboarding36/acceptance.safe.json).
Los resultados fallidos y posteriores completos permanecen en los checkpoints
privados `work/qa-onboarding36-before` y `work/qa-onboarding36-after`.

Reproducción desde la raíz del repositorio (sin arrancar Next ni Supabase):

```powershell
$env:PLAYWRIGHT_JSON_OUTPUT_NAME='<salida-propia-absoluta>/results.json'
node node_modules/@playwright/test/cli.js test --config tests/e2e-preview onboarding-verification.spec.ts --workers=1 --retries=0 --timeout=180000 --reporter=line,json --output '<salida-propia-absoluta>/artifacts'
node --test tests/bootstrap/atomic-onboarding.test.mjs
npm run lint
npm run typecheck
npm run build
```

Selección e integración pendientes de Asier. No adoptar la rama completa por
silencio. CincoHIGH, W4/historial/vendor, StorageP0, micrófono físico y cloud propio
siguen pendientes; IA comercial writesOFF, contenido afectadoOFF, issue10OPEN,
RELEASE_NOT_ACCEPTED. Presupuesto0EUR y protección Netlify intacta.
