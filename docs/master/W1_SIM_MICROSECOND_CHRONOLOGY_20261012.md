# Cronología SIM con la precisión de PostgreSQL

Base2f85 `2f850a17f67d1ac8ff2d008da2d1af1a14870014`: own1176/310/native85/320/Supabase107 PASS, audit5HIGH FAIL. Antes de esta corrección, el mismo validador aceptaba updated_at `.123455Z` con created_at `.123456Z`: Date.parse elimina los tres últimos dígitos. Se guarda ese control negativo sobre la base exacta antes de modificar.

`sim-runtime-v1.ts` conserva la gramática ya validada y compara epoch en microsegundos mediante BigInt. No usa Number para la fracción ni acepta fechas que no pasen instant(). Actualización, activación/sustitución/baja/cancelación y secuencia de asociación (asignación/activación/finalización) usan la misma comparación. Igualdad, precisión corta, ausencia de fracción y offsets equivalentes conservan su significado. No cambia formato de DTO ni almacena fechas nuevas.

Regresión específica: un microsegundo antes se rechaza, igualdad y uno después se admiten, offset equivalente se admite, activación anterior a creación y finalización anterior a asignación se rechazan. La corrección se compone con BBA `bba095fa0f5d0634ef7372438ee8aaf2bb49be4f`, que cerró propios1175/310/native85/320/Supabase107; A41 preview18FAIL/Supabase101/6FAIL permanece histórico y no se consume.

La nueva composición exige controles propios1183/310/native85/320/Supabase107, sin heredar los pases de2f85 oBBA. No hay migración, escritura IA activada, recurso W5, nuevo proveedor ni compra. Source32 lecturas/213casos, source documental inerte, modelo vivo NOT_RUN, budgets pendientes, issue10 OPEN y release NOT_ACCEPTED/W4 pendiente.
