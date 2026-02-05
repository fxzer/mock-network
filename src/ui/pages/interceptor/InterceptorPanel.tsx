import type { MenuProps } from 'antd'
import type { DefaultInterfaceObject } from '../../constants'
import {
  DeleteOutlined,
  DropboxOutlined,
  EditOutlined,
  FormOutlined,
  MinusOutlined,
  MoreOutlined,
  PlusOutlined,
  RightOutlined,
  ToTopOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import {
  Button,
  Collapse,
  Dropdown,
  Input,
  Modal,
  Result,
  Select,
  Switch,
} from 'antd'
import * as React from 'react'
import { useRef, useState } from 'react'
import FormatApiMsg from '../../components/FormatApiMsg'
import MonacoEditor from '../../components/MonacoEditor'
import { HTTP_METHOD_MAP } from '../../constants'

const { Panel } = Collapse
const { TextArea } = Input

// 检测是否是公司特有的 API 响应结构
function isSysxcpApiResponse(responseText: string): boolean {
  if (!responseText)
    return false
  try {
    const data = JSON.parse(responseText)
    if (
      data.result
      && typeof data.result === 'string'
      && data.result.includes('com.syscxp')
    ) {
      return true
    }
  }
  catch {
    // 不是有效的 JSON
  }
  return false
}

// 解析公司 API 响应，提取内层数据
function parseSysxcpApiResponse(
  responseText: string,
): { key: string, value: any, outer: any } | null {
  try {
    const outer = JSON.parse(responseText)
    if (outer.result && typeof outer.result === 'string') {
      const resultObj = JSON.parse(outer.result)
      const firstKey = Object.keys(resultObj)[0]
      if (firstKey && firstKey.includes('com.syscxp')) {
        return {
          key: firstKey,
          value: resultObj[firstKey],
          outer,
        }
      }
    }
  }
  catch {
    // 解析失败
  }
  return null
}

// 重新组装公司 API 响应
function assembleSysxcpApiResponse(
  outer: any,
  key: string,
  value: any,
): string {
  const resultObj = { [key]: value }
  const newOuter = { ...outer, result: JSON.stringify(resultObj) }
  return JSON.stringify(newOuter)
}

interface InterceptorPanelProps {
  ajaxDataList: any[]
  modifyDataModalRef: any
  theme?: string
  onGroupAdd: () => void
  onImportClick: () => void
  onGroupSummaryTextChange: (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
  ) => void
  onCollapseChange: (index: number, keys: string | string[]) => void
  onGroupOpenChange: (index: number, open: boolean) => void
  onGroupMove: (index: number, placement: string) => void
  onGroupDelete: (index: number) => void
  onInterfaceListChange: (
    groupIndex: number,
    interfaceIndex: number,
    key: string,
    value: any,
  ) => void
  onInterfaceListAdd: (groupIndex: number) => void
  onInterfaceListDelete: (groupIndex: number, key: string) => void
  onInterfaceMove: (
    groupIndex: number,
    interfaceIndex: number,
    placement: string,
  ) => void
}

const InterceptorPanel: React.FC<InterceptorPanelProps> = ({
  ajaxDataList,
  modifyDataModalRef,
  theme = 'vs',
  onGroupAdd,
  onImportClick,
  onGroupSummaryTextChange,
  onCollapseChange,
  onGroupOpenChange,
  onGroupMove,
  onGroupDelete,
  onInterfaceListChange,
  onInterfaceListAdd,
  onInterfaceListDelete,
  onInterfaceMove,
}) => {
  const monacoEditorInnerRef = useRef<any>({})
  // 内层数据编辑弹窗状态
  const [innerEditModal, setInnerEditModal] = useState<{
    visible: boolean
    groupIndex: number
    interfaceIndex: number
    apiKey: string
    innerValue: string
    outer: any
  }>({
    visible: false,
    groupIndex: 0,
    interfaceIndex: 0,
    apiKey: '',
    innerValue: '',
    outer: null,
  })

  // 打开内层编辑弹窗
  const openInnerEditModal = (
    groupIndex: number,
    interfaceIndex: number,
    responseText: string,
  ) => {
    const parsed = parseSysxcpApiResponse(responseText)
    if (parsed) {
      setInnerEditModal({
        visible: true,
        groupIndex,
        interfaceIndex,
        apiKey: parsed.key,
        innerValue: JSON.stringify(parsed.value, null, 2),
        outer: parsed.outer,
      })
    }
  }

  // 保存内层编辑
  const saveInnerEdit = () => {
    try {
      const { editorInstance } = monacoEditorInnerRef.current
      const editorValue
        = editorInstance?.getValue() || innerEditModal.innerValue
      const parsedValue = JSON.parse(editorValue)
      const newResponseText = assembleSysxcpApiResponse(
        innerEditModal.outer,
        innerEditModal.apiKey,
        parsedValue,
      )
      onInterfaceListChange(
        innerEditModal.groupIndex,
        innerEditModal.interfaceIndex,
        'responseText',
        newResponseText,
      )
      setInnerEditModal(prev => ({ ...prev, visible: false }))
    }
    catch (e) {
      // JSON 解析失败，可以添加错误提示
      console.error('Invalid JSON:', e)
    }
  }

  const genExtra = (
    groupIndex: number,
    interfaceIndex: number,
    v: DefaultInterfaceObject,
  ) => {
    const { interfaceList = [] } = ajaxDataList[groupIndex]
    const items: MenuProps['items'] = [
      {
        key: '0',
        label: '编辑数据',
        icon: <FormOutlined style={{ fontSize: 14 }} />,
        onClick: () =>
          modifyDataModalRef.current.openModal({
            groupIndex,
            interfaceIndex,
            activeTab: 'Response',
            request: v.request,
            replacementMethod: v.replacementMethod,
            replacementUrl: v.replacementUrl,
            replacementStatusCode: v.replacementStatusCode,
            headersText: v.headers,
            requestPayloadText: v.requestPayloadText,
            responseLanguage: v.language,
            responseText: v.responseText,
          }),
      },
      {
        key: '1',
        label: '移到顶部',
        icon: <ToTopOutlined style={{ fontSize: 14 }} />,
        onClick: () => onInterfaceMove(groupIndex, interfaceIndex, 'top'),
        disabled: interfaceIndex === 0,
      },
      {
        key: '2',
        label: '移到底部',
        icon: (
          <ToTopOutlined
            style={{ transform: 'rotateZ(180deg)', fontSize: 14 }}
          />
        ),
        onClick: () => onInterfaceMove(groupIndex, interfaceIndex, 'bottom'),
        disabled: interfaceIndex === interfaceList.length - 1,
      },
    ]
    return (
      <div
        onClick={event => event.stopPropagation()}
        style={{
          display: 'flex',
          alignItems: 'center',
          alignSelf: 'flex-start',
          height: 24,
        }}
      >
        <Switch
          title={v.open ? '禁用规则' : '启用规则'}
          checked={v.open}
          onChange={value =>
            onInterfaceListChange(groupIndex, interfaceIndex, 'open', value)}
          size="small"
          style={{ margin: '0 4px' }}
        />
        <Button
          danger
          size="small"
          type="primary"
          shape="circle"
          icon={<MinusOutlined />}
          title="删除接口"
          onClick={() => onInterfaceListDelete(groupIndex, v.key)}
          style={{ minWidth: 16, width: 16, height: 16 }}
        />
        <Dropdown menu={{ items }} trigger={['click']}>
          <MoreOutlined title="更多" style={{ marginLeft: 4, fontSize: 18 }} />
        </Dropdown>
      </div>
    )
  }

  return (
    <>
      {ajaxDataList.map((item, index) => {
        const {
          summaryText,
          headerClass,
          interfaceList = [],
          collapseActiveKeys = [],
        } = item
        const groupOpen = !!interfaceList.find((v: any) => v.open)
        const fold = collapseActiveKeys.length < 1
        return (
          <div key={index}>
            <div className={`ajax-tools-iframe-body-header ${headerClass}`}>
              <Button
                type="text"
                shape="circle"
                size="small"
                title="收起/展开全部"
                icon={(
                  <RightOutlined
                    style={{
                      transform: fold ? undefined : 'rotateZ(90deg)',
                      transition: '.3s',
                    }}
                  />
                )}
                onClick={() => {
                  if (fold) {
                    // 当前折叠要展开
                    const allKeys = interfaceList.map((v: any) => v.key)
                    onCollapseChange(index, allKeys)
                  }
                  else {
                    onCollapseChange(index, [])
                  }
                }}
              />
              <Input
                value={summaryText}
                className={`ajax-tools-iframe-body-header-input ${headerClass}`}
                onChange={e => onGroupSummaryTextChange(e, index)}
              />
              <Switch
                title={groupOpen ? '禁用分组' : '启用分组'}
                checked={groupOpen}
                onChange={open => onGroupOpenChange(index, open)}
                size="small"
                style={{ margin: '0 22px 0 4px' }}
              />
              <Dropdown
                menu={{
                  items: [
                    {
                      key: '0',
                      label: '移到顶部',
                      icon: <ToTopOutlined style={{ fontSize: 14 }} />,
                      onClick: () => onGroupMove(index, 'top'),
                      disabled: index === 0,
                    },
                    {
                      key: '1',
                      label: '移到底部',
                      icon: (
                        <ToTopOutlined
                          style={{
                            transform: 'rotateZ(180deg)',
                            fontSize: 14,
                          }}
                        />
                      ),
                      onClick: () => onGroupMove(index, 'bottom'),
                      disabled: index === ajaxDataList.length - 1,
                    },
                    {
                      key: '99',
                      danger: true,
                      label: '删除分组',
                      icon: <DeleteOutlined style={{ fontSize: 14 }} />,
                      onClick: () => onGroupDelete(index),
                    },
                  ],
                }}
                trigger={['click']}
              >
                <Button
                  type="text"
                  shape="circle"
                  size="small"
                  title="更多"
                  icon={<MoreOutlined style={{ fontSize: 22 }} />}
                />
              </Dropdown>
            </div>
            <Collapse
              className="ajax-tools-iframe-collapse"
              defaultActiveKey={['1']}
              activeKey={item.collapseActiveKeys}
              onChange={keys => onCollapseChange(index, keys)}
              style={{ borderRadius: 0 }}
            >
              {interfaceList.map((v: any, i: number) => {
                return (
                  <Panel
                    key={v.key}
                    header={(
                      <div onClick={e => e.stopPropagation()}>
                        <div
                          style={{
                            display: 'inline-grid',
                            width: '100%',
                          }}
                        >
                          <div style={{ display: 'flex', gap: 4 }}>
                            <Select
                              size="small"
                              value={v.matchType}
                              onChange={value =>
                                onInterfaceListChange(
                                  index,
                                  i,
                                  'matchType',
                                  value,
                                )}
                              style={{ width: 80, fontSize: 12 }}
                              popupMatchSelectWidth={false}
                            >
                              <Select.Option value="normal">普通</Select.Option>
                              <Select.Option value="regex">正则</Select.Option>
                              <Select.Option value="payload">
                                载荷
                              </Select.Option>
                            </Select>
                            <Select
                              size="small"
                              popupMatchSelectWidth={false}
                              value={v.matchMethod}
                              onChange={value =>
                                onInterfaceListChange(
                                  index,
                                  i,
                                  'matchMethod',
                                  value,
                                )}
                              style={{ width: 90, fontSize: 12 }}
                            >
                              <Select.Option value="">*(任意)</Select.Option>
                              {HTTP_METHOD_MAP.map(method => (
                                <Select.Option key={method} value={method}>
                                  {method}
                                </Select.Option>
                              ))}
                            </Select>
                            <Input
                              size="small"
                              value={v.request}
                              onChange={e =>
                                onInterfaceListChange(
                                  index,
                                  i,
                                  'request',
                                  e.target.value,
                                )}
                              placeholder={
                                v.matchType === 'payload'
                                  ? '请输入 JSON Key（如 apiMsg）'
                                  : '请输入匹配的接口'
                              }
                              style={{ flex: 1 }}
                            />
                          </div>
                          <Input
                            value={v.requestDes}
                            onChange={e =>
                              onInterfaceListChange(
                                index,
                                i,
                                'requestDes',
                                e.target.value,
                              )}
                            style={{
                              fontSize: 12,
                              border: 'none',
                              marginTop: '2px',
                              marginBottom: '4px',
                            }}
                            placeholder="备注（可编辑）"
                            size="small"
                            className="ajax-tools-iframe-request-des-input"
                          />
                        </div>
                      </div>
                    )}
                    extra={genExtra(index, i, v)}
                  >
                    <div style={{ position: 'relative' }}>
                      <TextArea
                        rows={4}
                        value={v.responseText}
                        onChange={e =>
                          onInterfaceListChange(
                            index,
                            i,
                            'responseText',
                            e.target.value,
                          )}
                        placeholder='响应  如 { "status": 200, "response": "OK" }'
                      />
                      {/* 公司 API 内层数据编辑按钮 */}
                      {isSysxcpApiResponse(v.responseText) && (
                        <EditOutlined
                          title="编辑内层数据"
                          className="ajax-tools-textarea-edit-inner"
                          onClick={() =>
                            openInnerEditModal(index, i, v.responseText)}
                        />
                      )}
                      <FormOutlined
                        title="编辑"
                        className="ajax-tools-textarea-edit"
                        onClick={() =>
                          modifyDataModalRef.current.openModal({
                            groupIndex: index,
                            interfaceIndex: i,
                            activeTab: 'Response',
                            request: v.request,
                            replacementMethod: v.replacementMethod,
                            replacementUrl: v.replacementUrl,
                            replacementStatusCode: v.replacementStatusCode,
                            headersText: v.headers,
                            requestPayloadText: v.requestPayloadText,
                            responseLanguage: v.language,
                            responseText: v.responseText,
                          })}
                      />
                    </div>
                  </Panel>
                )
              })}
            </Collapse>
            <div className="ajax-tools-iframe-body-footer">
              <Button
                size="small"
                type="primary"
                shape="circle"
                icon={<PlusOutlined />}
                title="添加接口"
                onClick={() => onInterfaceListAdd(index)}
              />
            </div>
          </div>
        )
      })}
      {ajaxDataList.length < 1 && (
        <Result
          icon={<DropboxOutlined style={{ color: '#c1d0dd' }} />}
          title="暂无数据"
          subTitle={(
            <>
              点击
              {' '}
              <Button size="small" type="primary" onClick={onGroupAdd}>
                添加分组
              </Button>
              {' '}
              按钮创建规则
              <br />
              或点击
              {' '}
              <Button
                size="small"
                style={{ marginTop: 6 }}
                onClick={onImportClick}
              >
                <UploadOutlined />
                导入
              </Button>
              {' '}
              按钮导入
              {' '}
              <strong>.json</strong>
              {' '}
              文件
              <br />
              或按 F12 打开开发者工具，选择 U-Network 面板快速开始
            </>
          )}
        />
      )}
      {/* 公司 API 内层数据编辑弹窗 */}
      <Modal
        centered
        title={(
          <span style={{ fontSize: 12 }}>
            编辑内层数据：
            <FormatApiMsg msgType={innerEditModal.apiKey} hidePrefix />
          </span>
        )}
        open={innerEditModal.visible}
        onOk={saveInnerEdit}
        onCancel={() =>
          setInnerEditModal(prev => ({ ...prev, visible: false }))}
        okText="保存"
        cancelText="取消"
        width="95%"
        bodyStyle={{ padding: 12 }}
        destroyOnClose
        focusTriggerAfterClose={false}
      >
        <MonacoEditor
          ref={monacoEditorInnerRef}
          language="json"
          text={innerEditModal.innerValue}
          theme={theme}
          editorHeight="calc(100vh - 260px)"
          languageSelectOptions={[]}
          examples={[
            {
              egTitle: '示例',
              egType: 'json',
              egText: `{
  "inventories": [
    {
      "uuid": "363cd3476747450487de77df09c5cf01",
      "name": "name example"
    }
  ],
  "total": 12,
  "success": true
}`,
            },
          ]}
        />
      </Modal>
    </>
  )
}

export default InterceptorPanel
