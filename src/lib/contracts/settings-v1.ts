export type SettingsOperationV1='settings.profile_update'|'settings.company_update'
export type ProductPreferencesV1=Readonly<{display_name:string|null;timezone:string;locale:'es-ES'|'en-GB'|'en-US';notification_preferences:{in_app:boolean}}>
export type CompanyProfileV1=Readonly<{trade_name:string|null;business_name:string|null;business_email:string|null;phone:string|null;website:string|null;address:string|null;timezone:string;locale:'es-ES'|'en-GB'|'en-US';description:string|null;logo_document_id:string|null}>
export type SettingsInputV1=Readonly<{command_id:string;expected_version:number;profile:ProductPreferencesV1|CompanyProfileV1}>
