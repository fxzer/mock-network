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
  Table,
} from 'antd'
import * as React from 'react'

import { useEffect, useRef, useState } from 'react'
import { defaultInterface } from '../../constants'
import useTheme from '../../hooks/useTheme'
import {
  extractApiOperation,
  FormatApiMsg,
  isSysxcpApi,
  parseRequestDisplayData,
} from '../../utils'
import RequestDrawer from './RequestDrawer'
import './App.css'

// ... other imports
interface AddInterceptorParams {
  ajaxDataList: AjaxDataListObject[]
  iframeVisible?: boolean
  groupIndex?: number
  request: string
  responseText: string
  matchType?: string
}

function getColumns({
  onAddInterceptorClick,
  onRequestUrlClick,
}: {
  onAddInterceptorClick: (record: any) => void
  onRequestUrlClick: (record: any) => void
}) {
  return [
    {
      title: '序号',
      dataIndex: 'Index',
      key: 'Index',
      width: 60,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: '路径',
      dataIndex: 'Path',
      key: 'Path',
      width: 120,
      ellipsis: true,
      render: (_: any, record: any) => {
        // 添加安全检查
        if (!record || !record.request || !record.request.url) {
          return null
        }

        return (
          <span
            title={record.request.url}
            onClick={() => onRequestUrlClick(record)}
          >
            {record._displayFormattedPath
              || record._displayPath
              || record.request.url}
          </span>
        )
      },
    },
    {
      title: 'ApiMsg',
      dataIndex: 'apiMsg',
      key: 'apiMsg',
      width: 250,
      ellipsis: true,
      render: (_: any, record: any) => {
        return <FormatApiMsg msgType={record._displayApiMsg} hidePrefix />
      },
    },
    // ... other columns
    {
      title: '方法',
      dataIndex: ['request', 'method'],
      key: 'method',
      width: 60,
      align: 'center' as const,
    },
    {
      title: '状态',
      dataIndex: ['response', 'status'],
      key: 'status',
      width: 60,
      align: 'center' as const,
    },
    {
      title: '类型',
      dataIndex: '_resourceType',
      key: 'type',
      width: 60,
      align: 'center' as const,
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 60,
      align: 'center' as const,
      render: (_: any, record: any) => (
        <FilterOutlined
          className="ajax-tools-devtools-text-btn"
          title="添加到拦截列表"
          onClick={(e) => {
            e.stopPropagation()
            onAddInterceptorClick(record)
          }}
        />
      ),
    },
  ]
}

// "/^t.*$/" or "^t.*$" => new RegExp
function strToRegExp(regStr: string) {
  let regexp = new RegExp('')
  try {
    const regParts = regStr.match(new RegExp('^/(.*?)/([gims]*)$'))
    if (regParts) {
      regexp = new RegExp(regParts[1], regParts[2])
    }
    else {
      regexp = new RegExp(regStr)
    }
  }
  catch (error) {
    console.error(error)
  }
  return regexp
}

