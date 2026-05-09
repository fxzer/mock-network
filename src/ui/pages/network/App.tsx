import type {
  AjaxDataListObject,
  DefaultInterfaceObject,
} from '../../constants'
import {
  FilterOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  StopOutlined,
} from '@ant-design/icons'
import {
  theme as antdTheme,
  Button,
  ConfigProvider,
  Input,
  Modal,
  Radio,
  Space,
  Spin,
  Table,
} from 'antd'
import * as React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import FormatApiMsg from '../../components/FormatApiMsg'
import { defaultInterface } from '../../constants'
import useTheme from '../../hooks/useTheme'
import {
  extractApiOperation,
  isSysxcpApi,
  parseRequestDisplayData,
} from '../../utils'
import './App.css'

const RequestDrawer = React.lazy(() => import('./RequestDrawer'))

const MAX_NETWORK_ROWS = 2000
const TABLE_MIN_SCROLL_Y = 240
const TABLE_VIRTUAL_THRESHOLD = 200

interface AddInterceptorParams {
  ajaxDataList: AjaxDataListObject[]
  iframeVisible?: boolean
  groupIndex?: number
  request: string
  responseText: string
  matchType?: string
}

interface NameValueEntry {
  name: string
  value: string
}

interface NetworkRecord {
  _displayApiMsg?: string
  _displayFormattedPath?: string
  _displayPath?: string
  _internalId: string
  _lookupOperation?: string
  _lookupPath?: string
  _normalized?: boolean
  _rawContent?: string
  _resourceType?: string
  _apiReply?: string
  getContent?: (callback: (content: string) => void) => void
  request: {
    headers: NameValueEntry[]
    httpVersion?: string
    method?: string
    postData?: {
      mimeType?: string
      params?: NameValueEntry[]
      text?: string
    }
    queryString?: NameValueEntry[]
    url: string
  }
  response: {
    headers: NameValueEntry[]
    httpVersion?: string
    status?: number | string
  }
  serverIPAddress?: string
  startedDateTime?: string
}

interface InterceptorRuleLookup {
  normal: Set<string>
  payload: Set<string>
}

function SelectGroupContent({
  ajaxDataList,
  onChange,
}: {
  ajaxDataList: AjaxDataListObject[]
  onChange: (value: number) => void
}) {
  const [value, setValue] = useState(0)

  return (
    <Radio.Group
      value={value}
      onChange={(event) => {
        setValue(event.target.value)
        onChange(event.target.value)
      }}
    >
      <Space direction="vertical">
        {ajaxDataList.map((group, index) => (
          <Radio
            key={`${group.headerClass}-${group.summaryText}-${index}`}
            value={index}
          >
            分组
            {' '}
            {index + 1}
            ：
            {group.summaryText}
          </Radio>
        ))}
      </Space>
    </Radio.Group>
  )
}

function ResizableTitle(props: any) {
  const { onResize, width, ...restProps } = props

  if (!width) {
    return <th {...restProps} />
  }

  return (
    <th
      {...restProps}
      className="react-resizable"
      style={{ ...restProps.style, width }}
    >
      {restProps.children}
      <div
        className="react-resizable-handle"
        onMouseDown={(event) => {
          event.preventDefault()
          event.stopPropagation()

          const startX = event.clientX
          const startWidth = width

          const onMouseMove = (moveEvent: MouseEvent) => {
            const nextWidth = Math.max(
              50,
              startWidth + (moveEvent.clientX - startX),
            )
            onResize(nextWidth)
          }

          const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
          }

          document.addEventListener('mousemove', onMouseMove)
          document.addEventListener('mouseup', onMouseUp)
          document.body.style.cursor = 'col-resize'
          document.body.style.userSelect = 'none'
        }}
        onClick={event => event.stopPropagation()}
      />
    </th>
  )
}

function getRequestLookupPath(url: string) {
  if (!url) {
    return ''
  }

  return url.split('?')[0].match('(?<=//.*/).+')?.[0] || ''
}

