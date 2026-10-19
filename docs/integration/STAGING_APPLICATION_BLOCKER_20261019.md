# BLOCKER — activación de aplicación hospedada

Hallazgo de producto, separado de los bloqueos Storage/HTTP de Cowork. En la fuente actual, `src/features/product/integration/mode.ts:2` permite integración únicamente con NODE_ENV distinto de production y orígenes HTTP loopback para app y Supabase. Sus flags PRODUCT_LOCAL_INTEGRATION/PRODUCT_LOCAL_SYNTHETIC/PRODUCT_V1_ENABLED son obligatorios. Los módulos comerciales invocan ese guard en sus páginas y en el layout. Assistant también depende de él.

Por tanto, configurar una URL Supabase hospedada o desplegar el build production actual NO habilita los módulos integrados. El validador product-environment.v1 admite STAGING como configuración, pero no cambia el guard de producto. Esto no es un fallo de las86migraciones ni algo que Cowork deba reparar mediante SQL o un proxy que finja localhost.

No se elimina el guard ni se reutiliza la bandera de prueba para dar acceso cloud. Necesita una unidad propia de aplicación con contrato revisable: activación staging explícita, origen HTTPS exacto y proyecto permitido, cohortes sintéticas autorizadas por identidad, resolver de membresía servidor, rutas dinámicas y pruebas de denegación de producción/demo/cambio de empresa/revocación. Acordar configuración con Cowork y pedir revisión independiente W4 antes de activarla. No se inventa un endpoint ni se presenta este documento como autorización de release.

Prueba existente: tests/bootstrap/product-integration-client.test.mjs exige denegación de production y Supabase remoto. El cierre hospedado requiere además corregir Storage/HTTP, CI aplicable, W4 y restantes flujos. Ninguna URL cloud de aplicación validada en esta sesión.
