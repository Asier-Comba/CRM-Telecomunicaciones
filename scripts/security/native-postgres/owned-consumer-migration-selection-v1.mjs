import {loadOwnedConsumerMigrationsV1,loadOwnedConsumerGrants86V1} from './owned-consumer-migrations-v1.mjs'
import {loadOwnedConsumerProfile87V1,loadOwnedConsumerHistorical86V1} from './owned-consumer-migrations-87-v1.mjs'
import {loadOwnedConsumerD1V1,loadOwnedConsumerHistoricalD1V1} from './owned-consumer-migrations-d1-v1.mjs'
// Caller must name its scope. No inference from file count and no permissive
// fallback: all old modes still use their unchanged strict historical loaders.
export function selectOwnedConsumerMigrationsV1(root,mode){
 switch(mode){
  case undefined:case '':return loadOwnedConsumerMigrationsV1(root)
  case 'delivered_grants_86':return loadOwnedConsumerMigrationsV1(root,mode)
  case 'require_grants_86':return loadOwnedConsumerGrants86V1(root)
  case 'require_profile_87':return loadOwnedConsumerProfile87V1(root)
  case 'historical_grants_86':return loadOwnedConsumerHistorical86V1(root,loadOwnedConsumerGrants86V1)
  case 'require_base87_plus_d1':return loadOwnedConsumerD1V1(root)
  case 'historical_grants_86_from_d1':return loadOwnedConsumerHistoricalD1V1(root,86)
  case 'historical_profile_87_from_d1':return loadOwnedConsumerHistoricalD1V1(root,87)
  default:throw Error('OWNED_CONSUMER_MIGRATION_MODE_REJECTED')
 }
}
