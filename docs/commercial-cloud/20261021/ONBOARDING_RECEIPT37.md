# Confirmación del alta y recuperación mediante lecturas

Propuesta aislada sobre propia36/48eee7e58eaee2e64019571bd1ad0c78620e8014,
integrador48e. [CLAIM6310506835](https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-6310506835).
No modifica la fuente de PR181 mientras sus controles remotos estén activos.

La página trataba cualquier2xx como alta correcta, incluso si el JSON era inválido
o no contenía workspace. Tras perder la respuesta permitía volver a enviar el
formulario sin comprobar el acceso. Cuatro negativos causales de390px fallan
en db00414c; se conservan sin cambiar aserciones, permisos o tiempos.

Corrección b2287daa: comprobar los campos ya devueltos por route.ts y el RPC
provision_workspace: id UUID, name, slug, role y created boolean, junto con201
para creación y200 para acceso existente. No requiere que un workspace existente
tenga el nombre recién escrito, ni concede permisos mediante el recibo. El éxito
de acceso existente tampoco anuncia un CRM vacío.

JSON incompleto/inválido, transporte fallido y5xx mantienen resultado incierto.
Se retira el formulario y sólo se ofrece comprobar acceso con las lecturas
existentes. Si aún no hay membresía, permanece pendiente; si hay acceso activo,
navega al dashboard. No vuelve a enviar el alta. Los rechazos explícitos4xx
mantienen el error y el nombre para su corrección. El servidor conserva getUser,
su RPC, transacción, estados y permisos; API y migraciones intactas.

**52/52 Chromium controlados PASS**:26casos nuevos y26regresiones de36 ejecutadas
de nuevo sobre b2287daa. Los nuevos cubren390/768/1440, JSON roto/ausente, ID
inválido, pérdida de respuesta,502, created inválido/status incoherente, recibos
201nuevo/200existente y403suspendido. Teclado, lecturas exactas, cero POST adicional
tras incertidumbre y ausencia de errores de página comprobados. Tres capturas
de incertidumbre revisadas, sin desbordamiento. Lint de los tres archivos
modificados y TypeScript PASS; build por defecto44rutas PASS.3controles estáticos
existentes PASS, no SQL real. Todo sobre corrección b2287daa; el commit posterior
sólo añade evidencias y no cambia el código probado.

Sólo hay POST sintético interceptado en loopback (uno por caso nuevo). No empresas
creadas, RPC ejecutado, Auth/DB real, cloud ni aislamiento demostrado. Los bancos
usan la página/Button/Toaster reales y el límite SDK/navegación controlado de36.

**Dependencia del integrador:** la incertidumbre se conserva durante el montaje
de esta página. Para cerrar recuperación durable tras recarga, Asier debe acordar
la consulta autenticada de estado/acceso y su semántica ante efectos inciertos,
suspensión o ausencia. No se inventa un command_id, nueva RPC, política de alta o
persistencia en el navegador. Esa aceptación y el onboarding comercial completo
permanecen pendientes, al igual que la ventana propia cloud de W5.

[Evidencia saneada](onboarding37/acceptance.safe.json). Los originales fallidos y
posteriores están en checkpoints privados work/qa-onboarding37-before y after.
Reproducir con la CLI Playwright existente, config-directorio tests/e2e-preview,
ambos archivos onboarding-receipt.spec.ts y onboarding-verification.spec.ts,
workers1/retries0/timeout180000. No necesita arrancar Next ni Supabase.

No integración por silencio, compras o cambios cloud. CincoHIGH/historial/W4,
StorageP0 y micrófono físico pendientes. IA comercial writesOFF, contenido
afectadoOFF, issue10OPEN y RELEASE_NOT_ACCEPTED. Revisión exacta de Asier pendiente.
