const requestBuffer = []
const pendingSyncRequests = []
const MAX_REQUEST_BUFFER = 2000

// 1. 每次打开开发者工具，默认记录状态为 true
let isRecording = true
let panelWindow = null
let syncScheduled = false

function cloneNameValueEntries(entries) {
  if (!Array.isArray(entries)) {
    return []
  }

  return entries.map(entry => ({
    name: entry?.name || '',
    value: entry?.value || '',
  }))
}

function clonePostData(postData) {
  if (!postData) {
    return undefined
  }

  return {
    mimeType: postData.mimeType || '',
    params: cloneNameValueEntries(postData.params),
    text: postData.text || '',
  }
}

function getDisplayPath(url) {
  if (!url) {
    return ''
  }

  try {
    return new URL(url).pathname
  }
  catch {
    return url
  }
}

function formatDisplayPath(text) {
  if (!text) {
    return text
  }

  const resultMarker = '/api/result/'
  const index = text.indexOf(resultMarker)
  if (index === -1) {
    return text
  }

  const id = text.substring(index + resultMarker.length)
  if (id.length <= 8) {
    return text
  }

  return `${resultMarker}${id.substring(0, 4)}...${id.substring(id.length - 4)}`
}

function getDisplayApiMsg(postDataText) {
  if (!postDataText) {
    return ''
  }

  try {
    const payload = JSON.parse(postDataText)
    const [firstKey = ''] = Object.keys(payload)
    return firstKey.includes('com.syscxp') ? firstKey : ''
  }
  catch {
    return ''
  }
}

function getRequestLookupPath(url) {
  if (!url) {
    return ''
  }

  return url.split('?')[0].match('(?<=//.*/).+')?.[0] || ''
}

function serializeRequest(request) {
  const requestUrl = request?.request?.url || ''
  const displayPath = getDisplayPath(requestUrl)
  const displayApiMsg = getDisplayApiMsg(request?.request?.postData?.text)

  return {
    _normalized: true,
    _internalId: request?._internalId || `${request?.startedDateTime || Date.now()}-${Math.random().toString(36).slice(2)}`,
    _resourceType: request?._resourceType || '',
    _displayApiMsg: displayApiMsg,
    _displayPath: displayPath,
    _displayFormattedPath: formatDisplayPath(displayPath),
    _lookupPath: getRequestLookupPath(requestUrl),
    request: {
      url: requestUrl,
      method: request?.request?.method || '',
      httpVersion: request?.request?.httpVersion || '',
      headers: cloneNameValueEntries(request?.request?.headers),
      queryString: cloneNameValueEntries(request?.request?.queryString),
      postData: clonePostData(request?.request?.postData),
    },
    response: {
      status: request?.response?.status ?? '',
      httpVersion: request?.response?.httpVersion || '',
      headers: cloneNameValueEntries(request?.response?.headers),
    },
    serverIPAddress: request?.serverIPAddress || '',
    startedDateTime: request?.startedDateTime || '',
    getContent:
      typeof request?.getContent === 'function'
        ? callback => request.getContent(callback)
        : undefined,
  }
}

function notifyPanelVisible(window) {
  if (!window) {
    return
  }

  window.dispatchEvent(new Event('m-network-panel-shown'))
  window.dispatchEvent(new Event('resize'))

  if (typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event('m-network-panel-shown'))
      window.dispatchEvent(new Event('resize'))
    })
  }
}

function flushPendingSyncRequests() {
  syncScheduled = false

  if (!panelWindow?.syncNetworkData) {
    pendingSyncRequests.length = 0
    return
  }

  if (pendingSyncRequests.length === 0) {
    return
  }

  panelWindow.syncNetworkData(pendingSyncRequests.splice(0))
}

function schedulePanelSync(serializedRequest) {
  pendingSyncRequests.push(serializedRequest)

  if (syncScheduled) {
    return
  }

  syncScheduled = true

  if (typeof panelWindow?.requestAnimationFrame === 'function') {
    panelWindow.requestAnimationFrame(flushPendingSyncRequests)
    return
  }

  window.setTimeout(flushPendingSyncRequests, 16)
}

// 监听网络请求
chrome.devtools.network.onRequestFinished.addListener(request => {
  if (isRecording) {
    const serializedRequest = serializeRequest(request)

    if (requestBuffer.length >= MAX_REQUEST_BUFFER) {
      requestBuffer.shift()
    }
    requestBuffer.push(serializedRequest)

    // 如果面板已经打开，实时同步数据
    if (panelWindow && panelWindow.syncNetworkData) {
      schedulePanelSync(serializedRequest)
    }
  }
})

chrome.devtools.panels.create(
  'M-Network',
  'icon.png',
  '../src/ui/dist/network.html',
  function (panel) {
    console.log('M-Network 面板创建成功！')

    panel.onShown.addListener(function (window) {
      panelWindow = window

      // 注入控制对象到 panel 的 window 对象中
      window.bridge = {
        getBuffer: () => requestBuffer.slice(),
        getRecordingState: () => isRecording,
        setRecording: state => {
          isRecording = state
        },
        clearBuffer: () => {
          requestBuffer.length = 0
          pendingSyncRequests.length = 0
        },
      }

      // 如果UI已经加载完成，手动触发初始化
      if (window.initializeFromBridge) {
        window.initializeFromBridge()
      }

      notifyPanelVisible(window)
    })

    panel.onHidden.addListener(function () {
      panelWindow = null
    })
  },
)
