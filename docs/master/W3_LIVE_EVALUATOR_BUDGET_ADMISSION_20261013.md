# Admisión de evaluación pagada — W3

El evaluador existente `scripts/assistant/eval-live-v2.ts` recorría todo el banco
con una clave configurada y `--live`, aunque declaraba el coste desconocido y no
tenía reserva ni liquidación persistente. La autorización actual permite como
máximo 1.500.000 microUSD compartidos y 500.000 microUSD en el primer lote;
aquella ruta no podía aplicar esos límites.

Ahora la invocación explícita con proveedor configurado devuelve `NOT_RUN`,
`durable_shared_budget_controller_not_installed` y código de salida 2, antes de
solicitar una respuesta. No existe un flag de entorno que permita omitir la
barrera. Las rutas sin clave o sin `--live` conservan sus motivos anteriores.
El banco y los contratos de puntuación permanecen intactos; este cambio retira
exclusivamente el bucle pagado sin control de gasto.

Reproducción previa mediante transporte inerte instalado antes de importar el
ejecutable: 220 invocaciones simuladas sin admisión presupuestaria. Ninguna
petición salió a OpenAI y no se consumió saldo. Tres pruebas focalizadas del
ejecutable corregido comprueban la denegación, los motivos previos y el rechazo
de aprobaciones presupuestarias inventadas en el entorno.

Esto acredita la barrera de entrada, **no un límite de gasto ya implementado**.
Para habilitar la evaluación siguen pendientes: secreto privado del backend,
modelo y tarifas comprobados, muestra diagnóstica pequeña, cota verificable de
tokens, reserva acumulada persistente antes de cada llamada y liquidación con
uso medido. Un timeout, pérdida de acuse o coste desconocido debe conservar su
reserva; ni un reinicio ni una nueva tanda pueden restablecer el saldo. W5 ha
confirmado expresamente consumo cero y W3 como único consumidor autorizado.

Modelo vivo NOT_RUN; solicitudes reales 0; IA writes OFF; release NOT_ACCEPTED.
