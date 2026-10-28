import 'server-only'
import {createProductUserPortV1} from './product-user-factory-v1'
import {DocumentLibraryServiceV2} from './document-library-service-v2'
export async function createDocumentLibraryUserServiceV2(){const port=await createProductUserPortV1();return port?new DocumentLibraryServiceV2(port):null}
