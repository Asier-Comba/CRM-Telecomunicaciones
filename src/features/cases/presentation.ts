import type {CaseResolutionV1,CaseCancellationV1} from '../../lib/contracts/case-v1.ts'

/** Existing product captions; never a replacement for a command's stored code. */
export const caseResolutionLabelsV1:Readonly<Record<CaseResolutionV1,string>>=Object.freeze({
 issue_fixed:'Problema corregido',request_fulfilled:'Solicitud atendida',customer_confirmed:'Confirmado por el cliente',no_action_required:'No requiere actuación',
})
export const caseCancellationLabelsV1:Readonly<Record<CaseCancellationV1,string>>=Object.freeze({
 customer_withdrew:'El cliente retiró la solicitud',duplicate:'Duplicada',no_longer_needed:'Ya no es necesaria',entered_in_error:'Registro incorrecto',
})

/** The assistant displays both the recorded code and its existing caption.
 * A registered resolution code is not independent confirmation of an outcome. */
export function caseRegisteredCodeLabelV1(code:string|null,kind:'resolution'|'cancellation'):string|null{
 if(code===null)return null
 const labels:Readonly<Record<string,string>>=kind==='resolution'?caseResolutionLabelsV1:caseCancellationLabelsV1
 return Object.hasOwn(labels,code)?`${code} · ${labels[code]}`:code
}
