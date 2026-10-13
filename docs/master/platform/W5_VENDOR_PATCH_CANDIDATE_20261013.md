# Candidato vendor actual, sin aprobación

Base propia PR147/a1b4357f890e0c5dda551dea57b2727e0f9984ac. Candidato aislado: n8n2.42.7, parche estable publicado12Oct, y PostgreSQL16.15-alpine3.24 oficial. Manifiestos índice/amd64 verificados por SHA256 el13Oct y digest de configuración fijado. Referencia primaria de release: https://github.com/n8n-io/n8n/releases/tag/n8n%402.42.7 . Registro: https://registry-1.docker.io . No se altera la imagen del recurso PostgreSQL nativo de PR146.

El baseline funcional n8n2.42.5/PostgreSQL16.13-alpine conserva sus resultados:38 controles de ciclo de vida PASS; seguridad n8n72HIGH/13CRITICAL y PostgreSQL35HIGH/1CRITICAL FAIL. Los informes anteriores permanecen con sus SHA y no se sustituyen por resultados nuevos. Las anteriores candidatas2.42.6 no se califican como aprobadas.

Esta prueba ejecuta el harness y los dos escaneos existentes sin modificar límites, expectativas, scanner, importación/exportación, reinicios, backup o política HIGH/CRITICAL/secretos. CI nueva requerida para estos bytes exactos. No se presume que la release corrija las vulnerabilidades: su nota enumera dos bugfixes y la imagen debe medirse.

company_runtime_accepted permanece false. No hay instalación local pesada, cuentas, publicación de imágenes, proveedor comercial o producción. La nueva composición no resuelve el límite85 del consumidor W2 en una unión86; esa dependencia propietaria sigue separada, igual que auditoría npm, historial, full23 y revisión independiente W4.
