/** Protected internal roster. Invitation intent never sends email or grants membership. */
type CAS={command_id:string;id:string;expected_version:number}
export type TeamAssignableRoleV1='admin'|'member'|'viewer'
export type TeamInputsV1={
 'member.invite_intent':{command_id:string;email:string;role:TeamAssignableRoleV1}
 'member.role_change':CAS&{role:TeamAssignableRoleV1}
 'member.suspend':CAS
 'member.resume':CAS
 'member.remove':CAS
 'member.cancel_invite':CAS
}
export type TeamOperationV1=keyof TeamInputsV1
export type TeamReceiptV1=Readonly<{contract_version:'team.v1';operation:TeamOperationV1;command_id:string;id:string;version:number;status:'active'|'suspended'|'removed'|'pending'|'cancelled'}>
export type TeamListInputV1={limit?:number;after_id?:string}
export type TeamMemberV1=Readonly<{id:string;user_id:string;version:number;role:'owner'|TeamAssignableRoleV1;status:'active'|'suspended'|'removed'}>
export type TeamListV1=Readonly<{contract_version:'team.v1';operation:'member.list';items:readonly TeamMemberV1[];next_id:string|null}>
