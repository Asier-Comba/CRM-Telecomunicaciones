# Netlify: observación física

URL abierta en navegador Work: `https://crm-telecom-staging-preview.netlify.app/`. Redirige a Team protection: «This site is private», cuenta invitada requerida. El botón normal abre opciones de login Netlify. No se eludió la protección ni se introdujeron credenciales. Evidencia gráfica local conservada y captura de protección incluida en `evidence/netlify-team-protection.png`.

No se alcanzó Facturación ni el login Supabase Auth del CRM. Por tanto, no están medidos el branch de render efectivo, cohortes, permisos comerciales, micrófono, persistencia o SHA desplegado. El último deploy declarado por W5 no se convierte en una verificación propia ni en el HEAD actual de PR159.

La fuente888ecaae contiene tres rutas: IntegratedBilling si `integratedLocalAllowed()`, Billing sintético si `syntheticPreviewAllowed()`, o módulo pendiente. El repositorio integrado hace HTTP al servidor; los textos «local/sintético» de su UI no demuestran por sí solos que la persistencia del despliegue sea memoria local. Tampoco se corrige esa brecha cambiando sólo el copy.

W5 debe proporcionar procedencia del deploy y acceso Team/cohorte ya autorizados. La sesión administrativa obtenida en Supabase no elimina la protección de Netlify.
