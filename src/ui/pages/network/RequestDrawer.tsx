import {
  CheckCircleFilled,
  CopyOutlined,
  FilterOutlined,
} from '@ant-design/icons'
import JsonView from '@uiw/react-json-view'
import { lightTheme } from '@uiw/react-json-view/light'
import { vscodeTheme } from '@uiw/react-json-view/vscode'
import { Divider, Drawer, message, Tabs } from 'antd'
import * as React from 'react'
import { useEffect, useState } from 'react'
import { FormatApiMsg } from '../../utils'
import './RequestDrawer.css'

interface RequestDrawerProps {
  drawerOpen: boolean
  record: any
  onClose: () => void
  onAddInterceptorClick: (record: any) => void
  theme?: 'light' | 'dark'
}
function Wrapper(props: { children: any }) {
  return (
    <div style={{ height: 'calc(100vh - 120px)', overflow: 'auto' }}>
      {props.children}
    </div>
  )
}

function CopyIcon({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let timer: any
    if (copied) {
      timer = setTimeout(() => {
        setCopied(false)
      }, 3000)
    }
    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [copied])

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!text)
      return
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
    })
  }

  if (copied) {
    return (
      <CheckCircleFilled
        style={{ marginLeft: 8, color: '#52c41a' }}
        title="已复制"
      />
    )
  }

  return (
    <CopyOutlined
      style={{ marginLeft: 8, cursor: 'pointer', color: '#1890ff' }}
      title="复制 API Msg"
      onClick={handleCopy}
    />
  )
}

