# Facturación25: una sesión de dictado fallida no altera la siguiente

CLAIM6302225903, base **8ee0b9ba61cd45072fbce75f12c6e684e3f3e6a6**. Rama propia codex/oier-review8ee-20261020; Asier revisa/integrará, no edición de su rama. Tests **964795d5a1eb50844ad21db19be95f2d48aa7a9a**; fix **cec4434223aae42d3758742d35d0af3a7df5c8e0**.

## Defecto causal y alcance

En PromptBuilder, onerror detenía el indicador pero conservaba los callbacks y rec.current del reconocedor fallido. En la secuencia controlada error→nuevo dictado→resultado/error tardíos del reconocedor anterior, el texto nuevo era sustituido y el botón pasaba a Dictar/Generar habilitado mientras la nueva sesión seguía activa.

Reproducción corregida en el componente real:3FAIL390/768/1440; cada uno observa texto anterior y nueva sesión ya no indicada como activa. El parche sólo retira onresult/onend/onerror del objeto fallido y modifica estado/ref/mensaje si todavía es el objeto vigente.8líneas añadidas/2sustituidas, sin helper, parser, API, SQL, contrato, proveedor o permisos nuevos. La prueba extiende el stub existente con un índice de instancia para entregar el evento al reconocedor anterior; los casos previos mantienen su destino por defecto.

Esta es una prueba de callbacks controlados. **No demuestra que un micrófono/navegador físico produzca esa secuencia**, ni su frecuencia; tampoco acredita dictado real. Sí demuestra que el componente anterior aceptaba devoluciones obsoletas y que el parche las retira sin inutilizar la siguiente sesión.

## Verificación propia

- Baseline 964795d5a1eb50844ad21db19be95f2d48aa7a9a, attempt24:3FAIL causales, tres asserts por anchura; no error de fixture o de parser en esta secuencia. Originales/logs/trace conservados.
- Fix cec4434223aae42d3758742d35d0af3a7df5c8e0, attempt25: **42/42 PASS**, sin retries/skips/flaky: los39casos existentes y3nuevos. Dictado nuevo sigue activo con el texto correcto, Generar permanece deshabilitado hasta terminar; después propuesta revisable de450EUR por instalación de fibra, sourceaudio, sin comando. Conserva corrección humana/abort rechazado/salida de cliente/alternativa de texto/concepto600Mbps/errores de propuesta.
- Lintglobal, TypeScript noEmit incrementalfalse y build Next por defecto PASS sobrecec4434223aae42d3758742d35d0af3a7df5c8e0. Log:44/44páginas estáticas generadas;75rutas totales incluyendo API. No repetir bancos ajenos o afirmar4042/116/766 sobre este fix.
- Capturas antes390 y después390/768/1440 vistas: texto correcto, Detener y Generar deshabilitado visibles. Alcance panel de dictado, no aceptación visual de todo módulo. Se conservan las seis capturas sin editar y sus hashes.

[Proyección segura](speech25/acceptance.safe.json) contiene fuentes, estadísticas, observaciones DOM y hashes de logs/capturas. SpeechStub y HTTP con IntegratedBilling/parser/repository/DTO reales; sin micrófono, AuthDB, cloud, persistencia o modelo vivo. No escrituras comerciales.

## Intento inicial separado

Attempt23:3FAIL de una reproducción mezclada con la política prevista de añadir texto al reiniciar. El resultado tardío anterior contaminaba la base de texto del siguiente dictado y una expectativa asumía sustitución. Conservado como **TEST_SETUP_CONFOUND**, no baseline causal ni fallo nuevo de negocio. Se corrigió la secuencia empezando la sesión fallida sin transcripción; no se relajó ninguna expectativa de producto. No confundir ese montaje con el fallo medido en24.

## Integración y límites

REQUEST Asier revisar/seleccionar sólo tests964795d5+fixcec44342 desde8ee; evidencia/revisión24 son recuperables, no dependencia funcional. PR pequeña nueva justificada porque las anteriores172/173 ya fueron incorporadas y sus ramas históricas no son la candidata8ee; no reimportarlas ni forcepush. Ningún gate cancelado o relajado. Nueva fuente requiere sus controles remotos; no heredar resultados de8ee.

Presupuesto final0EUR/decisión6302343684: mantener NetlifyFree/deploy intactos, sin Pro/tarjetas/gastos. QA Netlify propio pendiente. Original39458747653 causa/efectoUNKNOWN, no reemitido. IA negocio writesOFF, Storage/gates/5HIGH/revisión independiente abiertos, RELEASE_NOT_ACCEPTED.
