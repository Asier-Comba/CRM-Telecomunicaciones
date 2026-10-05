import { PageHeader } from '@/components/PageHeader'
import { syntheticPreviewAllowed } from '@/lib/telecom-preview/access'
import { integratedLocalAllowed } from '@/features/product/integration/mode'
import { IntegratedInbox } from '@/features/inbox/IntegratedInbox'
import { Inbox } from '@/features/inbox/Inbox'
export default function InboxPage() {
  if (integratedLocalAllowed()) return <IntegratedInbox/>
  if (!syntheticPreviewAllowed())
    return (
      <PageHeader
        title="Inbox"
        description="Canales pendientes de conexión y autorización."
      />
    )
  return (
    <Inbox
      threads={[
        {
          id: 'thread_demo_norte',
          customerId: 'cust_demo_norte_0001',
          customer: 'Empresa Norte Telecom SL',
          subject: 'Consulta sobre renovación',
          channel: 'WhatsApp · ejemplo',
          owner: 'Comercial Demo A',
          unread: true,
          messages: [
            {
              direction: 'inbound',
              text: 'Mensaje de ejemplo: queremos revisar las condiciones de conectividad.',
              time: '30 sep · 10:15',
            },
            {
              direction: 'outbound',
              text: 'Ejemplo de respuesta revisada: prepararemos una propuesta para la reunión.',
              time: '30 sep · 10:20',
            },
          ],
        },
        {
          id: 'thread_demo_costa',
          customerId: 'cust_demo_costa_0003',
          customer: 'Costa Digital Ejemplo SL',
          subject: 'Propuesta de servicios',
          channel: 'Email · ejemplo',
          owner: 'Comercial Demo B',
          unread: false,
          messages: [
            {
              direction: 'inbound',
              text: 'Mensaje de ejemplo: ¿podemos revisar la propuesta en la próxima reunión?',
              time: '30 sep · 09:40',
            },
          ],
        },
      ]}
    />
  )
}
