# Unidad 07 — guardado de clientes recuperable

Fuente `8f83f90534396a1220546104d4d3a96dd13294f0`, árbol `cff28e3e87315cb9ab91d377a0349c9ac0cbf818`. Integra mediante merge563948981dff3e1216beeb3fcec3c7e9219596a4 y cherry-pick-x d3c0e1d2203a07cc90486e0083929dfba6ea0a1c. Único archivo de producto cambiado: CustomerEditor,7líneas de diff. Drawer ya tenía la protección compartida de la unidad02; su archivo no cambia.

El editor conserva el comando ante recibos no verificables y mantiene el panel abierto cuando el resultado es incierto o el recibo está confirmado pero falta releer. La confirmación válida se conserva en customerSaveIntent: reintentar una lectura fallida no repite la escritura. Un403 permite cerrar sin atribuir efectos.

Conflictos resueltos por unión: consumidor real de contacto anterior más consumidor real de guardado de cliente; fixture conserva CaseDetail y añade creación. No se adoptan otras ramas ni se eliminan checks. Los dos consumidores Auth prueban respuesta perdida y tres formas de recibo inválido con comando/cuerpo/versión/auditoría únicos; ejecución real pendiente sobre esta composición.

## Evidencia propia

- Causal390 sobre producto0b32bef con bancos y soporte de fixture:6FAIL/2PASS (creación/edición con recibo inválido, respuesta perdida y lectura confirmada fallida; denegaciones correctas). Primer ensayo se interrumpió por faltar el modo new-customer del fixture; no se cuenta como causal. Ambos logs conservados.
- Sobre8f83:68PASS de clientes/contactos más3PASS de paginación de notas,71 en dos invocaciones sin cambios entre ellas.24 casos nuevos de creación/edición a390/768/1440. No Auth/DB por estos bancos HTTP controlados. Tres capturas de recibo inválido inspeccionadas en esos tamaños; denegaciones auxiliares del fixture no se presentan como UX validada de producción.
- Lint global, tipos y build66PASS. Huellas de logs en UNIT_07_EVIDENCE.json.
- Sin SQL, dependencias, contratos, flags ni infraestructura. Modelo real NOT_RUN/gasto0. No release, W4 independiente y E2E hospedado pendientes.

Fallos anteriores de unidad06/c597 se conservan y no se convierten aPASS por estos71 controles de otro alcance. Próxima unidad: archivar/restaurar clientes con intención retenida, c7da250+3bd49ed, por separado.
