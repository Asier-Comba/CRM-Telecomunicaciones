# Netlify: observación física

URL abierta en navegador Work: `https://crm-telecom-staging-preview.netlify.app/`. Redirige a Team protection: «This site is private», cuenta invitada requerida. El botón normal abre opciones de login Netlify. No se eludió la protección ni se introdujeron credenciales. Evidencia gráfica local conservada y captura de protección incluida en `evidence/netlify-team-protection.png`.

No se alcanzó Facturación ni el login Supabase Auth del CRM. Por tanto, no están medidos el branch de render efectivo, cohortes, permisos comerciales, micrófono, persistencia o SHA desplegado. El último deploy declarado por W5 no se convierte en una verificación propia ni en el HEAD actual de PR159.

La fuente888ecaae contiene tres rutas: IntegratedBilling si `integratedLocalAllowed()`, Billing sintético si `syntheticPreviewAllowed()`, o módulo pendiente. El repositorio integrado hace HTTP al servidor; los textos «local/sintético» de su UI no demuestran por sí solos que la persistencia del despliegue sea memoria local. Tampoco se corrige esa brecha cambiando sólo el copy.

W5 debe proporcionar procedencia del deploy y acceso Team/cohorte ya autorizados. La sesión administrativa obtenida en Supabase no elimina la protección de Netlify.

## Actualización: sesión iniciada, edge-access devuelve Not Found

Posteriormente se observó una sesión Netlify iniciada en el panel Projects de la cuenta del propietario. No se abrió ni modificó otro proyecto. Al volver a la URL canónica del CRM, la redirección `app.netlify.com/edge-access` del site_id conocido termina en **Page not found / Not Found**, con botón «Log in with a different user». [Captura genérica sin identidad](evidence/netlify-authenticated-edge-not-found.png).

Es un resultado de edge-access de Netlify: no se alcanzó el CRM/Next, su Auth Supabase ni un módulo comercial. No se atribuye todavía a falta de invitación, URL incorrecta u otra causa del sitio sin comprobación del propietario cloud. W5 debe confirmar sitio/team y acceso de la identidad autorizada por canal privado. No quitar Team Protection, habilitar acceso público, cambiar visibilidad ni publicar email/credenciales. La petición concreta se publicó en issue67/6278326863. El bloqueo ya no se describe solamente como falta de login.
