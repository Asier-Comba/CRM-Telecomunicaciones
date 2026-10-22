# Estado comercial por módulo — 21/10/2026

Actualización22/10: [unidad41](UNIT_41_SELECTIVE_COMPOSITION_20261022.md) selecciona
180/fiscal34/181 con158UIcontroladas propias, sin promover filas por agregación.
Facturación mejora recuperación explícita y país; onboarding valida recibo sólo
en UI y bloquea altas tras comprobación fallida. QA38sigue6PASS/3FAIL pendientes
del propietario backend; recuperación durable y alojamiento siguen no aceptados.
La evidencia final/source/tree/CI se publica en issue67, no se hereda de48e.

Índice actual de evidencia, enlazado desde la matriz canónica. No sustituye ni
promueve sus filas históricas. UI presente significa ruta/componente, no producto
completo. Todos los módulos están en la candidata propia; ninguno tiene aceptación
alojada independiente sobre la sucesora. Las pruebas anteriores pertenecen a
8ee0b9ba/treebbf296ae, merge8b906a6e idéntico, run39492445322,116UI/4042backend,
Auth/DB reales DESECHABLES, teardownPASS. La sucesora32–34 necesita su propia CI.
Cada nombre siguiente fue contrastado con el reporte seguro de esa ejecución.
Roles/workspace, persistencia/recarga, errores, teclado y móvil están probados sólo
en los checks nombrados; quedan PARCIALES por módulo, no completos por agregación.
No se han cambiado estados históricos de paridad por conteos globales.

