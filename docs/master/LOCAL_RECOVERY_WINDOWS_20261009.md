# Recuperar el trabajo del CRM después de un apagado

La composición de referencia está en [PR38](https://github.com/Asier-Comba/CRM-Telecomunicaciones/pull/38), rama `codex/w2-w3-portability-composition`. Consulta su checkpoint vigente y la coordinación de [issue67](https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67) antes de recuperar una versión. PR88 es una candidatura histórica de facturación: sus pruebas no sustituyen las de la composición actual. Una rama publicada, una compilación correcta y una prueba anterior no acreditan una nueva versión. El repositorio remoto y los SHA de fuente, ejecución y árbol son la fuente de verdad; esta guía no fija un HEAD como permanente ni habilita producción.

## 1. Comprobar el ordenador y conservar cambios

Desde la carpeta del repositorio, con Node24:

```powershell
node scripts/local-recovery-doctor.mjs
```

El diagnóstico funciona sin instalar dependencias del CRM. Comprueba el commit, cambios locales, archivos necesarios, dependencias presentes, memoria, CLI Supabase2.119.0 disponible en PATH, motor Docker local Linux y puertos3108/3109/54321. Sólo consulta metadata Git, Docker local y conexiones TCP loopback. Nunca inicia Docker/Supabase/Next, instala, obtiene secretos, crea cuentas, envía mensajes, actualiza ramas ni borra archivos. Detectar un puerto abierto sólo significa que alguien escucha: no demuestra Auth, Storage, migraciones o disponibilidad del CRM.

`CHANGES_PRESERVED_REVIEW_REQUIRED` significa que hay archivos modificados o sin seguimiento. Consérvalos antes de cambiar de rama. El doctor no hace stash, reset, checkout ni limpieza. Git no disponible, configuración ajena, CLI equivocada, dependencia ausente o inspección fallida bloquean el preflight. Un Docker remoto queda bloqueado antes de consultar su servidor. Los contenidos de `.env.local`, configuración Docker y variables sensibles nunca se imprimen.

La guía de trabajo exige7GiB libres para intentar la pila completa en este ordenador. `BELOW_7_GIB_GUIDE` es un bloqueo de recursos; no una cuota del agente. No cierres procesos personales ni cambies Docker/WSL automáticamente. Una respuesta `PREREQUISITES_OBSERVED_ACCEPTANCE_STILL_REQUIRED` sólo acredita prerrequisitos observados: no arranca ni acepta la instalación. Un `.env.local` o vínculo hosted necesita revisión; no se presume seguro por una URL de apariencia local. El CLI puede estar instalado fuera de PATH: `NOT_AVAILABLE_ON_PATH` no afirma que no exista en el ordenador.

## 2. Recuperar la versión publicada

Comprueba primero los cambios locales y el checkpoint de [PR38](https://github.com/Asier-Comba/CRM-Telecomunicaciones/pull/38#issuecomment-6071077862), junto con la coordinación vigente de [issue67](https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-6079506848). Distingue la última fuente aceptada de una nueva candidata con pruebas pendientes. Una corrección aislada todavía sin consumir no se recupera como si fuera la composición. En un checkout limpio de tu rama de trabajo:

```powershell
git fetch origin
git status --short
git log -1 --format="%H %s"
```

No fuerces push, no uses reset destructivo ni cambies main. Si tu rama local coincide con la rama elegida y sólo está atrasada, `git pull --ff-only` acepta únicamente un avance lineal. Si diverge o hay cambios, detente en esa actualización y conserva ambos trabajos. No ejecutes un script antiguo de checkpoints para reconstruir el estado: podría publicar SHAs o resultados ya superados.

Algunos checkouts de trabajo no tienen un mapeo `remote.origin.fetch`. En ellos `git fetch origin` puede actualizar `FETCH_HEAD` dejando antigua la referencia `origin/rama`. El diagnóstico muestra `EXPLICIT_BRANCH_FETCH_REQUIRED` sin imprimir configuración, URLs ni nombres privados. `CONVENTIONAL_MAPPING_OBSERVED_REMOTE_HEAD_NOT_VERIFIED` sólo observa el mapeo local habitual: tampoco verifica el HEAD remoto. El doctor no descarga ni modifica referencias.

Para la composición indicada por el checkpoint, conserva primero los cambios y comprueba la rama actual. Descarga su referencia explícita; no dependas de una referencia antigua ni cambies la configuración Git compartida:

```powershell
$crmRecoveryBranch = 'codex/w2-w3-portability-composition'
git branch --show-current
git status --short
git ls-remote origin "refs/heads/$crmRecoveryBranch"
git fetch origin "refs/heads/${crmRecoveryBranch}:refs/remotes/origin/${crmRecoveryBranch}"
git rev-parse "refs/remotes/origin/$crmRecoveryBranch"
```

Los SHA del checkpoint, `ls-remote` y referencia descargada deben coincidir antes de consumir esa versión. Si el remoto ha avanzado, lee su checkpoint nuevo; no heredes pruebas de otro SHA. Sólo con árbol limpio y la misma rama elegida, `git merge --ff-only "refs/remotes/origin/$crmRecoveryBranch"` permite un avance lineal. En caso de divergencia, conserva ambos trabajos y revisa. Esta actualización no arranca servicios, habilita IA ni acredita aceptación. No uses estos pasos para modificar main o ramas W4/W5.

La regresión sintética con un bare remoto y dos commits reproduce que la descarga genérica deja la referencia antigua sin mapeo y la explícita recupera el segundo commit. Las fixtures y referencias son desechables; el código del doctor sigue siendo sólo lectura. Los demás prerrequisitos y bloqueos de la pila completa permanecen.

## 3. Distinguir preview y CRM integrado

El launcher `npm run preview:dev` es un preview sintético sin backend integrado, definido en `PREVIEW_WINDOWS.md`. Puede ayudar a revisar presentación; no acredita escrituras, Auth, Storage ni IA viva. No sustituye a la pila real. No uses la rama histórica de esa guía para sobrescribir tu trabajo actual.

La aceptación real usa `scripts/security/supabase-local/run-stack.mjs`, exclusivamente en GitHub Actions y un runner vacío desechable. Su rechazo `CI_ONLY` en Windows es intencional. No fuerces variables para saltarlo y no copies al portátil un reset pensado para ese runner. Una aceptación remota107/107 no establece una instalación persistente en Windows: ésta sigue pendiente de su propio bootstrap, sesiones, Storage, pruebas de reapertura y documentación. La compatibilidad de importación privada tampoco se presume: el adaptador desechable exige directorios0700/archivos0600 y Windows no acredita esos permisos POSIX. No desactives sus pruebas.

## 4. Límites que permanecen

Issue29 mantiene auditoría pendiente; issue10 durabilidad física e independiente W4 siguen abiertos. Las escrituras IA de negocio permanecen OFF. No hay autorización de main, producción, VPS, DNS, cuentas, proveedores ni datos reales. El doctor informa hechos locales sin importar módulos de aplicación, Supabase ni IA y no cambia su configuración. Sus pruebas verifican conservación de cambios Git reales, privacidad y bloqueo de Docker remoto; no se contabilizan como pruebas del CRM.


## 5. Conservar la evidencia después de otra interrupción

Cada checkpoint debe identificar la fuente publicada, el SHA realmente ejecutado, el árbol Git y los run/job propios. Verifica que ambos SHA tienen el mismo árbol antes de atribuir una prueba. Una prueba en curso, un informe ausente, un artefacto parcial o capturas extraídas sin revisar no equivalen a aceptación. Conserva el intento fallido y su causa conocida o no establecida; una recuperación en otro árbol necesita evidencia nueva.

Los manifiestos versionados en `docs/master/evidence/` registran fuentes, pruebas y hashes de capturas propias ya revisadas. Son evidencia histórica de esos árboles, no aceptación automática del HEAD que los contiene. No regeneres un checkpoint antiguo ni repitas un script de congelación para reemplazar una prueba. Si el remoto ha avanzado, lee primero su estado nuevo y conserva los cambios locales.

Consulta el informe readonly antes de cada suite pesada. Si faltan memoria, motor Docker local o dependencias, registra el bloqueo y continúa con trabajo independiente. No habilites variables para evitar `CI_ONLY`, no ejecutes el reset desechable sobre una instalación persistente y no transfieras el PASS de GitHub Actions a Windows. Un CLI verificado fuera de PATH puede existir aunque el doctor indique `NOT_AVAILABLE_ON_PATH`; no cambies el PATH compartido ni imprimas credenciales para demostrarlo.
