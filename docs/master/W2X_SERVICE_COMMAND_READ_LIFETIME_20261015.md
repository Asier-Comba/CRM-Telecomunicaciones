# Instalación: retiro del refresco al cambiar el contexto

CLAIM6203001640. Dos reproducciones originales fallaron y dos positivos vigentes pasaron (42,2 s): con comando pendiente, cambiar a otro servicio y liberar el recibo iniciaba la consulta del servicio retirado; con consulta de refresco pendiente, cambiar de servicio y liberarla iniciaba la consulta del contrato retirado. Fallos antes de las nuevas dependencias, delta medido 0 esperado / 1 observado. Recibo sintético cerrado válido, servicio e instalación avanzan a versión 2; ningún efecto SQL se deduce de estas pruebas.

El callback de refresco comprueba vigencia antes de consultar, después del servicio y después de sus relaciones. La limpieza del contexto invalida la lectura; la consulta inicial conserva su control propio. No se cancela el comando ya enviado, no se emite otro y se conserva la recuperación del recibo actual.

El banco físico de navegador usa los componentes, repositorio y parsers actuales, con respuestas HTTP sintéticas. Dos fases por referencia/empresa/actor/rol/vigente y tres anchos. En la fase de refresco el fixture ya tiene el resultado registrado, también para el contexto sintético remontado; la comprobación causal original referencia/vigente no cambia. Se añade el banco completo de alta/borrador/relaciones de portabilidad y servicio. No acredita Auth/DB real, RLS, aprovisionamiento ni aceptación completa del servicio.

Composición del alta de portabilidad únicamente después de su publicación, con controles propios de la fuente resultante y sin heredar 45/999 verdes. HIGH5 visible; IA writes OFF, modelo NOT_RUN/API0, W4 independiente, issue10 OPEN, release NOT_ACCEPTED.
