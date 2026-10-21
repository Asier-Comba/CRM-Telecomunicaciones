# Respuesta de alta después de abandonar la pantalla

Base propia37/ffd6a20a, integrador48e. [CLAIM6310739513](https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-6310739513).
Esta rama no incorpora el banco backend38 con tres negativos pendientes.

Causa reproducida en5b2a0502: se retiene la respuesta al POST, se desmonta la página
manteniendo Toaster global y se devuelve un recibo201 válido. En390/768/1440,
la pantalla abandonada publica un toast de éxito y router.replace('/dashboard').
Los tres negativos fallan; las tres observaciones adjuntas registran1POST,
readyToast1 y redirects['/dashboard'] antes de la aserción. No fallo de fixture.

Corrección b2585a53: guarda de vida del consumidor antes de publicar el resultado,
el error o el estado final del formulario. No aborta, cancela, reintenta ni revierte
el POST. Retira únicamente efectos locales de una página desmontada; el efecto
backend sigue sin demostración aquí. La recuperación durable de37 sigue pendiente.

La primera ejecución posterior58/58PASS está conservada, pero lint rechazó una
asignación del harness durante render.6b6d385f mueve ese control a un efecto sin
relajar reglas ni tocar el producto. La tanda posterior perdió sus manejadores
de ejecución y no dejó resultado final: se conserva como INTERRUPTED/causaUNKNOWN,
no como PASS ni fallo causal del producto. Se verificó ausencia de esos procesos
antes de una recuperación local, con salidas persistidas. No reintento de imagen,
Supabase o CI remota, ni cancelación de checks.

Controles definitivos de6b6d385f: **58/58PASS**, lint de4archivos/TypeScript/
build44PASS, con exit0 persistidos por control. Tres capturas de incertidumbre
de esta última tanda revisadas directamente. El commit posterior sólo añade
evidencias; el nuevo HEAD remoto necesita sus propios controles. Ver [acceptance.safe.json](onboarding39/acceptance.safe.json).
Se ejecutan de nuevo los58 casos únicos:52anteriores y6nuevos de recibo201/200
tardío en tres tamaños. Los casos montados siguen verificando éxito y navegación;
los desmontados exigen cero redirecciones/toasts y exactamente1POST sintético.
Límite: Chromium con página/Button/Toaster reales y SDK/navegación/HTTP controlados,
sin Auth/DB, provisioning real, aislamiento o cloud acreditados.

PR181 inicial48eee7e5 tiene controles terminales revisados por separado: merge
fe4f01d7310c147d0c47ac7f345749306c1f1282/árbole9bf8dd71828df708eb7359cde326d60b4cd02b5
idéntico al HEAD inicial. Union12329125646 acredita846casos(423+423), sólo preview.
CI39561830975FAIL por5HIGH,672bootstrap/827assistant/build44PASS. W4allref39561831102
FAIL23hallazgos,430refs/1566commits, sin excepciones/raw. No Supabase completo ni
aceptación alojada nueva; esos PASS no pertenecen a39 ni al próximo HEAD181.

Selección de Asier y aceptación independiente pendientes. API/SQL/roles/recursos
de W5 inmutados. Presupuesto0EUR, Netlify protegido intacto; IA writesOFF,
contenido afectadoOFF, voz físicaNOT_VERIFIED, issue10OPEN y RELEASE_NOT_ACCEPTED.
