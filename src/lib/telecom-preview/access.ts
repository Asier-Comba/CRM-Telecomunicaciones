/** Server rendering and fixture endpoints must both fail closed in production. */
export function syntheticPreviewAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.PRODUCT_LOCAL_INTEGRATION !== 'true' && process.env.NEXT_PUBLIC_ENABLE_DEMO_DATA === 'true'
}
