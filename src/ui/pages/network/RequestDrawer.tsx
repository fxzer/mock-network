import { FilterOutlined } from '@ant-design/icons'
import { Drawer, Tabs } from 'antd'
import * as React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import FormatApiMsg from '../../components/FormatApiMsg'
import CopyIcon from './components/CopyIcon'
import FormattedResponse from './components/FormattedResponse'
import RequestHeaders from './components/RequestHeaders'
import RequestPayload from './components/RequestPayload'
import RequestResponse from './components/RequestResponse'
import { parseDrawerApiResponse } from './utils'
import './RequestDrawer.css'

const DRAWER_SIZE_STORAGE_KEY = 'uNetworkDrawerSize'
const DEFAULT_DRAWER_SIZE = 500
const MIN_DRAWER_SIZE = 320
const DRAWER_VIEWPORT_PADDING = 24

interface RequestDrawerProps {
  drawerOpen: boolean
  record: any
  onClose: () => void
  onAddInterceptorClick: (record: any) => void
  theme?: 'light' | 'dark'
}

function clampDrawerSize(size: number, viewportWidth: number) {
  const maxSize = Math.max(
    MIN_DRAWER_SIZE,
    viewportWidth - DRAWER_VIEWPORT_PADDING,
  )

  return Math.min(Math.max(size, MIN_DRAWER_SIZE), maxSize)
}

function getInitialDrawerSize() {
  const savedSize = Number(localStorage.getItem(DRAWER_SIZE_STORAGE_KEY))
  const initialSize = Number.isFinite(savedSize) && savedSize > 0
    ? savedSize
    : DEFAULT_DRAWER_SIZE

  return clampDrawerSize(initialSize, window.innerWidth)
}

function ensureClipboardWriteTextPolyfill() {
  if (navigator.clipboard?.writeText) {
    return
  }

  if (!navigator.clipboard) {
    ;(navigator as any).clipboard = {}
  }

  navigator.clipboard.writeText = (text: string) =>
    new Promise((resolve, reject) => {
      try {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-9999px'
        textarea.style.top = '0'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()

        const successful = document.execCommand('copy')
        document.body.removeChild(textarea)

        if (successful) {
          resolve()
          return
        }

        console.error('Fallback: Copying text command failed')
        reject(new Error('Copy command failed'))
      }
      catch (error) {
        console.error('Fallback: Oops, unable to copy', error)
        reject(error)
      }
    })
}

function DrawerContentWrapper(props: { children: React.ReactNode }) {
  return (
    <div style={{ height: 'calc(100vh - 120px)', overflow: 'auto' }}>
      {props.children}
    </div>
  )
}

