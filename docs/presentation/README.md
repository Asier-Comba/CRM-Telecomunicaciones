# Arizan · presentación del 26/10/2026

Fuente local **congelada**: `c9c5ecd22ee80e1461bf29f3b560bbb97e386953`, árbol `41723a533577cbd87e80daf31f80a03f46eb68b6`. Estas notas se publican por separado y no cambian la fuente de la aplicación.

- [Estado, evidencia y bloqueos](ARIZAN_20261026.md).
- [Guion de diez minutos: Netlify pendiente y alternativa local comprobada](GUIA_ARIZAN_20261026.md).
- [Navegador: 27 observaciones](evidence/20261025-browser.safe.json).
- [CI y verificación de vídeo](evidence/20261025-ci.safe.json).

En la máquina preparada está disponible **http://127.0.0.1:3109/login** → **Ver demo telecom**. Es una demo local sintética, sin autenticación real ni persistencia de servidor. La copia de ejecución es `work/arizan-presentation`; el servidor anterior del puerto 3107 se ha detenido. El launcher comprueba fuente y dependencias sin modificar Git globalmente.

W5 ha comunicado la elección del Netlify existente (`a9e977ad`, despliegue `6ad78f6c`), sin cambios de alojamiento, con backend sintético preparado y preflight 16/16. El acceso de la cuenta existente sigue pendiente: Work aún no ha verificado el SHA servido ni el recorrido visual alojado. La guía incorpora el filtro **Estado: Activo**, el owner A para facturación y la contingencia local. EasyPanel conserva la App vacía. Docker local no quedó disponible para un backend autenticado.

El paquete `outputs/Arizan-26-10-2026.zip`, entregado en el chat, contiene **48 archivos**: guía, estado, capturas, galería, launcher, manifiesto y vídeo de 72 segundos. SHA256 **0d457f39c08dd88ab850e7f3435e43b062c93c0d8c54a035a2c66d31dc88bb16**. Se verificaron la integridad del ZIP y los hashes de sus 47 archivos más manifiesto. El vídeo es un montaje de capturas reales sin audio; no cumple el requisito de grabación continua. Su reproducción se comprobó en navegador, a 1440 × 976, sin error. No incluye contraseñas ni la captura del permiso de Netlify.

Se recorrieron login, dashboard, clientes y búsqueda, Customer360, cartera y detalle, facturación temporal, oportunidades, agenda y asistente determinista. La corrección de seguridad 54 se publicó en la PR 187 existente: Zod de herramientas 4.4.3 → 4.6.7, lock, SBOM y nota. No hay nueva PR. La fuente tiene pruebas propias satisfactorias: 672 de bootstrap, 827 de asistente, 940 de interfaz sintética y scan de imagen. El global CI permanece en FAILURE por la descarga de PostgreSQL limitada por ECR; vendor y W4 también siguen en FAILURE. Los resultados autenticados 87/4042/116 de 68a se conservan como históricos y no se atribuyen a c9c.

## Recuperación y siguiente acción

1. Conservar la fuente y abrir el recorrido antes de la reunión. Usar el paquete offline si falla el acceso. Una captura o un borrador temporal no acreditan persistencia alojada.
2. Tras completar el acceso legítimo a Netlify, comprobar site, despliegue y SHA; después, login del CRM con el owner sintético A y lectura del borrador tras recarga. Credenciales solo en UI privada.
3. Las revisiones W4/W5 y los controles de aislamiento, runtime, origen, imagen y seguridad siguen pendientes antes de adoptar una fuente nueva en hosting. IA en vivo y escrituras externas OFF; Storage 88 sin aplicar; presupuesto adicional 0 €.

Para reproducir la copia local autorizada: Node 24, checkout exacto del SHA fijado, instalación por lock, `PREVIEW_PORT=3109` y `npm run preview:dev`. La URL loopback corresponde a esa máquina. Este procedimiento no configura un alojamiento.
