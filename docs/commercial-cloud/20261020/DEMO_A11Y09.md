# DEMO-A11Y-09 — etiqueta de contraseña del login

Fuente funcionalae09372ee6b6b7e1e6c6738226a35a5645a3a69b sobre3b80. CLAIM6291636133. Corrige sólo HTML de src/app/login/page.tsx: el contenedor pasa a div, el texto Contraseña es label explícito de login-password, el botón de recuperación queda fuera del label. No cambia validación, Auth, admisión, errores, router, cookies, roles, estado de recuperación, formulario o credenciales.

## Reproducción propia y corrección

El HTML real compilado por nuestro buildUX07 sobre7e1919d6 tiene el mismo blob de login89d69106325ef0114dea07df648fd8b599b88033 que3b80/e42. Se conserva su HTML original/hash; no se atribuye un nuevo build al padre3b80. Chromium sin JavaScript y con toda red abortada observa en390/768/1440: getByLabelContraseña exacto0, ninguna asociación al INPUTpassword y botón de recuperación sin el nombre accesible exacto esperado. El label envolvente asociaba primero al botón, no al input. Resultado3FAIL, archivo baseline.json.

Tras el cambio mínimo y build real propioae093: mismo banco/mismas aserciones,3PASS. Un INPUTpassword por etiqueta; label.control correcto sin botón anidado; recuperación conserva exactamente un botón llamado ¿La has olvidado?. Véase fixed.json. Banco tools/oier_ui_qa/login-label.mjs, iniciald2763a3d4545a28f8e7e37a1741f23d65d32c914, evalúa el HTML compilado, no una reconstrucción del formulario.

Lint dirigido0; buildNext16.3.8/TurbopackPASS con TypeScript y44páginas. Originales de build/lint/banco retenidos localmente; resultados estáticos publicados incluyen hash del HTML. No sustituir3FAILpor el positivo ni heredar resultados de Asier6290183089. La adaptación previa del runner al placeholder se conserva compatible: este parche repara la asociación del producto y no exige volver a cambiar el selector.

## Límites

PROBADA_LOCALMENTE: semántica estática del HTML compilado real en Chromium. No JavaScript/hidratación/teclado/foco/recuperación enviada/Auth/Netlify/login hospedado. No screenshots ni aceptación visual nueva; clases/layout permanecen. El positivo no acredita acceso ni revisor independiente. CincoHIGH,StorageP0 yreleaseNOT_ACCEPTED; IA writesOFF.

Asier debe revisar/adoptar sólo este delta de login; no fusionar otra integración. Sin cambios en ramas ajenas/cloud/configuración/dependencias o workflows. Próxima evidencia: lectura de etiqueta y navegación/foco en ventana autorizada junto al login real; no compartir sesión del propietario.
