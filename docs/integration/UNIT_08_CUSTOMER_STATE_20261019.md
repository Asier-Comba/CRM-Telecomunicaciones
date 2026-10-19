# Unidad 08 — archivo y restauración de clientes recuperables

Fuente `349549f820a8b5857f1180a7b2fec2f35005e056`, árbol `6e5bbf01f7dde14007240843fb2280bfdd96f1d4`. Cherry-pick-x c7da250880d7c529423086bfcca7ec95a79d460e y3bd49ed45d039fcc8d31158cc7aff33d144b2d48. El diálogo conserva intención y bloqueo de cierre ante respuesta perdida o recibo no verificable.403 permite cancelar sin efectos. Único archivo de producto de esta unidad: IntegratedCustomerDetail.

El consumidor autenticado mantiene el check anterior y añade tres formas de recibo inválido, tanto al archivar como al restaurar: mismo cuerpo/comando, un registro de comando/auditoría y una revisión. Conflicto de imports resuelto incluyendo sólo el nuevo consumidor; no se arrastran auxiliares de otras ramas. Contactos y consumidores anteriores preservados. Ejecución real sobre esta composición pendiente.

## Evidencia propia

- Causal390 sobre5332d98:4FAIL/2PASS; fallan respuesta perdida y recibo inválido en archivo/restauración, pasan denegaciones.
- Primera verificación interrumpida por el apagón comunicado por el usuario durante el test18/89, sin resultado final. Lint también interrumpido; tipos/build no iniciados. No se contabiliza ningún PASS de ese intento. Logs y huellas conservados en `unit8-interruption-recovery.json` dentro del paquete local.
- Tras recuperar: mismo HEAD/árbol, carpeta limpia y sin procesos propios anteriores. Nueva ejecución, salida separada y retries0:89PASS en3.7min, incluidos18 casos de estado y71 regresiones de clientes/contactos/incidencias.
- Lint global, tipos y build66PASS sobre349549f. Tres capturas inspeccionadas: archivo390, restauración768, archivo1440.
- Inventario oficial674 pruebas/46archivos recogidas; no equivale a674 ejecutadas. CI nueva y Auth/DB de esta composición pendientes.

Sin SQL, contratos, dependencias, flags o infraestructura. Delta acumulado de producto frente a155:7archivos,49líneas añadidas/37retiradas. Fallos anteriores permanecen abiertos con sus fuentes. No release ni aceptaciónW4/342requisitos. Siguiente candidata independiente: recuperación de inventario de sustitución SIM dbcdb15b221518117078f6b73d446d8b33643c0c.
