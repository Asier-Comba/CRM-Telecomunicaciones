# CLOUD_STATUS — CLOUD_PARTIAL

Fuente inicial PR156 `5332d9899eb1062a7db6b1800e9f0eda1151bac3`; observación posterior `2cbdc4b66315a52720c19c60e5d7ebe4e6adc996`; propuesta y deploy declarado W5/PR159 `bb16afe512be1cb04d6c86ecadb2064966a062aa`. Fecha de corte 2026-10-19T18:59:45.925355+00:00. CLAIM[6274698885](https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-6274698885). Las fuentes son candidatas, no composición aceptada. No herencia de PASS entre SHAs.

Tres inventarios: código en SOURCE_PINS.json y evidence/source-observations.json; cloud en CLOUD_INVENTORY.json; producto en COMMERCIAL_CLOUD_ACCEPTANCE.json.

| Código | Constatación propia | Consecuencia |
|---|---|---|
| PR38/150/153/155 | Pins exactos y CI en evidence/ci-observations.json | Históricos/candidatos, sin aceptación de integración actual |
| PR156 inicial5332 | 86 migraciones; guard local; 23 consumidores con40001 y sin tokenPT409 | No equivale a la rama que W5 declara hospedada |
| PR159 bb16 | 87 migraciones; guard hosted; 23 consumidores incorporanPT409 | Es otra rama; comparar composición y contratos antes de aceptar |
| PR158 be71 | 87 migraciones, pero adicional distinta aPR159 | Contar87 no identifica esquema ni corrección aplicada |
| PR156 posterior2cbd | Cuatro blobs de guard/manifest/consumidor/pin iguales al inicial | Sólo comparación estática; no hereda pruebas ni se audita entero como inicial |

El conector deniega get_project y list_migrations para el único staging autorizado: BLOCKER_ACCESS. No se probaron otros proyectos, usuarios ni claves. Los87/319funciones/15HTTPPASS provienen de W5 comentario6274038554; no son medidas propias.

HEAD anónimo sobre `/` de la preview devuelve401/Netlify (evidence/preview-boundary.json). Sólo acredita esa frontera en ese instante. No hubo login, acceso a datos, bypass o recorrido funcional; no identifica por sí solo el SHA desplegado. No se ejecutará E2E con una procedencia de deploy sin verificar.

CI del inicial5332: CI39301833797 FAIL, Enterprise39301833804 FAIL, all-ref39301833822 FAIL y Supabase local39301833886 CANCELLED en consulta posterior. No se convierte el run cancelado aPASS por jobs parciales ni por el comentario del propietario. El snapshot inicial in_progress queda conservado junto al cierre posterior. CI y Auth/DB local en un runner cloud siguen siendo SUPABASE_LOCAL, no SUPABASE_CLOUD.

Los cinco HIGH reportados por el integrador y la revisión independiente W4 siguen abiertos. IA writesOFF, modelo vivoNOT_RUN y releaseNOT_ACCEPTED. Sin writes cloud ni producción.