function toNameValueEntries(entries: any): NameValueEntry[] {
  if (!Array.isArray(entries)) {
    return []
  }

  return entries.map(entry => ({
    name: entry?.name || '',
    value: entry?.value || '',
  }))
}

function normalizeNetworkRecord(record: any): NetworkRecord | null {
  if (!record?.request || !['fetch', 'xhr'].includes(record._resourceType)) {
    return null
  }

  const url = record.request.url || ''
  const { displayApiMsg, displayFormattedPath, displayPath }
    = record._displayPath && record._displayFormattedPath !== undefined
      ? {
          displayApiMsg: record._displayApiMsg || '',
          displayFormattedPath: record._displayFormattedPath || '',
          displayPath: record._displayPath || '',
        }
      : parseRequestDisplayData(record)

  return {
    _displayApiMsg: displayApiMsg,
    _displayFormattedPath: displayFormattedPath,
    _displayPath: displayPath,
    _internalId:
      record._internalId
      || `${record.startedDateTime || Date.now()}-${Math.random().toString(36).slice(2)}`,
    _lookupOperation:
      record._lookupOperation || extractApiOperation(displayApiMsg || ''),
    _lookupPath: record._lookupPath || getRequestLookupPath(url),
    _normalized: true,
    _resourceType: record._resourceType,
    getContent:
      typeof record.getContent === 'function'
        ? record.getContent.bind(record)
        : undefined,
    request: {
      headers: toNameValueEntries(record.request.headers),
      httpVersion: record.request.httpVersion || '',
      method: record.request.method || '',
      postData: record.request.postData
        ? {
            mimeType: record.request.postData.mimeType || '',
            params: toNameValueEntries(record.request.postData.params),
            text: record.request.postData.text || '',
          }
        : undefined,
      queryString: toNameValueEntries(record.request.queryString),
      url,
    },
    response: {
      headers: toNameValueEntries(record.response?.headers),
      httpVersion: record.response?.httpVersion || '',
      status: record.response?.status ?? '',
    },
    serverIPAddress: record.serverIPAddress || '',
    startedDateTime: record.startedDateTime || '',
  }
}

function isRecordIntercepted(
  record: NetworkRecord,
  ruleLookup: InterceptorRuleLookup,
  ajaxToolsSwitchOn: boolean,
) {
  if (!ajaxToolsSwitchOn) {
    return false
  }

  return (
    (!!record._lookupOperation
      && ruleLookup.payload.has(record._lookupOperation))
    || (!!record._lookupPath && ruleLookup.normal.has(record._lookupPath))
  )
}

