import {teamHttpV1} from '@/lib/server/team-http-v1'
import {createTeamUserServiceV1} from '@/lib/server/team-user-factory-v1'
export const runtime='nodejs'
export async function POST(request:Request){
 if(process.env.PRODUCT_V1_ENABLED!=='true')return Response.json({ok:false,error:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}})
 return teamHttpV1(request,'commands',createTeamUserServiceV1,process.env.PRODUCT_V1_ORIGIN)
}
