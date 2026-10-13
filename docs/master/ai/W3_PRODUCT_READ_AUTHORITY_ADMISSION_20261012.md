# W3 — Identidad inicial y autorización fresca fijadas para la lectura

Tres negativos sintéticos sobreCD25: un adaptador mutaba el objeto de autoridad
inicial a otra empresa y la comparación seguía coincidiendo por compartir esa
referencia; otro reemplazaba deps.authority por la concesión anterior tras
revocación; el resolver podía ocultar un epoch cambiado antes de consultar el
recurso seleccionado. Evidencia local, no incidente/Auth real ni modelo vivo.

El ejecutor fija authority y resolveReference antes del primer await, conservando
this del objeto de dependencias original. Cada respuesta de autoridad se admite
como JSON cerrado de cuatro campos (actor/workspace/role/epoch), strings bounded
y rol conocido; copia inmutable antes de usarla. La identidad inicial no cambia
al mutar una referencia retenida, y todas las verificaciones frescas invocan el
callback original. Cambio/revocación deja access_changed/evidence[], sin lectura
dependiente ni datos entregados. No se cachea una autoridad para evitar la RPC.

No cambia roles/capacidades/permisos/servicios, parser/refs/privacidad ni schema
de planes.33 lecturas/214 casos/220 entradas y28/16/12 de esta rama intactos; sin
SIM hasta composición semántica futura34/215/33_19_14. Nueva fuente requiere1259
(543+716)/334/native85_320+dos ledger13/Supabase107 propios, sin heredarCD25.

Es una corrección de boundary de objetos de adaptador; W4 conserva revisión
independiente sobre la fuente y cincoHIGH/privacidad PUBLIC. No aprobación de
seguridad, reinicio W5, full23, modelo, Storage/RAG operacional ni presupuesto
duradero. IA writes OFF y release NOT_ACCEPTED; fallos Windows5/source anteriores
se conservan. La preparación RAG mantiene el plazo total10s y su probe PDF local
real con authority/download sintéticos.
