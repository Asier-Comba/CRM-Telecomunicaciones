# Storage 88 · contrato de mitigación del caché de edge (revisión W4)

Estado: **PROPUESTA PARA W4. Storage NO resuelto.** Este contrato sustituye a la propuesta
de rotación de `object_ref` (ver §6). No se ha aplicado nada en alojado salvo la propia 88
en `crm-telecom-staging`, autorizada por el propietario el 26/10.

## 1. Hechos medidos (staging `zgwotxnyqzfuzcnmgvtn`, plan Free, 26/10/2026)

Objeto: el documento sintético de la empresa A (PDF de 1013 B; prefijo sha256 `c2272026b37e`).
Actor: cuenta sintética `suspendeda`, reactivada temporalmente y restaurada exactamente
(hash, baneo y estado de membresía, verificados por SQL contra la copia de seguridad).
La evidencia contiene solo estados, cabeceras de caché y prefijos de hash.

| # | Experimento | Resultado |
|---|---|---|
| E1 | Calentamiento con 87 (17:53 UTC) → aplicar 88 → mismo JWT y misma URL | 70/70 lecturas devuelven 200 HIT con el hash del calentamiento; luego 111/111 muestras HIT (cada 30 s) hasta la caducidad del JWT (18:53:35). Primera denegación a las 18:54:06, con el JWT ya caducado. |
| E2 | Discriminante: JWT emitido a las 19:20:06 (exp 20:20:06), cuenta restaurada de inmediato a suspendida y baneada; calentamiento a T0+30 min (19:50) mediante una política temporal acotada, que luego se elimina; sondeo hasta T0+97 min | 51/51 muestras 200 HIT antes de exp (otras 7 fueron fallos de red locales, 19:52–19:55, seguidos de nuevos HIT). **Último 200: 20:19:48. Primer 400 DYNAMIC: 20:20:18. 73/73 muestras después de exp = 400.** No hubo ningún 200 tras exp. |
| E3 | JWT de control (login nuevo / otro usuario) contra la misma URL, con la 88 ya aplicada | 400 DYNAMIC en las rutas `authenticated` y `sdk`. No se observó que el caché sirviera a otro JWT ni a otro usuario. |

Conclusiones:
- **El límite de la ventana es la caducidad del JWT, no el TTL del objeto.** En E2, la entrada se calentó 30 min antes de exp y dejó de servirse en exp, mucho antes de los 3600 s de `cacheControl` por defecto.
- El edge varía por `Authorization` y `apikey`, e ignora `cache-control: private, no-cache` del origen.
- Una vez aplicada la 88, toda lectura directa nueva se deniega con 400 DYNAMIC, que no se cachea. Las entradas cacheadas antes del corte no se revocan, pero mueren con su JWT.

**Anomalía abierta (para W4):** en E2, la primera lectura del calentamiento ya fue HIT, con un
JWT que no había leído antes ese objeto. Los controles de E3 descartan que se sirva a otro JWT,
pero la clave exacta de caché del edge no está documentada. Hipótesis no verificadas:
- una petición interna previa durante el preparado;
- una normalización de la clave.

**Sin probar** (se necesitaría un sondeo con dos JWT válidos del mismo usuario calentados en momentos distintos):
- si `Authorization` es la clave completa;
- si un JWT recién emitido para el mismo usuario puede recibir un HIT calentado por otro JWT suyo todavía vigente.

## 2. Contrato

**C1. Única vía de lectura**
- Bytes de `telecom-documents` solo vía `document_content_v1_manifest` (JWT del usuario, estado actual de la BD en cada petición) más una descarga en servidor con credencial solo-servidor (`src/lib/server/document-object-fetch-v1.ts`).
- Ninguna política SELECT de `storage.objects` concede lectura de documentos a `authenticated` o `anon`.
- Lo comprueban:
  - `supabase/tests/telecom-server-read-rpc.sql`;
  - `supabase/tests/document-content-workflow.sql`;
  - el verificador de recuperación (`restoredStorageContract` = `'88'`).

**C2. Respuesta al navegador**
- `Cache-Control: no-store`, adjunto, `nosniff`, CSP sandbox (`document-content-http-v1.ts`).
- Ningún CDN intermedio guarda bytes por usuario.

**C3. Ventana de exposición en el despliegue (Free)**
- Al aplicar la 88 queda una exposición residual acotada:
  - Afecta solo a los pares (JWT, URL) que un cliente ya leyó directamente antes del corte.
  - La cota es: momento de aplicar la 88 + `jwt_expiry` (hoy 3600 s, medido como exp − iat).
