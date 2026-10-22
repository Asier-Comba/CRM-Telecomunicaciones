// Only the SDK/navigation boundary is controlled. The page and its UI are real.
export const fixture = { redirects: [] as string[], queries: [] as unknown[], unmount: () => {}, leave: () => {} }
Object.assign(window, { onboardingFixture: fixture })
const router = { replace: (path: string) => { fixture.redirects.push(path) }, refresh: () => {} }
export function useRouter() { return router }
async function read(path: string) {
  const response = await fetch(path)
  const payload = await response.json()
  if (payload.throw) throw Error('SYNTHETIC_SDK_DETAIL_DO_NOT_DISPLAY')
  return payload
}
export function getSupabaseBrowserClient() {
  if (new URLSearchParams(location.search).has('unconfigured')) return null
  return {
    auth: { getSession: () => read('/fixture/session') },
    from(table: string) {
      const query = { table, select: '', filters: [] as string[][], limit: 0 }
      const builder = {
        select(value: string) { query.select = value; return builder },
        eq(column: string, value: string) { query.filters.push([column, value]); return builder },
        limit(value: number) { query.limit = value; fixture.queries.push(query); return read('/fixture/memberships') },
      }
      return builder
    },
  }
}
