# W2 — Customer360 conserva la última consulta del cliente

Negativo reproducido con componente/repositorio/parsers reales y Chromium en
390/768/1440: una respuesta inicial retenida sustituía una versión2 obtenida por
«Volver a consultar». También reabría el cliente después de que esa consulta más
reciente hubiera sido denegada. Seis negativos, cero comandos. Transporte
sintético: no acredita incidente con datos reales ni causa de timeouts Auth.

Lecturas iniciales, manuales y tras un comando comparten ahora una generación.
Solo la generación actual puede actualizar cliente/error/contactos/cursor; la
salida del scope invalida cualquier respuesta pendiente. Se conserva el remount
por ID, los permisos, repositorios, intentos idempotentes y editores existentes.
No cambia servicio, SQL, acciones disponibles ni controles de versión.

La fuente corregida debe superar seis positivos y los recorridos previos de
scope del recurso en sus tres anchuras, además de tipos/lint. Publicación en la
PR142 existente solo tras controles terminales de su padre, con nuevos propios
1241/334/native85_320+ledger13/Supabase107. No PASS heredados.

IA writes OFF, release NOT_ACCEPTED, cincoHIGH sin ocultar. W4 mantiene revisión
independiente; W5 mantiene recurso/reinicio. Estas pruebas no son Auth/DB/modelo.
