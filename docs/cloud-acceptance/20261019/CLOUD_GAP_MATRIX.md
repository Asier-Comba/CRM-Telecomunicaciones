# CLOUD_GAP_MATRIX

Fuente inicial PR156 `5332d9899eb1062a7db6b1800e9f0eda1151bac3`; observación posterior `2cbdc4b66315a52720c19c60e5d7ebe4e6adc996`; propuesta y deploy declarado W5/PR159 `bb16afe512be1cb04d6c86ecadb2064966a062aa`. Fecha de corte 2026-10-19T18:59:45.925355+00:00. CLAIM[6274698885](https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-6274698885). Las fuentes son candidatas, no composición aceptada. No herencia de PASS entre SHAs.

| ID | Gravedad | Brecha | Responsable | Prueba necesaria |
|---|---|---|---|---|
| G01 | P0 | Storage revocation | W5/W4 | Owner correction, private same-JWT/same-URL post-revocation proof incl.cache; no Oier exploit probe |
| G02 | P0 | Independent security and multi-tenant cloud acceptance | W4/W5/Integrator | Authorized A/B/role/suspended-member hosted evidence on exact composition |
| G03 | P0 | Public security disclosure risk | Owners/W4 | Visibility decision/private evidence channel; no permission change by Oier |
| G04 | P1 | Cloud metadata access | W5/Owner | Read-only project-scoped authorization or signed sanitized export; no credentials |
| G05 | P1 | 86/87 source-consumer composition | Integrator/W5 | Review PR159 plus recent product deltas; ordered version/hash manifest and compatibility on new source |
| G06 | P1 | Native closure86 blocks PR159 | W5/consumer owners | Explicit agreed migration closure update and physical own-pin validation; do not merely bump count or duplicate resource |
| G07 | P1 | Environment inventory drift | W5 | Regenerate/review own manifest against chosen source; rerun --check without dropping assertions |
| G08 | P1 | Deployment provenance/manual Netlify config | W5 | Version sanitized netlify.toml; signed deploy ID/source SHA/config/build digest and secret reference names only |
| G09 | P1 | Hosted QA window/cohort | Integrator/W5 | Private preview access + synthetic cohort + precise permitted actions/time/cleanup; then18 prepared cases |
| G10 | P1 | Backup/restore enterprise proof | W5/Owner | Plan/cost decision and DB/Auth/object/offsite restore with RPO/RTO; do not restore live staging |
| G11 | P1 | CI and dependencies | Integrator/W5/W4 | Five HIGH and all-ref/enterprise failures remain, preserve logs; exact-source successful required checks |
| G12 | P1 | 342 individual requirements | Integrator/Oier/W4 | Map source contracts and per-row hosted/visual/security evidence; no global-count promotion |
| G13 | P1 | Historical provenance | Owners/Oier | Resolve39 refs without exact-history proof and4060 unmatched files by ownership; no bulk upload |

Las brechas no autorizan intervenir recursos ni cambiar contratos ajenos. La corrección se pide al propietario con ACK explícito; su silencio no cierra ninguna fila. Las métricas no medidas permanecen null/NOT_VERIFIED.
