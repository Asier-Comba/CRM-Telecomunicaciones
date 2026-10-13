# Aislamiento del borrador de prueba de facturas

1CEAB cerró1202/316/native85/320 propios y pasó historial/grounding de
Auth/PostgREST/cookie real, incluida lectura no vacía/revocación y el ledger
corregido23/13/10. Supabase completo quedó FAIL después en
`CHECK_BILLING_ACTUAL_PROPOSAL_NO_INVOICE`, antes del producto. Esa prueba
preexistente exige cero facturas porque normalizar una propuesta no debe guardar
ninguna. El fixture de grounding había creado un borrador y no lo retiraba.

La corrección restaura exclusivamente ese borrador sintético al acabar grounding,
también en una salida fallida. El módulo ya exige GitHubActions=true, Supabase
127.0.0.1:54321 y aplicación127.0.0.1:3109. Se valida el UUID devuelto por W1 y se
acota limpieza a ID/workspace/cliente/creador, estado draft, versión1 y serieGR.
Se retiran primero sus líneas y después la factura, en una transacción, con
comprobación posterior de ausencia del ID propio. No se vacía un workspace ni se
retiran otras facturas/recursos; si el fixture cambió inesperadamente, no se borra
y el control de limpieza falla. No hay DELETE en el lector del asistente.

El control de propuesta no se modifica ni se relaja. Los dos FAIL anteriores
permanecen con sus SHA y artefactos seguros. El nuevo commit exige controles
completos propios antes de consumo; no hereda107 ni acepta retrospectivamente
4F2AB/1CEAB. Código de producto, parsers, SQL/migraciones, W4/W5 y timeouts
permanecen. IA writesOFF, modelo vivoNOT_RUN, RAG inerte, releaseNOT_ACCEPTED.
