/**
 * DevTools HAR / Network 面板共用的请求标识与资源类型推断（单一事实来源）
 * @param {Record<string, unknown> | null | undefined} record
 */
export function buildRequestIdentitySource(record) {
  return [
    record?.startedDateTime || '',
    record?.request?.method || '',
    record?.request?.url || '',
    record?.response?.status ?? '',
    record?.request?.postData?.text || '',
  ].join('||')
}

/** @param {string} value */
export function hashString(value) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }

  return hash.toString(36)
}

/** @param {Record<string, unknown> | null | undefined} record */
export function getStableRequestId(record) {
  const identitySource = buildRequestIdentitySource(record)
  return identitySource ? `req_${hashString(identitySource)}` : `req_${Date.now()}`
}

/**
 * @param {Array<{ name?: string, value?: string }> | null | undefined} headers
 * @param {string} targetName
 */
export function getHeaderValue(headers, targetName) {
  const normalizedName = String(targetName || '').toLowerCase()
  const matchedHeader = Array.isArray(headers)
    ? headers.find(
        header => String(header?.name || '').toLowerCase() === normalizedName,
      )
    : null

  return matchedHeader?.value || ''
}

/** @param {Record<string, unknown> | null | undefined} record */
export function inferResourceType(record) {
  if (['fetch', 'xhr'].includes(record?._resourceType)) {
    return record._resourceType
  }

  const contentType = String(
    record?.response?.content?.mimeType
    || getHeaderValue(record?.response?.headers, 'content-type')
    || '',
  ).toLowerCase()
  const acceptHeader = String(
    getHeaderValue(record?.request?.headers, 'accept') || '',
  ).toLowerCase()
  const requestUrl = String(record?.request?.url || '')
  const hasPayload = !!record?.request?.postData?.text
  const looksLikeApiRequest
    = /\/api\/|graphql|rpc/i.test(requestUrl)
      || hasPayload
      || contentType.includes('json')
      || acceptHeader.includes('json')

  return looksLikeApiRequest ? 'fetch' : ''
}
