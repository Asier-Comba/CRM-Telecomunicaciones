# REPRODUCIBILITY_AND_BACKUP

Fuente inicial PR156 `5332d9899eb1062a7db6b1800e9f0eda1151bac3`; observación posterior `2cbdc4b66315a52720c19c60e5d7ebe4e6adc996`; propuesta y deploy declarado W5/PR159 `bb16afe512be1cb04d6c86ecadb2064966a062aa`. Fecha de corte 2026-10-19T18:59:45.925355+00:00. CLAIM[6274698885](https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-6274698885). Las fuentes son candidatas, no composición aceptada. No herencia de PASS entre SHAs.

GitHub recupera el código porSHA y package.json/package-lock.json; la conservaciónba91f640 mantiene1.003 archivos y221checkpoints, sin editar esa rama. El producto hospedado requiere además procedencia de deploy, configuración, gestores de secretos y servicios vivos: un clone/build no lo acredita.

No se encuentra netlify.toml en ninguna de las ocho cabezas inspeccionadas. Cowork declara un deploy manual debb16afe más un archivo de configuración adicional, todavía no verificado por nosotros. Pedir ruta+SHA de configuración saneada, ID de deploy, digest del build y evidencia de que ese conjunto se puede reconstruir remotamente. No copiar valores de entorno ni enlazar/desplegar nada. El401 anónimo confirma sólo la protección de una ruta; no el backend/login o todos los healthchecks.

Se añade un workflow NUEVO propio, limitado a nuestra rama, que ejecuta Python/Git y pruebas de seguridad del auditor sin npm, Docker, DB, usuarios, secretos de aplicación ni flags. contents:read, checkout sin credenciales persistidas y cancel-in-progress:false. No modifica pipelines existentes. Su evidencia remota debe vincularse al SHA de nuestra rama en issue67; hasta que exista run final, REMOTE_AUDITOR_NOT_RUN. Aun conPASS sólo acredita reproducibilidad del auditor, no ejecución del CRM.

Los runbooks docs/platform/README.md y docs/runbooks/PLATFORM_RECOVERY.md describen reconstrucción y A→B local; sus resultados CI exactos no son una restauración del staging ni un plan contratado. Se requiere evidencia W5 de backup cifrado/offsite, inventario DB/Auth/objetos, keys en gestor privado, hashes/lectura y restauración aislada, RPO/RTO medidos y alertas; ninguna operación se realiza aquí.

Según documentación oficial consultada el19/10/2026, Free no incluye backups automáticos/PITR; Pro parte de25USD/mes con siete días de backup DB; PITR parte de~100USD/mes y requiere computeSmall o superior. No son una cotización final ni evidencia del plan del proyecto, que permanece desconocido. Alternativa a valorar por propietarios: exportación/offsite protegido con restore aislado y coste operativo explícito. No se contrata ni se activa. [Precios](https://supabase.com/pricing) · [Backups](https://supabase.com/docs/guides/platform/backups).

El backup de base de datos no contiene los bytes de Storage; la estrategia debe cubrirlos aparte. Auth/signing/sesiones/OAuth/MFA y recuperación de acceso empresarial también requieren tratamiento específico y evidencia, no inferencia desde pg_dump. [Documentación](https://supabase.com/docs/guides/platform/backups).

Observabilidad, SMTP, n8n, VPS, workers, DNS, cuotas y recuperación siguen con propietarios. Configuraciones versionadas no demuestran servicios desplegados; no se crea una nueva dependencia de unPC. ChangelogSupabase consultado: avisoTLS2ciphers para10/11/2026 registrado como contexto futuro, sin atribuirle fallos actuales.