export default (props: RequestDrawerProps) => {
  const { drawerOpen, record, onClose, onAddInterceptorClick, theme } = props

  // Lifted state
  const [displayData, setDisplayData] = useState<any>(null)
  const [apiReply, setApiReply] = useState('')
  const [rawContent, setRawContent] = useState('') // 保存原始响应内容

  useEffect(() => {
    // Polyfill for navigator.clipboard.writeText to fix "Permissions policy violation"
    // blocked by the browser in this iframe context.
    if (!navigator.clipboard) {
      (navigator as any).clipboard = {}
    }
    navigator.clipboard.writeText = (text: string) => {
      return new Promise((resolve, reject) => {
        try {
          // Use legacy execCommand which is allowed
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
            // message.success('已复制到剪贴板'); // 移除默认提示，由调用方控制
            resolve()
          }
          else {
            console.error('Fallback: Copying text command failed')
            reject(new Error('Copy command failed'))
          }
        }
        catch (err) {
          console.error('Fallback: Oops, unable to copy', err)
          reject(err)
        }
      })
    }
  }, [])

  useEffect(() => {
    if (drawerOpen && record.getContent) {
      record.getContent((content: string) => {
        setRawContent(content) // 保存原始响应内容
        const result = parseApiResponse(record.request.url, content)
        setDisplayData(result.displayData)
        setApiReply(result.apiReply)
      })
    }
  }, [record, drawerOpen])

  // Headers component (unchanged)
  const Headers = () => {
    return (
      <>
        <h4>
          <strong>General</strong>
        </h4>
        <div className="ajax-tools-devtools-text">
          <strong>Request URL:&nbsp;</strong>
          <span>{record.request.url}</span>
        </div>
        <div className="ajax-tools-devtools-text">
          <strong>Request Method:&nbsp;</strong>
          <span>{record.request.method}</span>
        </div>
        <div className="ajax-tools-devtools-text">
          <strong>Status Code:&nbsp;</strong>
          <span>{record.response.status}</span>
        </div>
        <div className="ajax-tools-devtools-text">
          <strong>Remote Address:&nbsp;</strong>
          <span>{record.serverIPAddress}</span>
        </div>
        {/* <div className="ajax-tools-devtools-text"> */}
        {/*  <strong>Referrer Policy:&nbsp;</strong> */}
        {/*  <span>xxx</span> */}
        {/* </div> */}

        <Divider orientation="left" style={{ margin: '12px 0 4px' }} />
        <h4>
          <strong>响应头</strong>
        </h4>
        <div className="ajax-tools-devtools-text">
          <strong>Http Version:&nbsp;</strong>
          <span>{record.response.httpVersion}</span>
        </div>
        {record.response.headers.map((v: { name: string, value: string }) => {
          return (
            <div className="ajax-tools-devtools-text" key={v.name}>
              <strong>
                {v.name}
                :&nbsp;
              </strong>
              <span>{v.value}</span>
            </div>
          )
        })}

        <Divider orientation="left" style={{ margin: '12px 0 4px' }} />
        <h4>
          <strong>请求头</strong>
        </h4>
        <div className="ajax-tools-devtools-text">
          <strong>Http Version:&nbsp;</strong>
          <span>{record.request.httpVersion}</span>
        </div>
        {record.request.headers.map((v: { name: string, value: string }) => {
          return (
            <div className="ajax-tools-devtools-text" key={v.name}>
              <strong>
                {v.name}
                :&nbsp;
              </strong>
              <span>{v.value}</span>
            </div>
          )
        })}
      </>
    )
  }
  const formatText = (value: string) => {
    let text = ''
    try {
      text = JSON.stringify(JSON.parse(value), null, 4)
    }
    catch (e) {
      text = value
    }
    return text
  }

  // 纯函数：解析 API 响应，直接返回要展示的数据
  const parseApiResponse = (url: string, responseText: string) => {
    const result = {
      displayData: null as any,
      apiReply: '',
    }

    if (!responseText || responseText === 'undefined') {
      return result
    }

    // 非 API 接口，直接解析返回
    if (!url?.endsWith('/api') && !url?.includes('/api/result')) {
      try {
        result.displayData = JSON.parse(responseText)
      }
      catch {
        result.displayData = responseText
      }
      return result
    }

    // API 接口，检查是否有特殊格式的 result 字段
    try {
      const response = JSON.parse(responseText)

      if (
        response.result
        && typeof response.result === 'string'
        && response.result.includes('com.syscxp')
      ) {
        // 解析双重编码的 result 字段
        const resultObj = JSON.parse(response.result)
        const firstKey = Object.keys(resultObj)[0]

        if (firstKey) {
          result.apiReply = firstKey
          result.displayData = resultObj[firstKey] // 直接返回要展示的数据
        }
        else {
          result.displayData = response
        }
      }
      else {
        result.displayData = response
      }
    }
    catch (e) {
      console.error('解析 API 响应失败:', e)
      result.displayData = responseText
    }

    return result
  }

  const Payload = () => {
    const postData = record.request.postData || {}
    return (
      <>
        <h4>
          <strong>查询参数</strong>
        </h4>
        {record.request.queryString.map(
          (v: { name: string, value: string }) => {
            return (
              <div className="ajax-tools-devtools-text" key={v.name}>
                <strong>
                  {v.name}
                  :&nbsp;
                </strong>
                <span>{v.value}</span>
              </div>
            )
          },
        )}
        <Divider orientation="left" style={{ margin: '12px 0 4px' }} />
        <h4>
          <strong>请求载荷</strong>
        </h4>
        <div className="ajax-tools-devtools-text">
          <strong>mimeType:&nbsp;</strong>
          <span>{postData.mimeType}</span>
        </div>
        <div className="ajax-tools-devtools-text" style={{ display: 'flex' }}>
          <strong style={{ flex: 'none' }}>text:&nbsp;</strong>
          <pre>{formatText(postData.text)}</pre>
        </div>
        {postData.params && (
          <div className="ajax-tools-devtools-text">
            <strong>Params:&nbsp;</strong>
            {(postData.params || []).map(
              (v: { name: string, value: string }) => {
                return (
                  <div className="ajax-tools-devtools-text" key={v.name}>
                    <strong>
                      {v.name}
                      :&nbsp;
                    </strong>
                    <span>{v.value}</span>
                  </div>
                )
              },
            )}
          </div>
        )}
      </>
    )
  }
  const Response = () => {
    const [response, setResponse] = useState('')
    useEffect(() => {
      if (drawerOpen && record.getContent) {
        record.getContent((content: string) => {
          setResponse(content)
        })
      }
    }, [])

    return (
      <>
        <pre>{formatText(response)}</pre>
      </>
    )
  }

  const FormattedResponse = () => {
    return (
      <>
        {apiReply && (
          <div
            style={{
              padding: '4px',
              marginBottom: '12px',
              background: theme === 'dark' ? 'rgb(0, 0, 0,0.2)' : '#f0f2f5',
              color: theme === 'dark' ? '#e6e6e6' : '#666',
              borderRadius: '4px',
              borderLeft: '2px solid #1890ff',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <FormatApiMsg msgType={apiReply} />
            <CopyIcon text={apiReply} />
          </div>
        )}
        {displayData && typeof displayData === 'object'
          ? (
              <>
                <JsonView
                  style={theme === 'dark' ? vscodeTheme : lightTheme}
                  value={displayData}
                  collapsed={2}
                  displayDataTypes={false}
                  enableClipboard={true}
                  onCopied={() => message.success('已复制到剪贴板')}
                  shortenTextAfterLength={120}
                />
              </>
            )
          : (
              <pre>{String(displayData || '')}</pre>
            )}
      </>
    )
  }

  const title = (
    <span>
      <span style={{ color: '#1890ff' }}>
        {record?._displayFormattedPath
          || record?._displayPath
          || record?.request?.url}
      </span>
      {record?._displayApiMsg && (
        <span style={{ marginLeft: 12 }}>
          <FormatApiMsg msgType={record._displayApiMsg} />
          <CopyIcon text={record._displayApiMsg} />
        </span>
      )}
    </span>
  )
  return (
    <Drawer
      title={<span style={{ fontSize: 12 }}>{title}</span>}
      open={drawerOpen}
      onClose={() => onClose()}
      width="80%"
      placement="right"
      mask={false}
      headerStyle={{
        padding: '8px',
        fontSize: '14px',
        wordBreak: 'break-all',
      }}
      bodyStyle={{ padding: '6px 20px' }}
    >
      <Tabs
        defaultActiveKey="4"
        size="small"
        tabBarExtraContent={{
          right: (
            <FilterOutlined
              className="ajax-tools-devtools-text-btn"
              title="添加到拦截列表"
              onClick={() => {
                // 将 apiReply 和原始响应内容附加到 record
                const enhancedRecord = {
                  ...record,
                  _apiReply: apiReply,
                  _rawContent: rawContent, // 传递原始响应内容
                }
                onAddInterceptorClick(enhancedRecord)
              }}
            />
          ),
        }}
        items={[
          {
            label: `请求头`,
            key: '1',
            children: (
              <Wrapper>
                <Headers />
              </Wrapper>
            ),
          },
          {
            label: `载荷`,
            key: '2',
            children: (
              <Wrapper>
                <Payload />
              </Wrapper>
            ),
          },
          {
            label: `响应`,
            key: '3',
            children: (
              <Wrapper>
                <Response />
              </Wrapper>
            ),
          },
          {
            label: `格式化响应`,
            key: '4',
            children: (
              <Wrapper>
                <FormattedResponse />
              </Wrapper>
            ),
          },
        ]}
      />
    </Drawer>
  )
}
