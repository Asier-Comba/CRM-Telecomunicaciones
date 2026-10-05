# Product settings v1

Current acceptance: c2a7390867d941a33b17509b3f4014f8356bb0c1, real run37361774116 (1,298 checks), native/quality37361774252 (53 migrations/247 privilege entries/243 Node tests). [Authoritative closure](W1_PRODUCT_CLOSURE_20261005.md) records the limits. Human backend only; UI_SAFE=false pending W2/W4.


POST /api/settings/v1, default-off PRODUCT_V1_ENABLED / exact PRODUCT_V1_ORIGIN, current SSR membership on reads/replay. No browser actor/workspace/role/security fields. UI_SAFE=false.

settings.profile_get {} returns own product display preferences and version0 initially: display_name nullable1..100, timezone validated IANA/UTC, locale es-ES/en-GB/en-US, notification_preferences:{in_app:boolean}. settings.profile_update {command_id,expected_version,profile} replaces these fields with CAS, HMAC replay and atomic value-free audit. owner/admin/member/viewer can update only their own preferences. These are product display preferences, independent of Auth/security identity and credentials. No password/email security operation. Server-selected active workspace authorizes the call; preference belongs to actual user, never browser-selected recipient.

settings.company_get {} returns workspace business profile and version0 initially. settings.company_update {command_id,expected_version,profile} is owner/admin only. Closed profile: trade_name,business_name,business_email,phone,website,address,timezone,locale,description,logo_document_id. Required keys with nullable optional text. Bounds200/200/320/40/500/500/1000; HTTPS business website, no credentials/control chars. No fiscal tax identity duplicated; billing.v1 retains issuer/customer fiscal authority.

Logo is a same-workspace active PNG/JPEG document reference from existing private content flow; no arbitrary image URL/object path/signed public URL. Existing document permissions still authorize bytes. Archived/missing logo is omitted from read DTO. Association does not certify scanner/content safety or give members new download permission; W2 handles denied/unavailable private content explicitly. Existing upload targets still apply.

settings.integrations {} returns7 registered classes with status only: google_calendar,auth_mail,crm_mail,whatsapp,n8n,ai_provider are not_configured because no real adapters are instantiated; storage derives configured/unavailable from actual private bucket bootstrap and validated server transport/configuration. Normal factory also requires content enablement for configured storage. configured is configuration evidence, never a claim of provider connection/health. No env values/secrets/caller connected=true accepted. Degraded/future availability requires an actual registered status source, not browser assertion.

Persisted in_app:false suppresses NEW task-overdue and internal automation notifications. Existing personal notification history remains readable. Forward migration refines private emit/refresh and marks opted-out automation action skipped with no effect; never fake succeeded. CAS and receipt semantics unchanged. Turning preferences back on permits future generation; no external mail/push semantics.

Validation at the recorded accepted source: native/embedded fixtures and real acceptance of five operations, own viewer preference versus denied company role, tenant/revoked-JWT/CAS/changed replay, private PNG upload/reference/archive, exact provider cards and persisted task opt-out.

W2 company/user settings use the exact read version; viewer self-write is an intentional safe role exception. W3 writes remain future Issue10 confirmation candidates, not assistant registrations.
