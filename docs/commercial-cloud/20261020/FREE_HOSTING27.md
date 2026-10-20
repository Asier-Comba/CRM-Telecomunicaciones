# Hosting27: decisión con presupuesto0EUR

Orden del propietario6302343684; CLAIM6302589143. Investigación20/10/2026, sólo páginas públicas oficiales y validación local. NetlifyFree/site/deploy actuales intactos, ningún alta de cuenta, tarjeta, invitación, API de pago, recurso, dominio o despliegue.

## Decisión actual

**No hay sustituto privado validado y autorizado todavía.** RenderNode es una alternativa de runtime para estudiar sin reescribir Next; se deja configuración deshabilitada para revisión, NO lista para desplegar. Mantener el entorno existente y pedir a W5 pruebas legitimadas del propietario con manifiesto/receipts/recargas/capturas, atribuidas a su ejecutor y revisables por Oier. No prestar sesiones ni fingir ejecución independiente. No pedir NetlifyPro de nuevo.

| Opción | Uso/comercial y coste | Next.js/privacidad | Resultado para este CRM |
|---|---|---|---|
| VercelHobby | La documentación restringe a personal/no comercial | Buen encajeNext no cambia esa condición | **Descartado** para CRM comercial, no cuenta/trial/upgrade. [Fuente](https://vercel.com/docs/plans/hobby) |
| CloudflareWorkersFree | Free100.000solicitudes/día/10msCPU; la publicidadFree para negocios no es aceptación jurídica independiente de todos los servicios | workers.dev puede protegerse conAccess; altaZeroTrustFree documenta datos de pago incluso sin cargo. OpenNext admiteNext16peroNodeMiddleware no; nuestroproxy usaNode. Vinext exige otro adaptador y pruebas de Auth/SSR, no paridad supuesta | **No validado**: no nuevas tarjetas, CPU sin medir y adaptación/origen/privacidad pendientes. [Límites](https://developers.cloudflare.com/workers/platform/limits/), [Access](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/), [alta](https://developers.cloudflare.com/learning-paths/clientless-access/initial-setup/create-zero-trust-org/), [OpenNext](https://opennext.js.org/cloudflare), [ruta actualCloudflare](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/) |
| RenderFreeNode | ServicioNode gratuito;750horas/mes, suspensión tras15mininactivo, arranqueaprox1min,512MB/0.1CPU; documentación aconseja no producción. Sin tarjeta, cuotas agotadas suspenden servicio/build en vez de facturar; no afirmar aceptación comercial jurídica por ello | Nextcompleto comoWebService; endpoint público onrender.com y sin recepción por redprivadaFree. Auth/cohorte de aplicación NO es la misma barrera que TeamLogin deNetlify; requiere decisión/revisión, no suposición | **Propuesta deshabilitada** de runtime/ensayo futuro; no producción/privacidad/consumo aceptados. [Free](https://render.com/docs/free), [NextNode](https://render.com/docs/deploy-nextjs-app), [recursos](https://render.com/docs/blueprint-spec) |

No afirmar que un proveedor está aceptado comercialmente por no encontrar una prohibición en una página; las condiciones aplicables de cuenta y uso deben ser comprobadas por su responsable antes de una migración. No pagar ni introducir tarjeta para comprobarlas.

## Bloqueo propio probado: origen cerrado

src/lib/server/product-staging-admission-v1.ts en8ee fija el único origen de staging al Netlify actual y el proyecto Supabase acordado. Ejecución local de **la función real**, con entorno sintético y sin red: origen canónico→enabled; origenRender/Workers→invalid. [Prueba](free-hosting27/origin-proof.safe.json). El proxy también compara request.origin con esa política.

Cambiar sólo variables del proveedor no habilita otro destino. **No ensanchar el origen ni retirar proxy/cohorte** para hacer funcionar una demo. REQUEST Asier/W5: si se elige alternativa, definir contrato versionado de origen exacto revisado independientemente y su ensayo A/B/no-store/identidad/denegaciones antes de cualquier escritura o despliegue. La fuente Node de proxy se comprueba con la documentación Next instalada; OpenNext no equivale a soporte de todos sus límites.

## Configuración reproducible preparada, deliberadamente cerrada

[render.disabled.example.yaml](free-hosting27/render.disabled.example.yaml) usa notaciónJSON válida enYAML1.2 y el esquema oficial. Está en docs/propuesta, **no render.yaml raíz ni workflow**, no conectado al proveedor. Define1WebServiceNode/planfree, sin DB/disco/dominio, previews y auto-deployOFF, Node24.12.0/standalone existente. El build exige aprobación explícita y SHA exacto antes de npm/build, copia assets estáticos del standalone y conserva PORT inyectado; no modifica Next/package-lock/Netlify.

Valores por defecto: HOSTING_MIGRATION_APPROVED=false, APPROVED_SOURCE_SHA=NOT_APPROVED, flags de producto/integraciónfalse; sin credenciales, IDs de cohorte o URLs nuevas de backend. No cambiar esos valores para eludir revisión. Incluso después de activarlos legítimamente, la política de origen actual rechazaráRender hasta que Asier entregue una fuente revisada. No hay cambio automático de DNS, staging, Supabase o Netlify.

[Validación](free-hosting27/config-validation.safe.json): esquema oficial2020-12 descargado con hash registrado; PASSoffline conAjv8.17.1. Runtime inválido es rechazado. Se verificó planfree/único servicio/sinextras/flagsOFF; el prefijo del build se ejecutó localmente y rechaza defaults conexit1 ANTES de npm/build. No ejecutó el build del proveedor ni creación/API. CLI semántico deRender/Linux/runtime/límites/autenticación hospedada: **NOT_RUN**. [Referencia y esquema](https://render.com/docs/blueprint-spec). Validador privado aislado, sin scripts de instalación ni cambio en dependencias de aplicación; sólo paquetes gratuitos, sin consumo de API con créditos.

## Secuencia propuesta, no autorización de migración

1. W5 confirma cuenta Free sin tarjeta/overage y condiciones aplicables. Asier/propietario deciden explícitamente la frontera de privacidad: aplicación Auth/cohorte o una barrera externa gratuita verificada, sin origen alternativo accesible que la salte.
2. Asier define origen exacto y fuente revisada; W5 resuelve gates/negativos pendientes; revisor independiente disponible acepta controles que le correspondan. No desplegar rojo ni copiarvariables/credenciales existentes entre proveedores sin autorización.
3. Elegir un SHA cualificado y reproducir build Linux con lock fijo/configsinsecretos/artefactohash; medir arranque/CPU/memoria/cookies/no-store y negativos A/B, fuera-cohorte/suspendidos con datos desechables. No heredar nuestro buildWindows ni el116de8ee.
4. Sólo con autorización específica, piloto en otro recurso/URL con actores sintéticos/operaciones/ventana/limpieza. CORE162sigue2mutaciones; no otros servicios, SQL, nuevos datos reales o emisióndeinvestigación.
5. Conservar Netlify conocido como rollback sin tocar DNS ni datos. Registrar artefacto/config/env-no-secretos/deploy/URL y prueba de acceso no admitido. Corte definitivo exige otra decisión del propietario.

[Estado de elegibilidad legible por máquina](free-hosting27/eligibility.safe.json). Próxima unidad independiente: paridad de facturación concreta contra referencia sólolectura y su caso comercial relevante, manteniendo PR177sinpush mientras corraCI. Presupuesto0EUR, IAwritesOFF/StorageOFF/vozrealNOT_VERIFIED/issue10OPEN/RELEASE_NOT_ACCEPTED.
