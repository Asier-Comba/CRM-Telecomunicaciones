import { isStrictIsoUtcDateTime } from './w2-runtime-validation.ts'
import type { TenantEpoch } from './w2-tenant-boundary.ts'

export type ConnectivityState<T> =
  | {
      status: 'online'
      tenantEpoch: TenantEpoch
      authorizedSnapshot: Readonly<{ data: T; asOf: string }> | null
    }
  | {
      status: 'offline_with_snapshot'
      tenantEpoch: TenantEpoch
      snapshot: Readonly<{ data: T; asOf: string }>
    }
  | { status: 'offline_empty'; tenantEpoch: TenantEpoch }
  | { status: 'access_revoked'; tenantEpoch: null }

export type ConnectivityEvent<T> =
  | {
      type: 'authorized_snapshot_received'
      tenantEpoch: TenantEpoch
      data: T
      asOf: string
    }
  | { type: 'went_offline' }
  | { type: 'went_online' }
  | { type: 'access_revoked' | 'workspace_switched' | 'logout' }

export type ConnectivityPolicy = Readonly<{
  showOfflineNotice: boolean
  dataIsStale: boolean
  readAllowed: boolean
  mutationsAllowed: false
  queueMutations: false
  persistentTenantCacheAllowed: false
}>

export const createOnlineConnectivityState = <T>(
  tenantEpoch: TenantEpoch,
): ConnectivityState<T> => ({
  status: 'online',
  tenantEpoch,
  authorizedSnapshot: null,
})

/**
 * Offline mode may retain the current in-memory authorized snapshot only. It
 * never queues writes or persists tenant data across a security boundary.
 */
export function transitionConnectivity<T>(
  current: ConnectivityState<T>,
  event: ConnectivityEvent<T>,
): ConnectivityState<T> {
  if (
    event.type === 'access_revoked' ||
    event.type === 'workspace_switched' ||
    event.type === 'logout'
  ) {
    return { status: 'access_revoked', tenantEpoch: null }
  }
  if (current.status === 'access_revoked') return current

  if (event.type === 'authorized_snapshot_received') {
    if (
      current.status !== 'online' ||
      event.tenantEpoch !== current.tenantEpoch ||
      !isStrictIsoUtcDateTime(event.asOf)
    ) {
      return current
    }
    return {
      ...current,
      authorizedSnapshot: { data: event.data, asOf: event.asOf },
    }
  }
  if (event.type === 'went_offline') {
    if (current.status !== 'online') return current
    return current.authorizedSnapshot === null
      ? { status: 'offline_empty', tenantEpoch: current.tenantEpoch }
      : {
          status: 'offline_with_snapshot',
          tenantEpoch: current.tenantEpoch,
          snapshot: current.authorizedSnapshot,
        }
  }
  if (event.type === 'went_online') {
    if (current.status === 'online') return current
    return {
      status: 'online',
      tenantEpoch: current.tenantEpoch,
      authorizedSnapshot:
        current.status === 'offline_with_snapshot' ? current.snapshot : null,
    }
  }
  return current
}

export const connectivityPolicy = <T>(
  state: ConnectivityState<T>,
): ConnectivityPolicy => ({
  showOfflineNotice:
    state.status === 'offline_empty' ||
    state.status === 'offline_with_snapshot',
  dataIsStale: state.status === 'offline_with_snapshot',
  readAllowed:
    state.status === 'online' || state.status === 'offline_with_snapshot',
  mutationsAllowed: false,
  queueMutations: false,
  persistentTenantCacheAllowed: false,
})

