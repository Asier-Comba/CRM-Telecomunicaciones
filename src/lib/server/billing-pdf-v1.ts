import type { BillingInvoiceV1 } from '../contracts/billing-v1'
import { PdfDoc, measureText } from '../pdf/pdf-doc.ts'
import { parseBillingReadV1 } from './billing-query-runtime-v1.ts'
/** Pure renderer; only authoritative protected records, never caller form fields. */
export function renderBillingPdfV1(invoice:BillingInvoiceV1):Uint8Array|null {
 if(parseBillingReadV1('invoice.get',{id:invoice.id},{contract_version:'billing.v1',operation:'invoice.get',invoice})===null)return null
 const pdf=new PdfDoc();let page=0,y=0
 // Break long fiscal identifiers without ellipsizing or losing authorized text.
 const wrap=(text:string,size:number,width:number)=>{
  const rows:string[]=[];let row=''
  for(const ch of text){
   if(ch==='\n'){rows.push(row);row='';continue}
   if(row&&measureText(row+ch,size)>width){rows.push(row.trimEnd());row=''}
   row+=ch
  }
  if(row)rows.push(row.trimEnd());return rows
 }
 const money=(n:number)=>{const s=String(n).padStart(3,'0');return s.slice(0,-2)+','+s.slice(-2)+' '+invoice.currency}
 const rate=(n:number)=>String(n/100)+'%'
 const quantity=(n:number)=>{const s=String(n).padStart(4,'0');return s.slice(0,-3)+','+s.slice(-3)}
 const title=invoice.number?`${invoice.number.series}/${invoice.number.year}/${String(invoice.number.sequence).padStart(6,'0')}`:'BORRADOR - SIN NUMERO FISCAL'
 function footer(){pdf.line(40,785,555,785);pdf.text(`${title}  |  ${page}`,40,800,{size:9,color:[0.4,0.45,0.5]})}
 function header(){page++;pdf.text('FACTURA',40,38,{size:23,bold:true,color:[0.06,0.2,0.35]});pdf.text(title,555,46,{size:12,bold:true,align:'right',maxWidth:365});pdf.text(`Emision: ${invoice.issue_on}   Vencimiento: ${invoice.due_on??'-'}   Estado: ${invoice.status}`,40,76,{size:10});pdf.line(40,94,555,94);y=112}
 function space(height:number){if(y+height>760){footer();pdf.addPage();header()}}
 function paragraph(s:string,size=10,width=515,x=40){for(const row of wrap(s,size,width)){space(size+6);pdf.text(row,x,y,{size});y+=size+6}}
 header()
 const issuer=invoice.issuer,customer=invoice.customer_fiscal
 pdf.text('EMISOR',40,y,{size:10,bold:true});y+=20
 if(issuer){paragraph(issuer.legal_name,12);paragraph(`${issuer.tax_id} | ${issuer.address}`);paragraph(`${issuer.postal_code} ${issuer.city}, ${issuer.region}, ${issuer.country}`)}else paragraph('Datos fiscales del emisor pendientes. Borrador no emitido.')
 y+=12;pdf.text('CLIENTE',40,y,{size:10,bold:true});y+=20
 if(customer){paragraph(customer.legal_name,12);paragraph(`${customer.tax_id} | ${customer.address}`);paragraph(`${customer.postal_code} ${customer.city}, ${customer.region}, ${customer.country}`)}else paragraph('Datos fiscales del cliente pendientes. Borrador no emitido.')
 y+=16
 for(const [index,line]of invoice.lines.entries()){
  const description=wrap(`${index+1}. ${line.description}`,10,499)
  space(description.length*16+36)
  pdf.rect(40,y-5,515,description.length*16+33,{fill:index%2===0?[0.96,0.97,0.98]:[1,1,1]})
  for(const row of description){pdf.text(row,48,y,{size:10});y+=16}
  pdf.text(`${quantity(line.quantity_milli)} x ${money(line.unit_price_minor)}  |  Descuento ${rate(line.discount_bps)}  |  IVA ${rate(line.tax_bps)}  |  Retencion ${rate(line.withholding_bps)}`,48,y,{size:9,maxWidth:500,color:[0.25,0.3,0.35]});y+=33
 }
 space(120);y+=10;pdf.line(300,y,555,y);y+=20
 for(const [label,value]of [['Base',invoice.totals.subtotal_minor],['IVA',invoice.totals.tax_minor],['Retencion',invoice.totals.withholding_minor]] as const){pdf.text(label,310,y,{size:11});pdf.text(money(value),555,y,{size:11,align:'right'});y+=21}
 pdf.text('TOTAL',310,y,{size:14,bold:true});pdf.text(money(invoice.totals.total_minor),555,y,{size:14,bold:true,align:'right'});y+=30
 if(invoice.fx)paragraph(`Tipo de cambio de referencia: ${invoice.fx.rate_micros}/1000000 a EUR. Fecha ${invoice.fx.on}. Fuente ${invoice.fx.source}. Importes de esta factura en ${invoice.currency}.`,9)
 if(invoice.notes){y+=12;paragraph('Notas',10);paragraph(invoice.notes,9)}
 footer();return pdf.bytes()
}
