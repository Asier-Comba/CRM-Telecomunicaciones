# Unidad 09 — recuperar inventario de sustitución SIM

Fuente `111d2dbe9eb4dfb386c9e364c5f5e78ffd991ffd`, árbol `3a499a9625cb202b7f007d0f95b08a5e7165eb10`. Cherry-pick-x dbcdb15b221518117078f6b73d446d8b33643c0c. Cambia únicamente Sims.tsx en producto: revisión de lectura y botón de actualización/reintento; conserva filtros y cursor al recuperar primera o segunda página.

Causal390 sobre2cbd:6FAIL por falta del botón tras fallo de transporte, servidor o403 en ambas páginas. Sobre111d:24PASS (18recuperación +6aislamiento de recurso), retries0, tipos/build66PASS y lint dirigido a los dos archivos de código cambiadosPASS. No se etiqueta lint global sobre esta fuente. Tres capturas inspeccionadas a390/768/1440. Ante403, el inventario permanece deshabilitado; una selección de una página anterior se conserva. El banco no ejecuta comandos, tampoco al abrir la revisión: no demuestra autorización de escritura ni aceptación del módulo completo.

Sin cambios SQL, API, contratos, dependencias, flags o infraestructura. No llamadas externas al operador ni gastos de IA. Delta acumulado de producto frente a155:8archivos51+/39-. Detalle/huellas en UNIT_09_EVIDENCE.json. Auth/DB y CI de la composición nueva pendientes; no hereda resultados de5332.

Siguiente unidad: preparar admisión de aplicación hospedada con configuración explícita, origen/proyecto fijados y cohorte validada por servidor, cerrada por defecto. No activación cloud ni selección de UUID sin autorización; revisión independiente W4 y coordinación de bindings W5 antes de habilitar.
