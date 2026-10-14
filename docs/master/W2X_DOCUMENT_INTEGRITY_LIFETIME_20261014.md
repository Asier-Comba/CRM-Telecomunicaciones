# Integridad documental: retirar continuaciones al desmontar el panel

CLAIM W2-X #67 /6166236481. Base363f5ccd2077af1f8db4cc30254f5c00b576a2b4.

## Reproducción y alcance

Una respuesta de descarga retenida llega después de cambiar de empresa y abrir otro documento. Antes de la corrección, la instancia retirada inicia document.verify_content y dos lecturas del documento anterior: comandos esperados1, observados2. El log fallido y observations.json se conservan sin sobrescribir.

El Provider real ya remonta su árbol cuando cambian actor, espacio o rol. La prueba representa ese comportamiento mediante una opción aislada del fixture existente; no ejecuta una autenticación real. Por tanto, el defecto demostrado es la continuación de peticiones obsoletas después del desmontaje, no una fuga de permisos del servidor ni la sobrescritura demostrada del nuevo panel.

## Corrección

DocumentIntegrity identifica la vida de su instancia y la retira en la limpieza del efecto. Tras cada respuesta asíncrona comprueba que sigue activa antes de iniciar la siguiente operación, actualizar estado o llamar al panel padre. Una operación ya enviada no se cancela ni se da por deshecha. Los intentos recuperables conservan sus reglas mientras la instancia sigue activa; la retirada limpia su referencia local.

Sin cambios de contratos, autorización backend, Storage, servicios ni infraestructura. Revisión React: efecto con limpieza, identidad local y reutilización del Provider/Drawer actuales; sin dependencias nuevas.

## Evidencia propia

- 85 pruebas de navegador HTTP controlado PASS (1.8min):27 nuevas para respuesta retenida en descarga/verificación/lectura, cambio de empresa/actor/rol y anchos390/768/1440;58 regresiones de integridad, cierre, contexto, estado y limpieza.
- Lint y compilación de66 rutas PASS sobre los mismos cambios funcionales. Documento añadido después, sin cambios de producto ni repetición de pruebas verdes.
- Tres capturas late-verify-company390/768/1440 inspeccionadas: el nuevo documento PNG sigue visible, cierre habilitado, título y acción legibles, sin desbordamiento horizontal visible. Revisión visual parcial.
- Las observaciones de cada caso registran las peticiones efectivas del fixture; no son mediciones de campos de durabilidad ni de producción.

Auth/DB/Storage reales NOT_RUN; modelo vivo NOT_RUN/API0. Esta evidencia no sustituye aceptación individual integral ni W4. HIGH5 visibles, IA comercial writesOFF, issue10OPEN y releaseNOT_ACCEPTED. Los fallos7F/F736/B9 y3c7 (timeout de preparación, causa completaUNKNOWN) se mantienen separados; este PASS no demuestra su corrección.

Siguiente: composición propia conB523 y revisión de la entrega CI W5 exacta32862fa/6166382893. No avanzar ramas38/142 ni el alias fallido153 sin controles y coordinación correspondientes.