export default function RequestDrawer(props: RequestDrawerProps) {
  const { drawerOpen, record, onClose, onAddInterceptorClick, theme } = props

  const [activeTab, setActiveTab] = useState(
    localStorage.getItem('uNetworkActiveTab') || '2',
  )
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth)
  const [drawerSize, setDrawerSize] = useState(getInitialDrawerSize)
  const [apiReply, setApiReply] = useState('')
  const [displayData, setDisplayData] = useState<unknown>(null)
  const [rawContent, setRawContent] = useState('')
  const [contentLoading, setContentLoading] = useState(false)

  useEffect(() => {
    ensureClipboardWriteTextPolyfill()
  }, [])

  useEffect(() => {
    const syncViewportWidth = () => {
      setViewportWidth(window.innerWidth)
    }

    window.addEventListener('resize', syncViewportWidth)
    return () => {
      window.removeEventListener('resize', syncViewportWidth)
    }
  }, [])

  useEffect(() => {
    let active = true

    if (!drawerOpen || !record?.request?.url) {
      setContentLoading(false)
      return () => {
        active = false
      }
    }

    const applyContent = (content: string) => {
      if (!active) {
        return
      }

      const nextRawContent = content || ''
      const parsedResponse = parseDrawerApiResponse(record.request.url, nextRawContent)

      record._rawContent = nextRawContent
      record._apiReply = parsedResponse.apiReply

      setRawContent(nextRawContent)
      setDisplayData(parsedResponse.displayData)
      setApiReply(parsedResponse.apiReply)
      setContentLoading(false)
    }

    setRawContent('')
    setDisplayData(null)
    setApiReply('')

    if (typeof record._rawContent === 'string') {
      applyContent(record._rawContent)
      return () => {
        active = false
      }
    }

    if (!record.getContent) {
      setContentLoading(false)
      return () => {
        active = false
      }
    }

    setContentLoading(true)
    record.getContent(applyContent)

    return () => {
      active = false
    }
  }, [drawerOpen, record])

  const handleTabChange = useCallback((key: string) => {
    setActiveTab(key)
    localStorage.setItem('uNetworkActiveTab', key)
  }, [])

  const handleResize = useCallback((newSize: number) => {
    const nextSize = clampDrawerSize(newSize, viewportWidth)
    setDrawerSize(nextSize)
    localStorage.setItem(DRAWER_SIZE_STORAGE_KEY, String(nextSize))
  }, [viewportWidth])

  const handleAddToInterceptor = useCallback(() => {
    onAddInterceptorClick({
      ...record,
      _apiReply: apiReply,
      _rawContent: rawContent,
    })
  }, [apiReply, onAddInterceptorClick, rawContent, record])

  const effectiveDrawerSize = clampDrawerSize(drawerSize, viewportWidth)

  const title = useMemo(
    () => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ color: '#1890ff' }}>
          {record?._displayFormattedPath
            || record?._displayPath
            || record?.request?.url}
        </span>
        {record?._displayApiMsg && (
          <span>
            <FormatApiMsg
              msgType={record._displayApiMsg}
              requestPath={record?.request?.url}
            />
            <CopyIcon text={record._displayApiMsg} />
          </span>
        )}
      </div>
    ),
    [record],
  )

  const tabItems = useMemo(
    () => [
      {
        children: (
          <DrawerContentWrapper>
            <RequestHeaders record={record} />
          </DrawerContentWrapper>
        ),
        key: '1',
        label: '请求头',
      },
      {
        children: (
          <DrawerContentWrapper>
            <RequestPayload
              apiReply={apiReply}
              displayData={displayData}
              record={record}
              theme={theme}
            />
          </DrawerContentWrapper>
        ),
        key: '2',
        label: '载荷',
      },
      {
        children: (
          <DrawerContentWrapper>
            <RequestResponse
              loading={contentLoading}
              responseContent={rawContent}
              theme={theme}
            />
          </DrawerContentWrapper>
        ),
        key: '3',
        label: '响应',
      },
      {
        children: (
          <DrawerContentWrapper>
            <FormattedResponse
              apiReply={apiReply}
              displayData={displayData}
              requestPath={record?.request?.url}
              theme={theme}
            />
          </DrawerContentWrapper>
        ),
        key: '4',
        label: '格式化响应',
      },
    ],
    [apiReply, contentLoading, displayData, rawContent, record, theme],
  )

  return (
    <Drawer
      title={<span style={{ fontSize: 12 }}>{title}</span>}
      open={drawerOpen}
      onClose={onClose}
      size={effectiveDrawerSize}
      placement="right"
      resizable={{ onResize: handleResize }}
      mask={false}
      headerStyle={{
        fontSize: '14px',
        padding: '8px',
        wordBreak: 'break-all',
      }}
      bodyStyle={{ padding: '0px 10px 10px 10px' }}
    >
      <Tabs
        className="compact-tabs"
        activeKey={activeTab}
        onChange={handleTabChange}
        size="small"
        tabBarExtraContent={{
          right: (
            <FilterOutlined
              className="ajax-tools-devtools-text-btn"
              title="添加到拦截列表"
              onClick={handleAddToInterceptor}
            />
          ),
        }}
        items={tabItems}
      />
    </Drawer>
  )
}