| Módulo / UI | Persistencia, recarga, roles o UX: checks anteriores exactos | Límite actual |
|---|---|---|
| Clientes / Customer360 (`customers/IntegratedCustomers.tsx`) | `customer_create`; `customer360_exact_summary_safe_contacts_independent_domains` | Altas/edición/archivo/recarga y dominio independiente; no prueba exhaustiva de paridad |
| Contactos (`customers/CustomerIntegratedPanels.tsx`) | `contact_create_primary`; `customer360_contact_lost_receipt_keeps_intent_and_single_persisted_effect` | PII/primario/archivo y recuperación; acceso por rol parcial |
| Operadores (`catalog/IntegratedCatalog.tsx`) | `catalog_normal_operator_create_update_deactivate_activate_plan_create` | Administración interna; sin operación real de proveedor |
| Catálogo / tarifas / versiones / precios (`catalog/CatalogVersionCreate.tsx`) | `catalog_normal_price_version_publish_and_reload`; `catalog_actual_version_terms_and_three_widths` | Editor simple; bundles/prestaciones avanzadas no acreditados por editor simple |
| Oportunidades (`opportunities/IntegratedOpportunities.tsx`) | `opportunity_create_edit_win_reopen_lose`; `opportunity_real_drag_keyboard_conflict` | Relaciones cliente/contrato con replay/CAS; paridad completa pendiente |
| Contratos (`portfolio/PortfolioCreate.tsx`) | `contract_sold_version_terms_unknown_response_exact_retry`; `contract_confirmed_write_get_failure_retries_only_read` | Versión vendida explícita; alta draft, sin alta externa |
| Servicios (`portfolio/ServiceSoldVersion.tsx`) | `telecom_three_manual_creates_sold_terms_reload_single_effect`; `service_viewer_normal_masked_location_installation_addon_read_without_writes` | Opt-in versión contrato/cuota/alta; pendiente; local30 además18HTTPPASS |
| Líneas (`portfolio/PortfolioCreate.tsx`) | `telecom_three_manual_creates_sold_terms_reload_single_effect`; `portfolio_service_line_labels_and_transitions` | Relación a servicio, sin nuevo precio ni activación externa |
| SIM / eSIM (`sims`) | `sim_ui_create_protected_identifier_and_scoped_assignment_exact_line_cas`; `sim_manual_activation_confirmation_lost_response_replacement_and_history` | Ciclo manual confirmado; no integración proveedor ni ERPstock completo |
| Portabilidades (`portabilities`) | `portability_ui_masked_number_draft_assignment_and_parent_scoped_creation`; `portability_requested_scheduled_progress_confirmed_no_line_action_read_retry` | Seguimiento manual; completar requiere confirmación, no envío a operador |
| Instalaciones / ubicaciones (`services`) | `service_installation_location_assignment_exact_retry_no_provider_activation`; `service_locations_normal_create_explicit_reveal_masked_cursor_three_widths` | Planificación explícita; ninguna instalación externa ejecutada |
| Incidencias (`cases`) | `case_metadata_assignment_states_resolve_reopen_exact_lost_response`; `case_private_notes_explicit_cursor_reveal_revocation_closed_history_and_global_cancel` | Ancestry/roles/notas privadas; cobertura scoped |
| Permanencias / renovaciones (`portfolio/IntegratedPortfolio.tsx`) | `portfolio_permanence_create_update_cancel_and_renewal_dismiss`; `calendar_manual_renewal_update_resolve` | Operaciones internas; no negociación externa |
| Cartera (`portfolio/IntegratedPortfolio.tsx`) | `portfolio_real_inventory_independent_collections`; `portfolio_confirmed_create_read_failure_retry_never_repeats_command` | Colecciones independientes y recuperación de lectura |
| Agenda (`calendar/IntegratedCalendar.tsx`) | `meeting_create_reschedule_cancel_persist`; `calendar_real_cursor_next_previous` | Estado/relaciones persistidos; sin sync externo asumido |
| Tareas (`calendar/IntegratedCalendar.tsx`) | `task_create_complete_persist`; `task_reopen_start_update_cancel` | Operaciones internas y estado; no aceptar todas variantes por familia |
| Documentos (`documents/IntegratedDocuments.tsx`) | `document_upload_finalize_private_download`; `document_ticket_metadata_revocation` | Ensayo desechable positivo; contenido hospedado afectadoOFF/P0Storage |
| Facturación PRO (`billing/IntegratedBilling.tsx`) | `billing_fiscal_draft_issue_pdf_paid`; `billing_exact_lines_discount_tax_withholding_fx_review_and_replay` | Listado/fiscal/editor/IVA/descuento/vencimiento/borrador/emisión/cobro ensayados; voz realNO;32/34propios45HTTPPASS |
| Recuperación facturación (`billing/IntegratedBilling.tsx`) | `billing_lost_receipt_seven_commands_same_intent_single_persisted_effect`; `billing_invalid_receipt_seven_commands_same_intent_single_persisted_effect` | Nuevos ensayos con observación SQL; original39458747653 causa/efectoUNKNOWN |
| Informes (`reports/IntegratedReports.tsx`) | `reports_exact_scope_period_export_and_error_mobile`; `telecom_nine_reports_real_aggregate_rows_three_widths` | Agregados autorizados; no cerrar todos requisitos de reporting |
| Configuración (`settings/IntegratedSettings.tsx`) | `settings_profile_exact_replay_company_logo_integrations_mobile`; `settings_company_cas_and_notification_optout_truth` | Proveedor desconectado declarado; no configuración exterior asumida |
| Equipo / roles (`settings/TeamInvitations.tsx`) | `team_invite_role_suspend_resume`; `admin_real_login_write_and_owner_protection` | Invitación interna/roles/revocación; email exterior no acreditado |
| IA autorizada (`assistant`) | `polished_contacts_cursor_settings_assistant_day` | Lecturas e historial scoped; escrituras negocioOFF; sin modelo de pago ni aceptación semántica global |
| Onboarding / empresa (`src/app/onboarding/page.tsx`) | NOT_PROVEN: sin recorrido propio completo enlazado | Ruta y contratos presentes; recorrido de alta comercial completo NO acreditado |
| Integraciones / límites / proveedores (`settings/ProductSettingsPanels.tsx`) | NOT_PROVEN: sin recorrido propio completo enlazado | Contratos/configuración presentes; credenciales/env y proveedores vivos pendientes de W5/propietario |

Prioridad por recorrido: (1) cliente→factura borrador→readback y recuperación;
(2) catálogo publicado→contrato→servicio→línea con condiciones; (3) instalación/
portabilidad/incidencia de ese cliente; (4) tareas/agenda, cobros e informes.
Cada nueva aceptación debe identificar source/tree/entorno, positivo autorizado,
negativo de rol/workspace, persistencia tras recarga, error recuperable y anchuras/
teclado realmente ejecutados. No volver a crear las tres altas ya implementadas.
Oier realiza paridad29 de editor/listado en su propia rama; evitar colisión.

Despliegue actual reportado W5: a9e/deploy6ad78f6c810c781fba4f5880, no sucesora.
Voz física NOT_RUN; PDF privado hospedado/Storage no habilitado por un PASS local.
IA negocio writesOFF, env/proveedores no se simulan como conectados. Onboarding,
límites comerciales, paridad completa, accesos y lanzamiento siguen no aceptados.
No gasto, micrófono, cuenta suspendida, hosting, DNS, SQL cloud o proveedor activado.
Ver [handoff32–34](NIGHT_32_34_20261021.md) y la issue67 para la CI de la nueva fuente.
