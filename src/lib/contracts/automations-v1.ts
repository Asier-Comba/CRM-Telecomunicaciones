export type AutomationOperationV1='automation.create'|'automation.update'|'automation.enable'|'automation.disable'|'automation.process_pending'
export type AutomationDefinitionV1=Readonly<{name:string;trigger_id:'customer.created';condition:{account_kind:'legal_entity'|'sole_trader'|null};action:{action_id:'notification.create'|'task.create';recipient_user_id:string}}>
export type AutomationInputV1=Readonly<Record<string,unknown>&{command_id:string;id?:string;expected_version?:number}>
export type AutomationReadInputV1=Readonly<{id?:string;limit?:number;after_id?:string}>
