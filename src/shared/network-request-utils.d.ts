export function buildRequestIdentitySource(record: unknown): string
export function hashString(value: string): string
export function getStableRequestId(record: unknown): string
export function getHeaderValue(
  headers: Array<{ name?: string, value?: string }> | null | undefined,
  targetName: string,
): string
export function inferResourceType(record: unknown): string
