# Propiedad y delegación

[CLAIM / REQUEST6275538377](https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-6275538377), rama propia `oier/billing-pro-parity-voice-qa-20261019`, base888ecaae. Última lectura de issue67 antes de crear el banco: sin respuesta posterior a ese REQUEST. Silencio no es ACK.

Asier Work mantiene src comercial, contratos, integración y PR156. Se solicita delegación exacta de `src/features/billing/parse.ts` para los tres fallos reproducidos, con SHA base y declaración de ausencia de edición concurrente; PromptBuilder y composición siguen bajo su decisión. Hasta recibirla sólo se añaden banco propio y documentación en `tools/oier_billing_qa` / `docs/billing-cloud/20261019`. Ningún src, fixture, test ajeno, SQL, configuración o workflow existente se modifica.

Cowork/W5 mantiene cloud, Auth, Storage, Netlify y migraciones. Pendientes: deployID/SHA/config saneada exactos y ventana de QA con identidades sintéticas autorizadas, roles, acciones y limpieza. Ninguna contraseña/token/UUID privado debe publicarse en GitHub. El propietario inició sesión en Supabase desde el navegador de Work; esto permite lecturas administrativas, no sustituye la autorización de operaciones comerciales de prueba.

W4 mantiene aceptación independiente de seguridad. No se adoptó PR158/159 ni se aplicó SQL. No se duplicó recurso nativo W5. El recurso existente y sus ACK históricos conservan únicamente su alcance documentado.
