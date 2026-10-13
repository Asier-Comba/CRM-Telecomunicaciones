# W3 — Autoridad documental admitida por descriptor

Tres negativos sintéticos en E13: autoridad inicial con getter de rol,
revocación de epoch oculta por un Proxy get y acceso al material preparado con
getter de empresa. La fuente previa los admite; no prueba un incidente real de
Auth/Storage ni un modelo vivo. La evidencia inicial queda conservada.

Se extrae sin cambiar su comportamiento la admisión de autoridad de E13 a
read-authority-snapshot-v2.ts y se reutiliza en preparación documental, cada
autorización fresca y lectura interna del material. Solo cuatro campos de datos
cerrados, strings acotados y rol conocido; copia inmutable. No se invocan getters
de identidad ni se compara contra valores sustituidos por Proxy get. La
asimilación Promise puede consultar then y la prueba cuenta solo campos de
autoridad. La primera prueba corregida confundía ambos y se conserva su fallo.

Owner/admin, revisión de documento/target/versión/opt-in, bytes/hash/chunks y
plazo total10s siguen requeridos. El handle privado no autoriza reutilización:
la lectura del material también admite la autoridad actual. No se cachea una
concesión ni se añade Storage, índice, embeddings o llamada de modelo.

La fuente requiere sus propios1262 (543+719)/334/native85_320 con dos
observaciones13/Supabase107; sin heredar E13. El banco permanece33/214/220 y
historial de rama28/16/12 (sin SIM). Futura composición SIM requiere34/215 y
33/19/14 observados en su fuente. Windows5, fallos anteriores y cincoHIGH se
conservan. W4 revisa independientemente; recurso/reinicio W5/full23 pendientes.
IA writes OFF; release NOT_ACCEPTED.
