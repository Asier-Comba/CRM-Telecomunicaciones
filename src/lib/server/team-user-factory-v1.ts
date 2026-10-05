import 'server-only'
import {createProductUserPortV1} from './product-user-factory-v1'
import {TeamServiceV1} from './team-service-v1'
export async function createTeamUserServiceV1(){const port=await createProductUserPortV1();return port?new TeamServiceV1(port):null}