function getColumns({
  ajaxToolsSwitchOn,
  columnWidths,
  handleResize,
  interceptorRuleLookup,
  onAddInterceptorClick,
  onRequestUrlClick,
}: {
  ajaxToolsSwitchOn: boolean
  columnWidths: { Path: number, apiMsg: number }
  handleResize: (
    columnKey: string,
  ) => (event: React.SyntheticEvent, payload: { size: { width: number } }) => void
  interceptorRuleLookup: InterceptorRuleLookup
  onAddInterceptorClick: (record: NetworkRecord) => void
  onRequestUrlClick: (record: NetworkRecord) => void
}) {
  const columns = [
    {
      title: '#',
      dataIndex: 'Index',
      key: 'Index',
      width: 28,
      align: 'center' as const,
      render: (_: any, record: NetworkRecord, index: number) => {
        const intercepted = isRecordIntercepted(
          record,
          interceptorRuleLookup,
          ajaxToolsSwitchOn,
        )

        return (
          <div
            style={{
              alignItems: 'center',
              display: 'flex',
              justifyContent: 'center',
              position: 'relative',
              width: '100%',
            }}
          >
            {intercepted && (
              <div
                style={{
                  background: '#a855f7',
                  borderRadius: '50%',
                  flexShrink: 0,
                  height: 6,
                  left: 4,
                  position: 'absolute',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 6,
                }}
                title="已拦截"
              />
            )}
            {index + 1}
          </div>
        )
      },
    },
    {
      title: 'ApiMsg',
      dataIndex: 'apiMsg',
      key: 'apiMsg',
      width: columnWidths.apiMsg,
      ellipsis: true,
      render: (_: any, record: NetworkRecord) => (
        <FormatApiMsg
          msgType={record._displayApiMsg || ''}
          hidePrefix
          fontSize="11px"
          disableCopy
        />
      ),
    },
    {
      title: '路径',
      dataIndex: 'Path',
      key: 'Path',
      width: columnWidths.Path,
      ellipsis: true,
      render: (_: any, record: NetworkRecord) => {
        if (!record?.request?.url) {
          return null
        }

        return (
          <span title={record.request.url} onClick={() => onRequestUrlClick(record)}>
            {record._displayFormattedPath
              || record._displayPath
              || record.request.url}
          </span>
        )
      },
    },
    {
      title: '方法',
      dataIndex: ['request', 'method'],
      key: 'method',
      width: 54,
      align: 'center' as const,
    },
    {
      title: '状态',
      dataIndex: ['response', 'status'],
      key: 'status',
      width: 54,
      align: 'center' as const,
    },
    {
      title: '类型',
      dataIndex: '_resourceType',
      key: 'type',
      width: 54,
      align: 'center' as const,
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 40,
      fixed: 'right' as const,
      align: 'center' as const,
      render: (_: any, record: NetworkRecord) => (
        <FilterOutlined
          className="ajax-tools-devtools-text-btn"
          title="添加到拦截列表"
          onClick={(event) => {
            event.stopPropagation()
            onAddInterceptorClick(record)
          }}
        />
      ),
    },
  ]

  return columns.map((column: any) => {
    if (column.key === 'Path' || column.key === 'apiMsg') {
      return {
        ...column,
        onHeaderCell: (currentColumn: any) => ({
          width: currentColumn.width,
          onResize: (width: number) => {
            handleResize(column.key as string)(
              null as unknown as React.SyntheticEvent,
              { size: { width } },
            )
          },
        }),
      }
    }

    return column
  })
}

function strToRegExp(regStr: string) {
  let regexp = /.*/

  try {
    const regParts = regStr.match(/^\/(.*)\/([gims]*)$/)
    regexp = regParts ? new RegExp(regParts[1], regParts[2]) : new RegExp(regStr)
  }
  catch (error) {
    console.error(error)
  }

  return regexp
}

