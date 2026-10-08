import {integratedLocalAllowed} from '@/features/product/integration/mode'
import {IntegratedAttention} from '@/features/attention/IntegratedAttention'
import {PageHeader} from '@/components/PageHeader'
export default function AttentionPage(){return integratedLocalAllowed()?<IntegratedAttention/>:<PageHeader title="Centro de atención" description="Los seguimientos requieren una conexión autorizada."/>}