export default function App() {
  const [modal, contextHolder] = Modal.useModal()
  const theme = useTheme()

  useEffect(() => {
    // Toggle body class for custom styles
    if (theme === 'dark') {
      document.body.classList.add('dark-theme')
    }
    else {
      document.body.classList.remove('dark-theme')
    }
  }, [theme])

  const [recording, setRecording] = useState(true)
  const [uNetwork, setUNetwork] = useState<any>([])
  const [filterKey, setFilterKey] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [currRecord, setCurrRecord] = useState(null)
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)

  // 用 ref 来保持最新的 uNetwork 引用，供 syncNetworkData 使用
  const uNetworkRef = useRef<any[]>([])

  const processRequest = (request: any) => {
    if (['fetch', 'xhr'].includes(request._resourceType)) {
      const { displayPath, displayApiMsg, displayFormattedPath }
        = parseRequestDisplayData(request)
      request._displayPath = displayPath
      request._displayApiMsg = displayApiMsg
      request._displayFormattedPath = displayFormattedPath
      // Ensure unique ID
      if (!request._internalId) {
        request._internalId = `${
          request.startedDateTime || Date.now()
        }-${Math.random().toString(36).slice(2)}`
      }
      return request
    }
    return null
  }

  useEffect(() => {
    // 定义同步方法供 devtoolsPage 调用
    (window as any).syncNetworkData = (requests: any[]) => {
      const newRequests = requests.map(processRequest).filter(Boolean)

      if (newRequests.length > 0) {
        setUNetwork((prev: any) => {
          const next = [...prev, ...newRequests]
          uNetworkRef.current = next
          return next
        })
      }
    }

    // 初始化：从 bridge 获取状态和历史数据
    const bridge = (window as any).bridge
    if (bridge) {
      setRecording(bridge.getRecordingState())
      const buffer = bridge.getBuffer()
      if (buffer && buffer.length > 0) {
        const processed = buffer.map(processRequest).filter(Boolean)
        setUNetwork(processed)
        uNetworkRef.current = processed
      }
    }

    return () => {
      delete (window as any).syncNetworkData
    }
  }, [])

  // 监听 recording 变化，同步给 bridge
  const handleRecordingChange = (newRecording: boolean) => {
    setRecording(newRecording)
    const bridge = (window as any).bridge
    if (bridge && bridge.setRecording) {
      bridge.setRecording(newRecording)
    }
  }

  const handleClear = () => {
    setUNetwork([])
    uNetworkRef.current = []
    const bridge = (window as any).bridge
    if (bridge && bridge.clearBuffer) {
      bridge.clearBuffer()
    }
  }

  const getChromeLocalStorage = (keys: string | string[]) =>
    new Promise((resolve, reject) => {
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        }
        else {
          resolve(result)
        }
      })
    })
  const onAddInterceptorClick = (record: {
    request: { url: string, postData?: { text?: string } }
    getContent?: (arg0: (content: any) => void) => void
    _displayApiMsg?: string
    _apiReply?: string // 从 RequestDrawer 传递的 apiReply
    _rawContent?: string // 从 RequestDrawer 传递的原始响应内容
  }) => {
    // 添加安全检查
    if (!record || !record.request || !record.request.url) {
      console.warn('Invalid record or request data')
      return
    }
    const requestUrl = record.request.url.split('?')[0]
    const matchUrl = requestUrl.match('(?<=//.*/).+')
    const postDataText = record.request.postData?.text

    // 处理响应内容的函数
    const handleContent = (content: string) => {
      // 检查是否为公司 API
      if (isSysxcpApi(record.request.url, postDataText, content)) {
        // 获取 apiMsg：优先从 _displayApiMsg 获取，其次从 _apiReply 获取，否则尝试从 response.result 解析
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
              if (firstKey)
                apiMsg = firstKey
            }
          }
          catch (e) {}
        }

        // 提取操作名
        const operation = extractApiOperation(apiMsg)
        if (operation) {
          handleAddInterceptor({
            request: operation,
            responseText: content,
            matchType: 'payload',
          })
          return
        }
      }

      // 默认：使用 URL 匹配
      handleAddInterceptor({
        request: (matchUrl && matchUrl[0]) || '',
        responseText: content,
      })
    }

    // 优先使用 _rawContent（从 RequestDrawer 传递），否则调用 getContent
    if (record._rawContent) {
      handleContent(record._rawContent)
    }
    else if (record.getContent) {
      record.getContent(handleContent)
    }
    else {
      // 检查是否为公司 API（仅通过 postData 判断）
      if (isSysxcpApi(record.request.url, postDataText)) {
        const apiMsg = record._displayApiMsg || record._apiReply || ''
        const operation = extractApiOperation(apiMsg)
        if (operation) {
          handleAddInterceptor({
            request: operation,
            responseText: '',
            matchType: 'payload',
          })
          return
        }
      }

      // 默认：使用 URL 匹配
      handleAddInterceptor({
        request: (matchUrl && matchUrl[0]) || '',
        responseText: '',
      })
    }
  }
  const handleAddInterceptor = async ({
    request,
    responseText,
    matchType = 'normal',
  }: {
    request: string
    responseText: string
    matchType?: string
  }) => {
    try {
      const { ajaxDataList = [], iframeVisible }: AddInterceptorParams | any
        = await getChromeLocalStorage(['iframeVisible', 'ajaxDataList'])
      const interfaceList = ajaxDataList.flatMap(
        (item: { interfaceList: DefaultInterfaceObject[] }) =>
          item.interfaceList || [],
      )
      const hasIntercepted = interfaceList.some(
        (v: { request: string | null, matchType?: string }) =>
          v.request === request && v.matchType === matchType,
      )
      if (hasIntercepted) {
        const confirmed = await new Promise((resolve) => {
          modal.confirm({
            title: '请求已被拦截',
            content: '该请求已存在拦截规则，是否继续添加？',
            okText: '确认',
            cancelText: '取消',
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
          })
        })
        if (confirmed) {
          await addInterceptorIfNeeded({
            ajaxDataList,
            iframeVisible,
            request,
            responseText,
            matchType,
          })
        }
      }
      else {
        await addInterceptorIfNeeded({
          ajaxDataList,
          iframeVisible,
          request,
          responseText,
          matchType,
        })
      }
    }
    catch (error) {
      console.error(error)
    }
  }
  const addInterceptorIfNeeded = async ({
    ajaxDataList,
    iframeVisible,
    request,
    responseText,
    matchType = 'normal',
  }: AddInterceptorParams) => {
    if (ajaxDataList.length === 0) {
      // 首次，未添加过拦截接口
      ajaxDataList = [
        {
          summaryText: '分组名称（可编辑）',
          collapseActiveKeys: [],
          headerClass: 'ajax-tools-color-volcano',
          interfaceList: [],
        },
      ]
    }
    const groupIndex: any
      = ajaxDataList.length > 1 ? await showGroupModal({ ajaxDataList }) : 0
    showSidePage(iframeVisible)
    addInterceptor({
      ajaxDataList,
      groupIndex,
      request,
      responseText,
      matchType,
    })
  }
  const showGroupModal = ({
    ajaxDataList,
  }: {
    ajaxDataList: AjaxDataListObject[]
  }) =>
    new Promise((resolve) => {
      const SelectGroupContent = (props: { onChange: (arg0: any) => void }) => {
        const [value, setValue] = useState(0)
        return (
          <Radio.Group
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              props.onChange(e.target.value)
            }}
          >
            <Space direction="vertical">
              {ajaxDataList.map((v, index) => (
                <Radio key={index} value={index}>
                  分组
                  {' '}
                  {index + 1}
                  ：
                  {v.summaryText}
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        )
      }
      let _groupIndex = 0
      modal.confirm({
        title: '添加到哪个分组',
        content: (
          <SelectGroupContent onChange={value => (_groupIndex = value)} />
        ),
        okText: '确认',
        cancelText: '取消',
        onOk: () => resolve(_groupIndex),
      })
    })
  const showSidePage = (iframeVisible: undefined | boolean) => {
    if (iframeVisible) {
      // 当前没展示，要展示
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id
        // 发送消息到content.js
        if (tabId) {
          chrome.tabs.sendMessage(
            tabId,
            { type: 'iframeToggle', iframeVisible },
            (response) => {
              if (chrome.runtime.lastError) {
                // Avoid "Unchecked runtime.lastError"
                return
              }
              if (response) {
                // console.log('【uNetwork/App.jsx】->【content】【ajax-tools-iframe-show】Return message:', response);
                chrome.storage.local.set({
                  iframeVisible: response.nextIframeVisible,
                })
              }
            },
          )
        }
      })
    }
  }
  const addInterceptor = ({
    ajaxDataList,
    groupIndex = 0,
    request,
    responseText,
    matchType = 'normal',
  }: AddInterceptorParams) => {
    const key = String(Date.now())
    ajaxDataList[groupIndex]!.collapseActiveKeys.push(key)
    const interfaceObj: DefaultInterfaceObject = {
      ...defaultInterface,
      key,
      request,
      responseText,
      matchType,
    }
    ajaxDataList[groupIndex].interfaceList.push(interfaceObj)

    // 更新 storage
    chrome.storage.local.set({ ajaxDataList })

    // 发送给iframe(src/App.jsx)侧边页面，更新ajaxDataList
    chrome.runtime.sendMessage(
      chrome.runtime.id,
      {
        type: 'ajaxTools_updatePage',
        to: 'mainSettingSidePage',
        ajaxDataList,
      },
      () => {
        if (chrome.runtime.lastError) {
          // Avoid "Receiving end does not exist" error
        }
      },
    )
  }
  const onRequestUrlClick = (record: any) => {
    setCurrRecord(record)
    setDrawerOpen(true)
    // 设置选中的记录 ID (使用 _internalId 作为唯一标识)
    setSelectedRecordId(record._internalId)
  }
  const columns = getColumns({
    onAddInterceptorClick,
    onRequestUrlClick,
  })

  const filteredData = uNetwork.filter((v: { request: { url: string } }) =>
    v.request.url.match(strToRegExp(filterKey)),
  )

  const { defaultAlgorithm, darkAlgorithm } = antdTheme

  return (
    <ConfigProvider
      theme={{
        algorithm: theme === 'dark' ? darkAlgorithm : defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
        },
      }}
    >
      <div className={theme === 'dark' ? 'dark-theme' : ''}>
        {contextHolder}
        <div className="ajax-tools-devtools-action-bar">
          <Button
            type="text"
            shape="circle"
            danger={recording}
            title={recording ? '停止录制' : '录制请求'}
            icon={
              recording
                ? (
                    <PauseCircleOutlined style={{ color: '#f7534a' }} />
                  )
                : (
                    <PlayCircleOutlined style={{ color: '#1890ff' }} />
                  )
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
            style={{ width: 160, marginLeft: 16, borderRadius: '999px' }}
            onChange={e => setFilterKey(e.target.value)}
          />
        </div>
        <Table
          size="small"
          bordered
          columns={columns}
          dataSource={filteredData}
          pagination={false}
          scroll={{ y: window.innerHeight - 100, x: 600 }}
          virtual
          rowKey="_internalId"
          rowClassName={(record: any) => {
            const isSelected
              = selectedRecordId && selectedRecordId === record._internalId
            return isSelected ? 'row-selected' : ''
          }}
          onRow={(record: any) => ({
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
        {currRecord && (
          <RequestDrawer
            record={currRecord}
            drawerOpen={drawerOpen}
            onAddInterceptorClick={onAddInterceptorClick}
            onClose={() => setDrawerOpen(false)}
            theme={theme}
          />
        )}
      </div>
    </ConfigProvider>
  )
}