- Procedimiento:
  1. Opcional y decisión del propietario, porque es configuración de Auth alojada: bajar `jwt_expiry` (p. ej. a 600 s) al menos un `jwt_expiry` antiguo **antes** de aplicar la 88. Así la ventana se reduce a ≤10 min sin tocar Storage. Este cambio afecta a la frecuencia de refresco de todos los clientes.
  2. Aplicar la 88 y registrar la hora (T88).
  3. Hasta T88 + `jwt_expiry`, no tratar como efectiva la revocación de acceso a documentos de ningún usuario sensible: dejarlo anotado en la nota de despliegue.
  4. Pasado T88 + `jwt_expiry`, el sondeo de E1 con un JWT nuevo debe devolver 400 en ambas rutas.

**C4. Régimen estable**
- Con la 88, ningún JWT de usuario crea entradas nuevas en el edge para documentos, porque la denegación ocurre antes del caché (400 DYNAMIC).
- La revocación por suspensión, degradación o archivo es inmediata en cada petición, ya que el manifiesto se evalúa contra la BD.

**C5. Plan Pro o superior (si se adopta)**
- Además de C3, `purge` del caché del bucket `telecom-documents` justo después de aplicar la 88, con Smart CDN activo para invalidar al borrar.
- No es requisito del contrato: C3 ya acota la ventana.

**C6. Credencial de servidor**
- Las lecturas del servidor también pasan por el edge, con la clave de servidor como clave de caché.
- Las rutas de documento son inmutables (`upsert: false`, `object_ref` aleatorio) y la autorización la decide el manifiesto antes de descargar. Por tanto, una copia cacheada del servidor no amplía el acceso de ningún usuario.
- La clave es solo de servidor y no se añade a Netlify sin un deploy autorizado de #179 (ver §5).

**C7. Camino residual `document_cleanup_exact_select`**
- Esta política se mantiene en la 88 para el flujo de limpieza.
- Permite SELECT directo de un objeto pendiente caducado a quien tenga una *cleanup claim*, y esa lectura queda sujeta al mismo caché acotado por el JWT.
- Propuesta (pendiente de W4): o se justifica, o se sustituye por limpieza en servidor y la política queda solo en DELETE.
- No forma parte de este cambio.

## 3. Aceptación que W4 puede reproducir

1. Local o desechable: `supabase db reset` con la 88, y los dos tests SQL de C1 en verde. Sin la 88, cada negativo falla en su propia línea (prueba causal ya registrada en #179).
2. Recuperación: `tests/platform/restored-authorization.test.mjs` (contratos 87/88; el 88 exige `serverRead` con `MATCH`).
3. Alojado, sobre un objeto sintético:
   - E2 se repite con un sondeo por fases (`login`, `wait`, `warm`, `poll`):
     - Ese script es local y no está versionado, porque requiere credenciales de una cuenta sintética.
     - W4 puede pedirlo por canal privado o reescribirlo a partir de esta descripción.
   - criterio: `any_200_after_exp=false`, y primer 400 a ≤60 s de exp;
   - E3: los controles dan 400.
4. Anomalía de §1: sondeo de dos JWT del mismo usuario antes de cerrar.

## 4. Riesgo aceptado

Si se adopta C3 sin el paso 1, hay hasta 1 h tras el corte en que un cliente que ya descargó un
documento por la ruta directa puede volver a descargar **ese mismo** documento con **su mismo**
JWT, aunque se le haya suspendido.

No se observó que eso permitiera:
- obtener otros documentos;
- acceder con otros JWT;
- acceder con otros usuarios.

## 5. Fuera de alcance / pendiente

- **HOSTED_NOT_PROVEN** del lector en servidor (manifiesto → descarga). Requiere un deploy autorizado de #179 y la clave solo-servidor en ese contexto; no se ha añadido a Netlify.
- Configuración de Auth alojada (`jwt_expiry`) y plan de Supabase: decisión del propietario.

## 6. Por qué no rotación de `object_ref`

- E2 muestra que la entrada cacheada muere con el JWT, no con el objeto. Mover el objeto a una ruta nueva no acorta esa vida.
- En Free, mover o borrar no purga el edge. Que la URL antigua siga sirviendo hasta exp es una inferencia a partir de E1 y E2, no una medida.
- Las lecturas nuevas ya se deniegan con la 88.
- La rotación añadiría un comando privilegiado de movimiento, y escrituras en Storage y en la BD sobre datos vivos, sin reducir la ventana.
- Tampoco ayuda en Pro: allí la purga del bucket (C5) es más simple y completa.
