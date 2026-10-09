/** Preserve backend integer amounts; only bounded visual ratios become JS numbers. */
export function minorAmount(value:string,currency:string){const n=BigInt(value);return (n/BigInt(100)).toLocaleString('es-ES')+','+(n%BigInt(100)).toString().padStart(2,'0')+' '+currency}
export function amountBarPercent(value:string,max:string){const v=BigInt(value),m=BigInt(max);return m===BigInt(0)?0:Number(v*BigInt(10000)/m)/100}
export function analyticsMonth(value:string){return new Intl.DateTimeFormat('es-ES',{year:'numeric',month:'short',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z'))}
