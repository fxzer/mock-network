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
