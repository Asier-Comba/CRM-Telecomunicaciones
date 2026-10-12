import {openPersistentNativeFixtureSessionV1} from './persistent-fixture-session.mjs'
import {createDurableNativeWorkerConnectionV3} from './durable-native-driver-connection-v3.mjs'

// Partial business-driver implementation: connectWorker only. No metadata or
// other five scenario exports yet; the complete acceptance runner must reject
// this module until implemented. No resource creation/restart or W5 ACK implied.
const connection=createDurableNativeWorkerConnectionV3(openPersistentNativeFixtureSessionV1)
export const connectWorker=connection.connectWorker
export const inspectWorkerConnectionV3=connection.inspectWorkerConnection
export const closeWorkerV3=connection.closeWorker
