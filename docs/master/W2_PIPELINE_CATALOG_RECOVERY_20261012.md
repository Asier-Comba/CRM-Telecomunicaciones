# Recuperación del catálogo del pipeline

## Problema reproducido

En el componente de Oportunidades integrado, un error al consultar las etapas
compartía el mismo aviso con las búsquedas y la lectura de detalles. Una búsqueda
posterior válida eliminaba ese aviso aunque las etapas seguían sin cargarse.
No existía una acción para recuperar el catálogo sin abandonar el contexto.

La regresión usa el componente, repositorio y parsers reales con transporte
sintético: primera consulta de etapas devuelve `internal_safe`, búsqueda y detalle
devuelven contratos válidos. El aviso desaparecía en la fuente142CB, con tres
fallos confirmados en390/768/1440. Las dos ejecuciones anteriores de desarrollo
del test tuvieron un localizador incorrecto y un DTO de búsqueda inválido; se
conservan aparte y no se presentan como defectos del producto.

## Cambio

El catálogo tiene aviso y estado de carga separados de la búsqueda. Reintentar
etapas consulta el repositorio actual, mantiene los resultados visibles y evita
consultas de recuperación simultáneas. El aviso continúa durante el reintento y
solo se elimina al recibir un catálogo válido. Crear una oportunidad continúa
requiriendo etapas y rol autorizados.

La limpieza del contexto invalida la consulta pendiente. Una respuesta tardía
del actor o empresa anteriores no puede sustituir las etapas actuales. No se
modifican parsers, permisos, comandos, SQL, contratos ni fuentes W4/W5.

## Controles propios

`pipeline-catalog-recovery.spec.ts` prueba el error persistente tras búsqueda,
recuperación por teclado, resultados conservados, exclusión de consultas
simultáneas y descarte de respuestas del contexto anterior en tres anchuras.
Se ejecutan también los seis recorridos existentes de consultas vigentes y
etapas ocupadas. Los datos son sintéticos y no hay comandos ejecutados.

Las capturas propias se toman después de comprobar la etapa y tarjeta recuperadas.
La revisión visual es acotada a esas tres capturas; no acredita el producto completo.
La captura histórica82A de Oportunidades tomada durante carga se conserva como
diagnóstico y no como aceptación visual de un pipeline cargado.

Los nueve recorridos locales, tipos y lint deben cerrar en el commit publicado.
La PR exige después sus controles nuevos:1188 funcionales,316 recorridos de vista
previa y107 de Auth/DB desechable, sin heredar PASS de142CB. Modelo vivo NOT_RUN,
RAG inerte, escrituras IA OFF, auditoría HIGH y W4 pendientes; release NOT_ACCEPTED.