export default function App() {
  const [modal, contextHolder] = Modal.useModal()
  const theme = useTheme()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const toolbarRef = useRef<HTMLDivElement | null>(null)
  const pendingRequestsRef = useRef<any[]>([])
  const flushFrameRef = useRef<number | null>(null)

  const [recording, setRecording] = useState(true)
  const [uNetwork, setUNetwork] = useState<NetworkRecord[]>([])
  const [filterKey, setFilterKey] = useState(
    localStorage.getItem('uNetworkFilterKey') || '',
  )
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [currRecord, setCurrRecord] = useState<NetworkRecord | null>(null)
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)
  const [interceptorRules, setInterceptorRules] = useState<any[]>([])
  const [ajaxToolsSwitchOn, setAjaxToolsSwitchOn] = useState(true)
  const [tableScrollY, setTableScrollY] = useState(TABLE_MIN_SCROLL_Y)
  const [viewportReady, setViewportReady] = useState(false)
  const [columnWidths, setColumnWidths] = useState({
    Path: 120,
    apiMsg: 250,
  })

  useEffect(() => {
    document.body.classList.toggle('dark-theme', theme === 'dark')
  }, [theme])

  useEffect(() => {
    const savedWidths = localStorage.getItem('uNetworkTableColumnWidths')

    if (!savedWidths) {
      return
    }

    try {
      setColumnWidths(JSON.parse(savedWidths))
    }
    catch (error) {
      console.error('Failed to parse column widths', error)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('uNetworkFilterKey', filterKey)
  }, [filterKey])

  const handleResize = useCallback(
    (key: string) =>
      (_: React.SyntheticEvent, { size }: { size: { width: number } }) => {
        setColumnWidths((prev) => {
          const next = { ...prev, [key]: size.width }
          localStorage.setItem('uNetworkTableColumnWidths', JSON.stringify(next))
          return next
        })
      },
    [],
  )

  const updateTableViewport = useCallback(() => {
    const panelHeight
      = panelRef.current?.getBoundingClientRect().height
        || window.innerHeight
        || document.documentElement.clientHeight
        || document.body.clientHeight
        || 0
    const toolbarHeight = toolbarRef.current?.getBoundingClientRect().height || 0
    const nextScrollY = Math.max(
      Math.floor(panelHeight - toolbarHeight - 2),
      TABLE_MIN_SCROLL_Y,
    )

    setViewportReady(panelHeight > 0)
    setTableScrollY(prev => (prev === nextScrollY ? prev : nextScrollY))
  }, [])

  useEffect(() => {
    const syncViewport = () => {
      updateTableViewport()
      window.requestAnimationFrame(updateTableViewport)
    }

    syncViewport()

    const resizeObserver = new ResizeObserver(syncViewport)

    if (panelRef.current) {
      resizeObserver.observe(panelRef.current)
    }

    if (toolbarRef.current) {
      resizeObserver.observe(toolbarRef.current)
    }

    window.addEventListener('resize', syncViewport)
    window.addEventListener('m-network-panel-shown', syncViewport)
    document.addEventListener('visibilitychange', syncViewport)

    const timer = window.setTimeout(syncViewport, 0)

    return () => {
      window.clearTimeout(timer)
      resizeObserver.disconnect()
      window.removeEventListener('resize', syncViewport)
      window.removeEventListener('m-network-panel-shown', syncViewport)
      document.removeEventListener('visibilitychange', syncViewport)
    }
  }, [updateTableViewport])

  const flushPendingRequests = useCallback(() => {
    flushFrameRef.current = null

    if (pendingRequestsRef.current.length === 0) {
      return
    }

    const normalizedRequests = pendingRequestsRef.current
      .splice(0)
      .map(normalizeNetworkRecord)
      .filter(Boolean) as NetworkRecord[]

    if (normalizedRequests.length === 0) {
      return
    }

    setUNetwork((prev) => {
      const next = [...prev, ...normalizedRequests].slice(-MAX_NETWORK_ROWS)
      return next
    })
  }, [])

  const scheduleFlushPendingRequests = useCallback(() => {
    if (flushFrameRef.current !== null) {
      return
    }

    flushFrameRef.current = window.requestAnimationFrame(flushPendingRequests)
  }, [flushPendingRequests])

  useEffect(() => {
    const initializeFromBridge = () => {
      const bridge = (window as any).bridge

      if (!bridge) {
        return
      }

      setRecording(bridge.getRecordingState())

      const buffer = Array.isArray(bridge.getBuffer?.()) ? bridge.getBuffer() : []
      const normalizedBuffer = buffer
        .map(normalizeNetworkRecord)
        .filter(Boolean) as NetworkRecord[]

      setUNetwork(normalizedBuffer.slice(-MAX_NETWORK_ROWS))
      updateTableViewport()
      window.requestAnimationFrame(updateTableViewport)
    }

    ;(window as any).initializeFromBridge = initializeFromBridge
    ;(window as any).syncNetworkData = (requests: any[]) => {
      if (!Array.isArray(requests) || requests.length === 0) {
        return
      }

      pendingRequestsRef.current.push(...requests)
      scheduleFlushPendingRequests()
    }

    initializeFromBridge()

    const getChromeLocalStorage = (keys: string | string[]) =>
      new Promise<any>((resolve, reject) => {
        chrome.storage.local.get(keys, (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
            return
          }

          resolve(result)
        })
      })

    getChromeLocalStorage(['ajaxDataList', 'ajaxToolsSwitchOn']).then((result) => {
      const list = result.ajaxDataList || []
      const rules = list.flatMap(
        (item: { interfaceList: any[] }) => item.interfaceList || [],
      )

      setInterceptorRules(rules)
      setAjaxToolsSwitchOn(result.ajaxToolsSwitchOn !== false)
    }).catch(error => console.error(error))

    const handleStorageChange = (changes: any, areaName: string) => {
      if (areaName !== 'local') {
        return
      }

      if (changes.ajaxDataList) {
        const list = changes.ajaxDataList.newValue || []
        const rules = list.flatMap(
          (item: { interfaceList: any[] }) => item.interfaceList || [],
        )
        setInterceptorRules(rules)
      }

      if (changes.ajaxToolsSwitchOn) {
        setAjaxToolsSwitchOn(changes.ajaxToolsSwitchOn.newValue)
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)

    return () => {
      if (flushFrameRef.current !== null) {
        cancelAnimationFrame(flushFrameRef.current)
        flushFrameRef.current = null
      }

      pendingRequestsRef.current.length = 0
      delete (window as any).syncNetworkData
      delete (window as any).initializeFromBridge
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [scheduleFlushPendingRequests, updateTableViewport, flushPendingRequests])

  const handleRecordingChange = useCallback((nextRecording: boolean) => {
    setRecording(nextRecording)

    const bridge = (window as any).bridge
    if (bridge?.setRecording) {
      bridge.setRecording(nextRecording)
    }
  }, [])

  const handleClear = useCallback(() => {
    setUNetwork([])
    setCurrRecord(null)
    setDrawerOpen(false)
    setSelectedRecordId(null)

    const bridge = (window as any).bridge
    if (bridge?.clearBuffer) {
      bridge.clearBuffer()
    }
  }, [])

  const getChromeLocalStorage = useCallback(
    (keys: string | string[]) =>
      new Promise<any>((resolve, reject) => {
        chrome.storage.local.get(keys, (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
            return
          }

          resolve(result)
        })
      }),
    [],
  )

  const showSidePage = useCallback((iframeVisible: undefined | boolean) => {
    if (!iframeVisible) {
      return
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id
      if (!tabId) {
        return
      }

      chrome.tabs.sendMessage(
        tabId,
        { type: 'iframeToggle', iframeVisible },
        (response) => {
          if (chrome.runtime.lastError) {
            return
          }

          if (response) {
            chrome.storage.local.set({
              iframeVisible: response.nextIframeVisible,
            })
          }
        },
      )
    })
  }, [])

  const addInterceptor = useCallback(({
    ajaxDataList,
    groupIndex = 0,
    matchType = 'normal',
    request,
    responseText,
  }: AddInterceptorParams) => {
    const key = String(Date.now())
    ajaxDataList[groupIndex]!.collapseActiveKeys.push(key)

    const interfaceObj: DefaultInterfaceObject = {
      ...defaultInterface,
      key,
      matchType,
      request,
      responseText,
    }

    ajaxDataList[groupIndex].interfaceList.push(interfaceObj)

    chrome.storage.local.set({ ajaxDataList })

    chrome.runtime.sendMessage(
      chrome.runtime.id,
      {
        ajaxDataList,
        to: 'mainSettingSidePage',
        type: 'ajaxTools_updatePage',
      },
      () => {
        if (chrome.runtime.lastError) {
          void chrome.runtime.lastError
        }
      },
    )
  }, [])

  const showGroupModal = useCallback(
    ({ ajaxDataList }: { ajaxDataList: AjaxDataListObject[] }) =>
      new Promise<number>((resolve) => {
        let currentGroupIndex = 0

        modal.confirm({
          cancelText: '取消',
          content: (
            <SelectGroupContent
              ajaxDataList={ajaxDataList}
              onChange={value => (currentGroupIndex = value)}
            />
          ),
          okText: '确认',
          onOk: () => resolve(currentGroupIndex),
          title: '添加到哪个分组',
        })
      }),
    [modal],
  )

  const addInterceptorIfNeeded = useCallback(async ({
    ajaxDataList,
    iframeVisible,
    matchType = 'normal',
    request,
    responseText,
  }: AddInterceptorParams) => {
    let nextAjaxDataList = ajaxDataList

    if (nextAjaxDataList.length === 0) {
      nextAjaxDataList = [
        {
          collapseActiveKeys: [],
          headerClass: 'ajax-tools-color-volcano',
          interfaceList: [],
          summaryText: '分组名称（可编辑）',
        },
      ]
    }

    const groupIndex
      = nextAjaxDataList.length > 1
        ? await showGroupModal({ ajaxDataList: nextAjaxDataList })
        : 0

    showSidePage(iframeVisible)
    addInterceptor({
      ajaxDataList: nextAjaxDataList,
      groupIndex,
      matchType,
      request,
      responseText,
    })
  }, [addInterceptor, showGroupModal, showSidePage])

  const handleAddInterceptor = useCallback(async ({
    matchType = 'normal',
    request,
    responseText,
  }: {
    matchType?: string
    request: string
    responseText: string
  }) => {
    try {
      const {
        ajaxDataList = [],
        iframeVisible,
      }: AddInterceptorParams & { iframeVisible?: boolean }
        = await getChromeLocalStorage(['iframeVisible', 'ajaxDataList'])

      const interfaceList = ajaxDataList.flatMap(
        (item: { interfaceList: DefaultInterfaceObject[] }) => item.interfaceList || [],
      )
      const hasIntercepted = interfaceList.some(
        (item: { matchType?: string, request: string | null }) =>
          item.request === request && item.matchType === matchType,
      )

      if (!hasIntercepted) {
        await addInterceptorIfNeeded({
          ajaxDataList,
          iframeVisible,
          matchType,
          request,
          responseText,
        })
        return
      }

      const confirmed = await new Promise<boolean>((resolve) => {
        modal.confirm({
          cancelText: '取消',
          content: '该请求已存在拦截规则，是否继续添加？',
          okText: '确认',
          onCancel: () => resolve(false),
          onOk: () => resolve(true),
          title: '请求已被拦截',
        })
      })

      if (!confirmed) {
        return
      }

      await addInterceptorIfNeeded({
        ajaxDataList,
        iframeVisible,
        matchType,
        request,
        responseText,
      })
    }
    catch (error) {
      console.error(error)
    }
  }, [addInterceptorIfNeeded, getChromeLocalStorage, modal])

  const onAddInterceptorClick = useCallback((record: NetworkRecord) => {
    if (!record?.request?.url) {
      console.warn('Invalid record or request data')
      return
    }

    const requestUrl = record.request.url.split('?')[0]
    const matchUrl = requestUrl.match('(?<=//.*/).+')
    const postDataText = record.request.postData?.text

    const handleContent = (content: string) => {
      if (isSysxcpApi(record.request.url, postDataText, content)) {
        let apiMsg = record._displayApiMsg || record._apiReply || ''

        if (!apiMsg && content) {
          try {
            const response = JSON.parse(content)
            if (
              response.result
              && typeof response.result === 'string'
              && response.result.includes('com.syscxp')
            ) {
              const resultObj = JSON.parse(response.result)
              const firstKey = Object.keys(resultObj)[0]
              if (firstKey) {
                apiMsg = firstKey
              }
            }
          }
          catch (error) {
            console.error(error)
          }
        }

        const operation = extractApiOperation(apiMsg)
        if (operation) {
          handleAddInterceptor({
            matchType: 'payload',
            request: operation,
            responseText: content,
          })
          return
        }
      }

      handleAddInterceptor({
        request: (matchUrl && matchUrl[0]) || '',
        responseText: content,
      })
    }

    if (record._rawContent) {
      handleContent(record._rawContent)
      return
    }

    if (record.getContent) {
      record.getContent(handleContent)
      return
    }

    if (isSysxcpApi(record.request.url, postDataText)) {
      const apiMsg = record._displayApiMsg || record._apiReply || ''
      const operation = extractApiOperation(apiMsg)

      if (operation) {
        handleAddInterceptor({
          matchType: 'payload',
          request: operation,
          responseText: '',
        })
        return
      }
    }

    handleAddInterceptor({
      request: (matchUrl && matchUrl[0]) || '',
      responseText: '',
    })
  }, [handleAddInterceptor])

  const onRequestUrlClick = useCallback((record: NetworkRecord) => {
    setCurrRecord(record)
    setDrawerOpen(true)
    setSelectedRecordId(record._internalId)
  }, [])

  const filterRegExp = useMemo(() => strToRegExp(filterKey), [filterKey])

  const filteredData = useMemo(
    () => uNetwork.filter(record => record.request.url.match(filterRegExp)),
    [filterRegExp, uNetwork],
  )

  const interceptorRuleLookup = useMemo<InterceptorRuleLookup>(() => {
    const normal = new Set<string>()
    const payload = new Set<string>()

    interceptorRules.forEach((rule) => {
      if (!rule?.request) {
        return
      }

      if (rule.matchType === 'payload') {
        payload.add(rule.request)
        return
      }

      normal.add(rule.request)
    })

    return { normal, payload }
  }, [interceptorRules])

  const columns = useMemo(
    () =>
      getColumns({
        ajaxToolsSwitchOn,
        columnWidths,
        handleResize,
        interceptorRuleLookup,
        onAddInterceptorClick,
        onRequestUrlClick,
      }),
    [
      ajaxToolsSwitchOn,
      columnWidths,
      handleResize,
      interceptorRuleLookup,
      onAddInterceptorClick,
      onRequestUrlClick,
    ],
  )

  const shouldUseVirtual
    = viewportReady && filteredData.length >= TABLE_VIRTUAL_THRESHOLD

  const { darkAlgorithm, defaultAlgorithm } = antdTheme

  return (
    <ConfigProvider
      theme={{
        algorithm: theme === 'dark' ? darkAlgorithm : defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
        },
      }}
    >
      <div
        ref={panelRef}
        className={`network-panel ${theme === 'dark' ? 'dark-theme' : ''}`}
      >
        {contextHolder}
        <div ref={toolbarRef} className="ajax-tools-devtools-action-bar">
          <Button
            type="text"
            shape="circle"
            danger={recording}
            title={recording ? '停止录制' : '录制请求'}
            icon={
              recording
                ? <PauseCircleOutlined style={{ color: '#f7534a' }} />
                : <PlayCircleOutlined style={{ color: '#1890ff' }} />
            }
            onClick={() => handleRecordingChange(!recording)}
          />
          <Button
            type="text"
            shape="circle"
            title="清空"
            icon={<StopOutlined />}
            onClick={handleClear}
          />
          <Input
            placeholder="过滤（正则）"
            size="small"
            style={{ borderRadius: '999px', marginLeft: 16, width: 160 }}
            value={filterKey}
            onChange={event => setFilterKey(event.target.value)}
          />
        </div>

        <div className="network-panel__table">
          <Table
            size="small"
            bordered
            className="network-panel__table-inner"
            components={{
              header: {
                cell: ResizableTitle,
              },
            }}
            columns={columns}
            dataSource={filteredData}
            pagination={false}
            rowKey="_internalId"
            scroll={{
              x: 600,
              y: tableScrollY,
            }}
            scrollToFirstRowOnChange={false}
            virtual={shouldUseVirtual}
            rowClassName={(record: NetworkRecord) =>
              (selectedRecordId === record._internalId ? 'row-selected' : '')}
            onRow={(record: NetworkRecord) => ({
              onClick: () => onRequestUrlClick(record),
            })}
            locale={{
              emptyText: (
                <div style={{ textAlign: 'center' }}>
                  <p>正在录制网络请求...</p>
                  <p>
                    点击录制按钮，然后发起请求或按
                    {' '}
                    <strong>⌘ R</strong>
                    {' '}
                    刷新页面
                  </p>
                </div>
              ),
            }}
          />
        </div>

        {currRecord && (
          <React.Suspense
            fallback={(
              <div className="network-panel__drawer-loading">
                <Spin size="small" />
              </div>
            )}
          >
            <RequestDrawer
              record={currRecord}
              drawerOpen={drawerOpen}
              onAddInterceptorClick={onAddInterceptorClick}
              onClose={() => setDrawerOpen(false)}
              theme={theme}
            />
          </React.Suspense>
        )}
      </div>
    </ConfigProvider>
  )
}
