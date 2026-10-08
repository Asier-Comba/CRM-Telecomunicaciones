import {portfolioHttpV1} from '@/lib/server/portfolio-http-v1'
import {createPortfolioUserServiceV1} from '@/lib/server/portfolio-user-factory-v1'
export const runtime='nodejs'
export async function POST(request:Request){
 if(process.env.PRODUCT_V1_ENABLED!=='true')return Response.json({ok:false,error:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}})
 return portfolioHttpV1(request,'commands',createPortfolioUserServiceV1,process.env.PRODUCT_V1_ORIGIN)
}
