import 'server-only'
import {createProductUserPortV1} from './product-user-factory-v1'
import {PortfolioServiceV1} from './portfolio-service-v1'
export async function createPortfolioUserServiceV1(){const port=await createProductUserPortV1();return port?new PortfolioServiceV1(port):null}
