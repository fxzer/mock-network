export function parseRequestDisplayData(record: any) {
  if (!record || !record.request)
    return {}

  let displayPath = ''
  if (record.request.url) {
    try {
      const urlObj = new URL(record.request.url)
      displayPath = urlObj.pathname
    }
    catch (e) {
      displayPath = record.request.url
    }
  }

  let displayApiMsg = ''
  try {
    const postData = record.request.postData
    if (postData && postData.text) {
      const json = JSON.parse(postData.text)
      const keys = Object.keys(json)
      // 只有第一个 key 包含 'com.syscxp' 才取值
      if (keys.length > 0 && keys[0].includes('com.syscxp')) {
        displayApiMsg = keys[0]
      }
    }
  }
  catch {
    // 忽略 JSON 解析错误
  }

  const displayFormattedPath = formatDisplayPath(displayPath)
  return { displayPath, displayApiMsg, displayFormattedPath }
}

/**
 * 从 API 消息类型中提取操作名
 * 例如: com.syscxp.header.hybridwan.network.APIBossDashboardDetailMsg -> BossDashboardDetail
 */
export function extractApiOperation(apiMsg: string): string {
  if (!apiMsg)
    return ''

  // 获取最后一段（API 方法名）
  const segments = apiMsg.split('.')
  const apiMethod = segments[segments.length - 1] // APIBossDashboardDetailMsg

  // 提取 API 方法中的操作名 (去掉 API 前缀和 Reply/Msg/Event 后缀)
  const operationMatch = apiMethod.match(/^API(.+?)(Reply|Msg|Event)?$/)
  return operationMatch ? operationMatch[1] : apiMethod
}

/**
 * 检查是否为公司的 API 请求
 * 条件：path 包含 /api 且（payload 第一个键包含 com.syscxp 或 response.result 包含 com.syscxp）
 */
export function isSysxcpApi(
  url: string,
  postDataText?: string,
  responseText?: string,
): boolean {
  // 条件1：path 包含 /api
  if (!url?.includes('/api'))
    return false

  // 条件2：payload 第一个键包含 com.syscxp
  if (postDataText) {
    try {
      const payload = JSON.parse(postDataText)
      const keys = Object.keys(payload)
      if (keys.length > 0 && keys[0].includes('com.syscxp')) {
        return true
      }
    }
    catch {
      // 忽略 JSON 解析错误
    }
  }

  // 条件3：response.result 包含 com.syscxp
  if (responseText) {
    try {
      const response = JSON.parse(responseText)
      if (
        response.result
        && typeof response.result === 'string'
        && response.result.includes('com.syscxp')
      ) {
        return true
      }
    }
    catch {
      // 忽略 JSON 解析错误
    }
  }

  return false
}

export function formatDisplayPath(text: string) {
  if (!text)
    return text
  const resultMarker = '/api/result/'
  const index = text.indexOf(resultMarker)
  if (index !== -1) {
    const id = text.substring(index + resultMarker.length)
    if (id.length > 8) {
      return `${resultMarker}${id.substring(0, 4)}...${id.substring(
        id.length - 4,
      )}`
    }
  }
  return text
}
