# Unidad52 · configuración pública ligada a la imagen · 23/10/2026

Estado **PROPOSAL_ONLY / RELEASE_NOT_ACCEPTED**. CLAIM #67/6371085126. Base técnica #189/sourceae10544da76da1a77fcc13c7bd5f3c23cd22deeb/tree3e01fada1fabca1aa3620a77b675f34085da78be. No compone ni mueve una candidata comercial.

## Fallo reproducido

Next16.4.3 documenta en su guía instalada de variables de entorno que NEXT_PUBLIC se congela durante next build. El validador de #189 comprobaba solo runtime: con una política fixture aceptada admitía tanto un artefacto ausente/no configurado como un digest público diferente. Las dos pruebas causales dieron **0PASS/2FAIL** sobre ae10544; no se utilizó la política real PROPOSED para fingir aceptación.

## Cambio

El Dockerfile existente genera, justo después de compilar, una huella SHA256 de una tupla fija: NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_SUPABASE_URL y clave pública efectiva. Se usa el validador público previo; los perfiles parciales o privados fallan antes de emitir la huella. Un build local sin configuración queda marcado configured=false. No se serializa process.env ni se guardan los valores públicos o privados en el registro.

El registro se copia explícitamente desde .next/public-build-binding.json a infra/platform/public-build-binding.json del runtime no-root. No se crea otro Dockerfile ni se introducen ARG de secretos. El entrypoint solo lee ese registro incorporado a la imagen, sin path o aprobación ambiental. Si falta o está mal formado, no podrá aceptar STAGING. Después de validar configuración y política aceptada, el runtime exige igualdad exacta con la configuración compilada; un desacuerdo termina con IMAGE_PUBLIC_BUILD_MISMATCH antes de server.js.

La política real sigue PROPOSED/PENDING, por lo que el gate anterior sigue denegando STAGING; PROD permanece cerrado antes de considerar el registro. LOCAL/DEV mantienen su contrato anterior. La prueba positiva de unidad51 ahora proporciona una huella válida además de la política fixture: la aceptación requiere ambas condiciones y no se relaja ninguna prueba de seguridad existente.

## Evidencia propia

| Prueba | Resultado local |
|---|---|
| Dos regresiones causales | 0PASS/2FAIL antes,2PASS después |
| Build público + runtime + binding | 10PASS/0FAIL |
| Plataforma completa | 115PASS/0FAIL/1SKIP nativo reservado a CI |
| Generador CLI sobre .next real del build local | PASS,configured=false,solo huella |
| Tipos | PASS |
| Lint | PASS |
| Inventario y diff | PASS |

Se rechazan ausencia, build sin configurar, cambio de cada uno de los tres valores públicos, estructura/versión/digest adulterado, configuraciones parciales, clave privada y variable pública desconocida. El alias legacy de build usa la misma clave efectiva, pero la admisión managed STAGING sigue prohibiendo ese binding en runtime. Las pruebas con secretos canario prueban que el registro no los incluye.

El código del producto no cambia. El build Next local de unidad51 se conserva como evidencia de su fuente; no se atribuye a esta nueva fuente una imagen ni regresión ajena. La CI propia construirá el Dockerfile ampliado, comprobará el archivo copiado y ejecutará el smoke/scan existente. Esos resultados se registrarán en PR/#67 cuando finalicen.

## Registro, límites y siguiente unidad

El propietario no conoce un registro existente. Se verificó el23/10/2026 la documentación oficial de [facturación GHCR](https://docs.github.com/en/billing/concepts/product-billing/github-packages): almacenamiento y transferencia de imágenes actualmente gratuitos. La [documentación del registro](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry) indica visibilidad privada inicial y publicación con GITHUB_TOKEN del repositorio. Esa es la alternativa propuesta sin coste, sin hacer pública la imagen ni crear una cuenta nueva.

Esta unidad **no publica una imagen**, no acredita digest de manifiesto, no configura Source ni cambia el VPS. Un image config ID del smoke no sirve como digest de release. Antes de publicación/consumo: fuente revisada, paquete privado, configuración pública exacta y evidencia propia de manifiesto/procedencia/scan; revisión W2/W5/W4 y aceptación de topología/origen/backup separadas.

Rollback: rechazar/revertir únicamente la propuesta. Siguientes: comprobar CI y contenedor propios; cerrar publicación inmutable protegida; recibir las revisiones y el dominio autorizado antes de una imagen de staging y cualquier arranque alojado. IA live/escrituras externas OFF, Storage88NO, coste adicional0EUR.
