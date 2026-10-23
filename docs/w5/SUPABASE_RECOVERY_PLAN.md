# Plan de recuperación de Supabase en plan Free (W5, 23/10/2026)

Estado: **PROPUESTA para decisión humana. No se ha exportado ni restaurado nada del proyecto alojado.**
- El plan Free **no incluye PITR ni backups programados**: es una brecha real para operar comercialmente.
- Separación estricta: este plan es para **staging** (datos sintéticos). Producción tendrá un plan propio, que requiere decisión de coste.

## 1. Inventario recuperable (`crm-telecom-staging`, 23/10, solo volúmenes)

| Componente | Volumen | Fuente de verdad para reconstruir |
|---|---|---|
| Esquema (`public`) | 90 tablas, 319 funciones, RLS/grants/policies | **Git**: 87 migraciones forward-only + bootstrap. Reconstrucción desde cero probada en CI desechable |
| Datos `public` | ~4,4 MB | Solo en la base alojada: **necesita backup** |
| `auth` (usuarios, identidades) | ~1,6 MB, 11 usuarios | Solo en la base alojada; contiene hashes de contraseña: tratar como secreto |
| `storage` metadatos | ~0,4 MB | Base alojada |
| Storage objetos | 1 objeto (1 KB, sonda sintética) en `telecom-documents` | API de Storage (los bytes no están en la base) |
| Configuración Auth (Site URL, Redirect URLs, signup) | n/a | Panel de Supabase; se registra en `SUPABASE_STAGING_CONTRACT.md` |
| Secretos | Solo nombres | Manifiesto `infra/platform/environment-manifest.json`; los valores, en el gestor del propietario |
| Total base | 20 MB | |

## 2. Piezas ya implementadas en el repo (IMPLEMENTED / TESTED_LOCAL)

- `scripts/platform/backup.mjs`: cifrado y descifrado autenticados con clave de 32 bytes e identificador de clave.
- `scripts/platform/offsite-contract.mjs`: subida, retención, rotación y relectura. **Solo mocks: no hay proveedor real.**
- `scripts/platform/recovery-point.mjs`: componentes obligatorios (base, auth, objetos, metadatos, configuración, referencias de secretos) y antigüedad.
- `scripts/platform/restored-authorization.mjs`: después de restaurar, el owner lee, los ajenos son denegados y los RPC privados se rechazan.
- CI `reconstruction-recovery` (enterprise): reconstrucción en recurso desechable, SUCCESS.

**No probado alojado (BLOCKED):** ningún volcado real de `crm-telecom-staging`, ningún destino externo y ningún restore desde un volcado real.

## 3. Procedimiento propuesto (sin credenciales en el repo)

1. **Workflow manual** `workflow_dispatch` en un entorno protegido de GitHub (`backup-staging`, con el propietario como revisor):
   - Secretos `SUPABASE_DB_URL_STAGING` (conexión directa) y `BACKUP_ENCRYPTION_KEY_HEX`, solo en el entorno, nunca en un job sin protección.
2. Volcado lógico con la CLI fijada (`supabase db dump`): esquema, datos `public`/`auth`/`storage` y roles por separado. Los objetos de Storage, por la API con una credencial de servicio del mismo entorno protegido.
3. **Cifrado** con `backup.mjs`, que produce un archivo autenticado. El texto en claro nunca toca el disco del runner fuera de `RUNNER_TEMP` y se borra al terminar.
4. **Destino** (decisión, coste 0):
   - (a) Artefacto de Actions cifrado, retención 14 días. En un repo PUBLIC los artefactos los descarga cualquier usuario con sesión: **la confidencialidad depende solo de la clave**. Aceptable **solo** para staging sintético.
   - (b) Almacenamiento privado del propietario. Requiere elegir proveedor.
5. **Restore de verificación** en un stack Supabase local desechable (CI), nunca sobre staging:
   - aplicar el volcado;
   - comparar el ledger de migraciones, el número de tablas/funciones, las políticas RLS, los grants y el SHA-256 de las definiciones de función con el de staging;
   - `restored-authorization.mjs` con cuentas sintéticas A/B;
   - teardown.
6. Registro: hash del archivo, versión de clave, recuento de componentes y resultado del restore. Sin datos ni valores.

## 4. RPO / RTO propuestos (decisión humana)

| Entorno | RPO | RTO | Mecanismo |
|---|---|---|---|
| Staging (sintético) | 7 días | 4 h | Volcado semanal manual + restore de verificación mensual |
| Producción | ≤ 24 h, mejor con PITR | ≤ 4 h | **Requiere decisión de coste**: Supabase Pro con PITR, o un volcado diario cifrado a un destino privado. No se lanza producción sin esto |

## 5. Retención y borrado

- Staging: 4 volcados semanales (≈1 mes), con borrado automático al caducar.
- Rotar la clave de cifrado cada 90 días con `rotateArchive`.
- Nunca guardar volcados en Git, en carpetas locales de desarrolladores ni en servicios no autorizados.

## 6. Runbook de incidente (resumen)

1. **Detectar y declarar:** pérdida o corrupción de datos, o compromiso. Registrar hora, alcance y SHA desplegado.
2. **Contener:**
   - parar escrituras (cohorte vacía o retirada de la admisión en la app);
   - en compromiso, rotar las claves de Supabase.
3. **Decidir el tipo de recuperación:**
   - rollback de aplicación (redeploy de un deploy registrado, sin tocar datos);
   - o restore de datos.
4. **Restore de datos:** primero en un recurso desechable, verificación (§3.5); después, **con autorización explícita del propietario**, sobre el destino.
5. **Verificación posterior:** RLS, grants, funciones y A/B. Comunicar en #67.
6. **Postmortem:** causa y acciones, sin datos personales.

## 7. Decisiones pendientes

- Elegir destino (§3.4) y RPO/RTO.
- Crear el entorno protegido y sus secretos (propietario).
- Autorizar el primer volcado real de staging.
- Para producción: decisión de coste sobre PITR.

Hasta entonces: **backup alojado = BLOCKED**.
