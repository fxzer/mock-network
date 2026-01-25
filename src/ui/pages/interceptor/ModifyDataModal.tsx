import type { ForwardedRef } from 'react'
import { Card, Input, Modal, Select, Space, Tabs } from 'antd'
import * as React from 'react'
import { useImperativeHandle, useRef, useState } from 'react'
import MonacoEditor from '../../components/MonacoEditor'
import {
  HEADERS_EXAMPLES,
  HTTP_METHOD_MAP,
  REQUEST_PAYLOAD_EXAMPLES,
  RESPONSE_EXAMPLES,
} from '../../constants'

import './index.css'

export interface ModifyDataModalOnSaveProps {
  groupIndex: number
  interfaceIndex: number
  replacementMethod: string
  replacementUrl: string
  replacementStatusCode: string
  headersEditorValue: string
  requestPayloadEditorValue: string
  responseEditorValue: string
  language: string
}
interface ModifyDataModalProps {
  onSave: ({
    groupIndex,
    interfaceIndex,
    replacementMethod,
    replacementUrl,
    headersEditorValue,
    requestPayloadEditorValue,
    responseEditorValue,
    language,
  }: ModifyDataModalOnSaveProps) => void
  theme?: string
}
interface OpenModalProps {
  groupIndex: number
  interfaceIndex: number
  activeTab: string
  request: string
  replacementMethod: string
  replacementUrl: string
  replacementStatusCode: string
  headersText: string
  requestPayloadText: string
  responseLanguage: string
  responseText: string
}

const Wrapper = React.memo((props: { children: any }) => {
  return (
    <div style={{ height: 'calc(100vh - 260px)', overflow: 'auto' }}>
      {props.children}
    </div>
  )
})

function ModifyDataModal(
  props: ModifyDataModalProps,
  ref: ForwardedRef<{ openModal: (props: OpenModalProps) => void }>,
) {
  const monacoEditorHeadersRef = useRef<any>({})
  const monacoEditorRequestPayloadRef = useRef<any>({})
  const monacoEditorResponseRef = useRef<any>({})

  const { onSave = () => {}, theme = 'vs' } = props
  const [visible, setVisible] = useState(false)
  const [groupIndex, setGroupIndex] = useState(0)
  const [interfaceIndex, setInterfaceIndex] = useState(0)
  const [activeTab, setActiveTab] = useState('Response')
  const [request, setRequest] = useState('') // matched url
  const [replacementMethod, setReplacementMethod] = useState('')
  const [replacementUrl, setReplacementUrl] = useState('')
  const [replacementStatusCode, setReplacementStatusCode] = useState('200')
  const [headersText, setHeadersText] = useState('')
  const [requestPayloadText, setRequestPayloadText] = useState('')
  const [responseLanguage, setResponseLanguage] = useState('json')
  const [responseText, setResponseText] = useState('')

  useImperativeHandle(ref, () => ({
    openModal,
  }))

  const openModal = ({
    groupIndex,
    interfaceIndex,
    activeTab,
    request,
    replacementMethod,
    replacementUrl,
    replacementStatusCode,
    headersText,
    requestPayloadText,
    responseLanguage,
    responseText,
  }: OpenModalProps) => {
    setGroupIndex(groupIndex)
    setInterfaceIndex(interfaceIndex)
    setActiveTab(activeTab)
    setRequest(request)
    // modify ⬇️
    setReplacementMethod(replacementMethod)
    setReplacementUrl(replacementUrl)
    setReplacementStatusCode(replacementStatusCode)
    setHeadersText(headersText)
    setRequestPayloadText(requestPayloadText)
    setResponseLanguage(responseLanguage)
    setResponseText(responseText)
    setVisible(true)
  }

  const handleOk = () => {
    const { editorInstance: headersEditorInstance }
      = monacoEditorHeadersRef.current
    const { editorInstance: requestPayloadEditorInstance }
      = monacoEditorRequestPayloadRef.current
    const { editorInstance: responseEditorInstance }
      = monacoEditorResponseRef.current
    const headersEditorValue = headersEditorInstance?.getValue()
    const requestPayloadEditorValue = requestPayloadEditorInstance?.getValue()
    const responseEditorValue = responseEditorInstance?.getValue()
    const language = responseEditorInstance?.getModel()?.getLanguageId()
    onSave({
      groupIndex,
      interfaceIndex,
      replacementMethod,
      replacementUrl,
      replacementStatusCode,
      headersEditorValue,
      requestPayloadEditorValue,
      responseEditorValue,
      language,
    })
    setVisible(false)
  }

  return (
    <>
      <Modal
        centered
        title={(
          <span style={{ fontSize: 12 }}>
            匹配的 URL：
            {request}
          </span>
        )}
        width="95%"
        open={visible}
        onOk={handleOk}
        onCancel={() => setVisible(false)}
        okText="保存"
        cancelText="取消"
        bodyStyle={{
          padding: 12,
        }}
        destroyOnClose
        focusTriggerAfterClose={false}
      >
        <Tabs
          defaultActiveKey={activeTab}
          activeKey={activeTab}
          size="small"
          onChange={v => setActiveTab(v)}
          items={[
            {
              label: `响应`,
              key: 'Response',
              children: (
                <Wrapper>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ width: 100 }}>状态码</div>
                    <Input
                      value={replacementStatusCode}
                      maxLength={3}
                      size="small"
                      placeholder="请输入要替换的状态码"
                      onChange={e => setReplacementStatusCode(e.target.value)}
                    />
                  </div>
                  <MonacoEditor
                    ref={monacoEditorResponseRef}
                    language={responseLanguage}
                    text={responseText}
                    examples={RESPONSE_EXAMPLES}
                    editorHeight="calc(100vh - 300px - 40px)"
                    theme={theme}
                  />
                </Wrapper>
              ),
            },
            {
              label: `请求`,
              key: 'Request',
              children: (
                <Wrapper>
                  <Space
                    direction="vertical"
                    size="small"
                    style={{ display: 'flex' }}
                  >
                    <Card title="替换请求 URL" type="inner" size="small">
                      <Space.Compact style={{ width: '100%' }}>
                        <Select
                          popupMatchSelectWidth={false}
                          value={replacementMethod}
                          onChange={value => setReplacementMethod(value)}
                        >
                          <Select.Option value="">*(保持原值)</Select.Option>
                          {HTTP_METHOD_MAP.map(method => (
                            <Select.Option key={method} value={method}>
                              {method}
                            </Select.Option>
                          ))}
                        </Select>
                        <Input
                          value={replacementUrl}
                          placeholder="请输入要替换的 URL"
                          onChange={e => setReplacementUrl(e.target.value)}
                        />
                      </Space.Compact>
                    </Card>
                    <Card title="替换请求头" type="inner" size="small">
                      <MonacoEditor
                        ref={monacoEditorHeadersRef}
                        language="json"
                        languageSelectOptions={['json', 'javascript']}
                        text={headersText}
                        editorHeight="calc(100vh - 300px - 168px)"
                        examples={HEADERS_EXAMPLES}
                        theme={theme}
                      />
                    </Card>
                  </Space>
                </Wrapper>
              ),
            },
            {
              label: `请求载荷`,
              key: 'RequestPayload',
              children: (
                <MonacoEditor
                  ref={monacoEditorRequestPayloadRef}
                  language="javascript"
                  languageSelectOptions={['javascript']}
                  text={requestPayloadText}
                  examples={REQUEST_PAYLOAD_EXAMPLES}
                  theme={theme}
                />
              ),
            },
          ]}
        />
      </Modal>
    </>
  )
}

export default React.memo(React.forwardRef(ModifyDataModal))
