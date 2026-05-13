export function parseJsonSafely<T = unknown>(value: string): T | null {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as T
  }
  catch {
    return null
  }
}

interface RuleLike {
  open?: boolean
  matchType?: string
  matchMethod?: string
  request?: string
  responseText?: string
}

interface RecordLike {
  request?: {
    method?: string
    postData?: {
      text?: string
    }
    queryString?: Array<{ name?: string, value?: string }>
    url?: string
  }
}

function isRegExpMatch(regStr: string, value: string) {
  try {
    const regParts = regStr.match(/^\/(.*)\/([gims]*)$/)
    const regexp = regParts
      ? new RegExp(regParts[1], regParts[2])
      : new RegExp(regStr)
    return regexp.test(value)
  }
  catch (error) {
    console.error(error)
    return false
  }
}

function parseRequestPayload(payloadText?: string) {
  if (!payloadText) {
    return payloadText
  }

  try {
    return JSON.parse(payloadText)
  }
  catch {
    try {
      const params = new URLSearchParams(payloadText)
      const obj: Record<string, string> = {}
      let hasKeys = false

      params.forEach((value, key) => {
        obj[key] = value
        hasKeys = true
      })

      return hasKeys ? obj : payloadText
    }
    catch {
      return payloadText
    }
  }
}

function hasPayloadMatch(value: unknown, target: string): boolean {
  if (!target || value === null || value === undefined) {
    return false
  }

  if (typeof value === 'object') {
    if (
      (typeof FormData !== 'undefined' && value instanceof FormData)
      || value instanceof URLSearchParams
    ) {
      const entries = (value as any).entries()
      for (const [key, entryValue] of entries) {
        if (key.includes(target) || hasPayloadMatch(entryValue, target)) {
          return true
        }
      }

      return false
    }

    const objectValue = value as Record<string, unknown>
    return Object.keys(objectValue).some(
      key =>
        key.includes(target) || hasPayloadMatch(objectValue[key], target),
    )
  }

  return String(value).includes(target)
}

function getQueryStringParameters(record: RecordLike) {
  const result: Record<string, string> = {}
  const queryEntries = record.request?.queryString || []

  queryEntries.forEach((entry) => {
    if (entry.name) {
      result[entry.name] = entry.value || ''
    }
  })

  if (Object.keys(result).length > 0) {
    return result
  }

  const url = record.request?.url || ''
  try {
    const params = new URL(url).searchParams
    params.forEach((value, key) => {
      result[key] = value
    })
  }
  catch {
    const queryText = url.includes('?') ? url.split('?').pop() || '' : ''
    new URLSearchParams(queryText).forEach((value, key) => {
      result[key] = value
    })
  }

  return result
}

function executeStringFunction(stringFunction: string, args: unknown) {
  try {
    // 这里和页面拦截脚本保持一致：用户在规则里写的 JS 用来生成最终响应体。
    // eslint-disable-next-line no-new-func
    return new Function(stringFunction)(args)
  }
  catch (error) {
    console.error(error)
    return stringFunction
  }
}

function processSysxcpInnerData(jsonObj: Record<string, unknown>, args: unknown) {
  try {
    if (!jsonObj.result || typeof jsonObj.result !== 'string') {
      return jsonObj
    }

    const innerResult = parseJsonSafely<Record<string, unknown>>(jsonObj.result)
    if (!innerResult || typeof innerResult !== 'object') {
      return jsonObj
    }

    let hasChanges = false
    Object.keys(innerResult).forEach((key) => {
      const value = innerResult[key]
      if (typeof value !== 'string') {
        return
      }

      const executionResult = executeStringFunction(value, args)
      if (value !== executionResult) {
        innerResult[key] = executionResult
        hasChanges = true
      }
    })

    if (hasChanges) {
      jsonObj.result = JSON.stringify(innerResult)
    }
  }
  catch (error) {
    console.error(error)
  }

  return jsonObj
}

export function findMatchedInterceptorRule(
  record: RecordLike,
  rules: RuleLike[],
  ajaxToolsSwitchOn = true,
) {
  if (!ajaxToolsSwitchOn || !record?.request?.url || !Array.isArray(rules)) {
    return null
  }

  const method = String(record.request.method || '').toUpperCase()
  const url = record.request.url
  const payload = parseRequestPayload(record.request.postData?.text)

  return rules.find((rule) => {
    const request = rule?.request || ''
    if (!rule || rule.open === false || !request) {
      return false
    }

    const matchedMethod
      = !rule.matchMethod || rule.matchMethod === method

    if (!matchedMethod) {
      return false
    }

    if (rule.matchType === 'regex') {
      return isRegExpMatch(request, url)
    }

    if (rule.matchType === 'payload') {
      return hasPayloadMatch(payload, request)
    }

    return url.includes(request)
  }) || null
}

export function buildInterceptorResponseContent({
  originalContent,
  record,
  rule,
}: {
  originalContent: string
  record: RecordLike
  rule?: RuleLike | null
}) {
  if (!rule?.responseText) {
    return originalContent
  }

  const args = {
    method: record.request?.method,
    originalResponse: originalContent,
    payload: {
      queryStringParameters: getQueryStringParameters(record),
      requestPayload: record.request?.postData?.text,
    },
  }

  const configuredResponseText = rule.responseText
  const parsedResponse = parseJsonSafely<Record<string, unknown>>(configuredResponseText)

  if (parsedResponse && typeof parsedResponse === 'object') {
    return JSON.stringify(processSysxcpInnerData(parsedResponse, args))
  }

  const executionResult = executeStringFunction(configuredResponseText, args)
  if (!executionResult) {
    return configuredResponseText
  }

  return typeof executionResult === 'object'
    ? JSON.stringify(executionResult)
    : String(executionResult)
}

export function formatJsonLikeText(value: string): string {
  const parsed = parseJsonSafely(value)

  if (parsed === null) {
    return value
  }

  try {
    return JSON.stringify(parsed, null, 4)
  }
  catch {
    return value
  }
}

export function formatDisplayContent(value: unknown): string {
  if (typeof value === 'string') {
    return formatJsonLikeText(value)
  }

  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2)
    }
    catch {
      return String(value)
    }
  }

  return String(value)
}

export function getEditorTheme(theme?: 'light' | 'dark') {
  return theme === 'dark' ? 'vs-dark' : 'vs-light'
}

export function parseDrawerApiResponse(url: string, responseText: string) {
  const emptyResult = {
    apiReply: '',
    displayData: null as unknown,
  }

  if (!responseText || responseText === 'undefined') {
    return emptyResult
  }

  const parsedResponse = parseJsonSafely<Record<string, unknown>>(responseText)
  const isApiUrl = url?.endsWith('/api') || url?.includes('/api/result')

  if (!isApiUrl) {
    return {
      apiReply: '',
      displayData: parsedResponse ?? responseText,
    }
  }

  if (!parsedResponse || typeof parsedResponse !== 'object') {
    return {
      apiReply: '',
      displayData: responseText,
    }
  }

  const responseResult = parsedResponse.result

  if (
    typeof responseResult === 'string'
    && responseResult.includes('com.syscxp')
  ) {
    const parsedResult = parseJsonSafely<Record<string, unknown>>(responseResult)
    const firstKey = parsedResult ? Object.keys(parsedResult)[0] : ''

    if (parsedResult && firstKey) {
      return {
        apiReply: firstKey,
        displayData: parsedResult[firstKey],
      }
    }
  }

  return {
    apiReply: '',
    displayData: parsedResponse,
  }
}
