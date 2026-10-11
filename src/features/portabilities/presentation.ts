import type {PortabilityReasonV1} from '@/lib/contracts/portability-v1'

/** Presentation only; these labels never replace the command's reason code. */
export const portabilityReasonLabels:Readonly<Record<PortabilityReasonV1,string>>={
 subscriber_mismatch:'Titular no coincidente',
 number_not_found:'Número no localizado',
 authorization_missing:'Falta autorización',
 ineligible_contract:'Contrato no elegible',
 donor_rejected:'Rechazo del operador origen',
 technical_failure:'Fallo técnico',
 customer_withdrew:'Solicitud retirada por el cliente',
 duplicate_request:'Solicitud duplicada',
}

export function portabilityReasonLabel(code:string){
 return Object.hasOwn(portabilityReasonLabels,code)?portabilityReasonLabels[code as PortabilityReasonV1]:code
}
