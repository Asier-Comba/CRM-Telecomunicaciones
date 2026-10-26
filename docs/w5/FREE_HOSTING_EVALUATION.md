# Alojamiento gratuito: evaluación W5 (21/10/2026, presupuesto adicional 0 €)

Fuentes oficiales consultadas el 20–21/10. Evaluación técnica W5, complementaria a la de Oier (CLAIM OIER-FREE-HOSTING27); si difieren, decide el propietario. **No se ha creado ningún proyecto, deploy, DNS ni cuenta, y el Netlify actual no se ha tocado.**

## Requisitos del CRM que deciden

- Next.js 16.3.8 con `src/proxy.ts`, que en Next 16 **se ejecuta siempre en runtime Node.js** ("Proxy defaults to using the Node.js runtime… Setting the runtime config option in Proxy will throw an error"). La admisión estricta de staging vive ahí.
- Rutas API Node con cookies de Supabase Auth (`@supabase/ssr`).
- Preview **privada** para dos personas (Asier y Oier) con cuentas propias, sin sesiones compartidas.
- Uso **comercial**: es un SaaS en desarrollo para venderse.
- 0 € y sin tarjeta.

## Comparación

| Opción | Uso comercial | Coste / tarjeta | Next 16 proxy Node + API | Privacidad para 2 personas | Veredicto |
|---|---|---|---|---|---|
| **Vercel Hobby** | **NO**: "Hobby teams are restricted to non-commercial personal use only"; también cuenta como comercial "a paid employee or consultant writing the code" o anunciar la venta | 0 € | Sí (plataforma de referencia de Next) | Vercel Authentication solo para miembros, y Hobby es de un solo usuario; contraseña no disponible en Hobby | **Descartado**: incumple las condiciones de uso |
| **Cloudflare Workers Free + OpenNext** | Sin restricción encontrada | 0 €; Access/Zero Trust: no se verificó si exige método de pago | **NO**: OpenNext indica que "Node Middleware… not yet supported" y en Next 16 el proxy es Node. Además: worker ≤ 3 MiB comprimido y 10 ms de CPU por invocación | Cloudflare Access podría proteger por email | **No viable** sin reescribir la admisión fuera de `proxy.ts` (código del integrador) |
| **Render Free** | Ambiguo; la documentación dice "Do not use them for production applications" | 0 € (suspensión si se exceden límites sin tarjeta) | Sí (servidor Node) | **Sin control de acceso de plataforma**: la URL sería pública y solo protegería el login del CRM. Se duerme a los 15 min (~1 min para despertar) | **Descartado** para una preview privada |
| **Netlify Free (actual)** | No hay cláusula no comercial en el Self-Serve Subscription Agreement; el plan gratuito puede retirarse "at Netlify's sole discretion" | 0 €; 300 créditos/mes con límite duro (los proyectos se pausan al agotarlos) | **Sí, funcionando**: deploy `6ad78f6c` con admisión estricta | Privado, pero **solo lo ve el Owner** | **Se mantiene** |

## Conclusión

**A. Mejor alternativa gratuita compatible:** ninguna mejora a Netlify Free. Vercel Hobby queda excluido por uso comercial, Cloudflare por runtime y Render por privacidad.
**B. Restricción que persiste:** con 0 € **no existe acceso legítimo independiente de Oier a una preview privada alojada**. Solo el Owner (Asier) puede cargarla. No se hace pública ni se comparten sesiones.
**C/E. Cambios:** ninguno, porque no se migra. Una migración futura cambiaría `PRODUCT_V1_ORIGIN`, la URL exacta de la admisión, las Redirect URLs/Site URL de Supabase Auth y el dominio de las cookies.
**D. Intacto:** código, Supabase, 87 migraciones, tablas y datos.
**F. Despliegue y vuelta atrás:** se mantienen el workflow de #171 y el rollback por deploy ID registrado.
**G. Validable sin abrir el CRM:**
1. Owner en Netlify: recorridos visuales alojados ejecutados por Asier, atribuidos a W5/propietario.
2. Oier: QA independiente con su propio runner sobre un **build de producción local** del SHA exacto contra Supabase staging, con cuentas sintéticas admitidas. Es validación independiente del código, **no del hosting**, y debe etiquetarse así.
3. Pruebas anónimas de privacidad (401) sobre la URL y el permalink del deploy, que cualquiera puede repetir.
