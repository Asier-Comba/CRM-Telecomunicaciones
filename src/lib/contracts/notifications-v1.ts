export type NotificationOperationV1='notification.refresh'|'notification.mark_read'|'notification.mark_all_read'
export type NotificationInputV1=Readonly<{command_id:string;expected_version:number;id?:string}>
export type NotificationListInputV1=Readonly<{limit?:number;after_id?:string}>
export type NotificationRecordV1=Readonly<{id:string;kind:'task_overdue'|'customer_created';title:'Tarea vencida'|'Nuevo cliente';summary:'Revise el registro autorizado.';target:{kind:'task'|'customer';id:string};created_at:string;read_at:string|null}>
