import type { ModifyDataModalOnSaveProps } from './ModifyDataModal'
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons'
import { Checkbox, ConfigProvider, Dropdown, Space, Switch, theme } from 'antd'
import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import { OpenNewWindowIcon } from '../../components/Icons'

import { defaultAjaxDataList, defaultInterface } from '../../constants'
import { exportJSON } from './ExportJson'
import { openImportJsonModal } from './ImportJson'
import InterceptorPanel from './InterceptorPanel'
import ModifyDataModal from './ModifyDataModal'
import { popupWindow } from './PictureInPicture'
import './App.css'

const colorMap = [
  'ajax-tools-color-volcano',
  'ajax-tools-color-red',
  'ajax-tools-color-orange',
  'ajax-tools-color-gold',
  'ajax-tools-color-green',
  'ajax-tools-color-cyan',
  'ajax-tools-color-blue',
  'ajax-tools-color-geekblue',
  'ajax-tools-color-purple',
  'ajax-tools-color-magenta',
]

function App() {
  const modifyDataModalRef = useRef<any>({})
  const ajaxDataListRef = useRef<any>(null) // 用于存储最新的 ajaxDataList，避免 storage 同步时循环更新

  const [ajaxToolsSkin, setAjaxToolsSkin] = useState('light')
  const [ajaxToolsSwitchOn, setAjaxToolsSwitchOn] = useState(true) // 默认开启
  const [ajaxToolsSwitchOnNot200, setAjaxToolsSwitchOnNot200] = useState(true) // 默认开启
  const [ajaxToolsTopLevelOnly, setAjaxToolsTopLevelOnly] = useState(true) // 默认开启
  const [ajaxDataList, setAjaxDataList] = useState(defaultAjaxDataList)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const themeParam = params.get('theme')
    if (themeParam)
      return themeParam === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  // 保持 ref 与 state 同步
  useEffect(() => {
    ajaxDataListRef.current = ajaxDataList
  }, [ajaxDataList])

  useEffect(() => {
    if (chrome.storage) {
      chrome.storage.local.get(
        [
          'ajaxDataList',
          'ajaxToolsSwitchOn',
          'ajaxToolsSwitchOnNot200',
          'ajaxToolsSkin',
          'ajaxToolsTopLevelOnly',
        ],
        (result) => {
          const {
            ajaxDataList = [],
            ajaxToolsSwitchOn = true,
            ajaxToolsSwitchOnNot200 = true,
            ajaxToolsTopLevelOnly = true,
          } = result
          if (ajaxDataList.length > 0) {
            setAjaxDataList(ajaxDataList)
          }
          setAjaxToolsSwitchOn(ajaxToolsSwitchOn)
          setAjaxToolsSwitchOnNot200(ajaxToolsSwitchOnNot200)
          setAjaxToolsTopLevelOnly(ajaxToolsTopLevelOnly)
        },
      )

      // 监听 storage 变化，实现多窗口/面板数据同步
      const handleStorageChange = (
        changes: { [key: string]: chrome.storage.StorageChange },
        namespace: string,
      ) => {
        if (namespace === 'local' && changes.ajaxDataList) {
          const { newValue } = changes.ajaxDataList
          // 对比当前值，避免循环更新
          if (
            newValue
            && JSON.stringify(newValue) !== JSON.stringify(ajaxDataListRef.current)
          ) {
            setAjaxDataList(newValue)
          }
        }
      }
      chrome.storage.onChanged.addListener(handleStorageChange)

      // 清理监听器
      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange)
      }
    }
    if (chrome.runtime) {
      // 接收uNetwork/App.jsx发来的数据（在uNetWork面板中可以添加拦截数据更新页面）
      chrome.runtime.onMessage.addListener((request) => {
        const { type, to, ajaxDataList } = request
        if (type === 'ajaxTools_updatePage' && to === 'mainSettingSidePage') {
          // console.log('【main/App.jsx】<-【uNetwork】Receive message:', request);
          setAjaxDataList(ajaxDataList)
          chrome.storage.local.set({ ajaxDataList })
        }
      })
    }
  }, [])

  useEffect(() => {
    // Simple system theme detection inline
    const updateTheme = () => {
      const params = new URLSearchParams(window.location.search)
      const themeParam = params.get('theme')
      let isDark
      if (themeParam) {
        isDark = themeParam === 'dark'
      }
      else {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      }
      setIsDarkMode(isDark)
      if (isDark) {
        document.body.classList.add('dark-theme')
      }
      else {
        document.body.classList.remove('dark-theme')
      }
    }

    updateTheme()
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    // Try/catch for safari/old browsers
    try {
      mediaQuery.addEventListener('change', updateTheme)
    }
    catch {
      mediaQuery.addListener(updateTheme)
    }
    return () => {
      try {
        mediaQuery.removeEventListener('change', updateTheme)
      }
      catch {
        mediaQuery.removeListener(updateTheme)
      }
    }
  }, [])

  const onImportClick = async () => {
    const importJsonData = await openImportJsonModal()
    let newAjaxDataList = ajaxDataList
    if (Array.isArray(importJsonData)) {
      newAjaxDataList = [...ajaxDataList, ...importJsonData]
    }
    setAjaxDataList(newAjaxDataList)
    chrome.storage.local.set({ ajaxDataList: newAjaxDataList })
  }
  // 新增分组
  const onGroupAdd = () => {
    const len = ajaxDataList.length
    const newAjaxDataList = [
      ...ajaxDataList,
      {
        summaryText: '分组名称（可编辑）',
        collapseActiveKeys: [],
        headerClass: colorMap[len % 9],
        interfaceList: [{ ...defaultInterface }],
      },
    ]
    setAjaxDataList([...newAjaxDataList])
    chrome.storage.local.set({ ajaxDataList: newAjaxDataList })
  }
  const onGroupDelete = (groupIndex: number) => {
    const newAjaxDataList = ajaxDataList.filter((_, i) => i !== groupIndex)
    setAjaxDataList([...newAjaxDataList])
    chrome.storage.local.set({ ajaxDataList: newAjaxDataList })
  }
  // placement: top|bottom
  const onGroupMove = (groupIndex: number, placement: string) => {
    const movedItem = ajaxDataList.splice(groupIndex, 1)[0]
    if (placement === 'top') {
      ajaxDataList.unshift(movedItem)
    }
    else if (placement === 'bottom') {
      ajaxDataList.push(movedItem)
    }
    setAjaxDataList([...ajaxDataList])
    chrome.storage.local.set({ ajaxDataList })
  }
  const onGroupSummaryTextChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    groupIndex: number,
  ) => {
    ajaxDataList[groupIndex].summaryText = e.target.value
    setAjaxDataList([...ajaxDataList])
    chrome.storage.local.set({ ajaxDataList })
  }
  // 收缩分组 折叠全部keys传[]
  const onCollapseChange = (groupIndex: number, keys: string | string[]) => {
    ajaxDataList[groupIndex].collapseActiveKeys = Array.isArray(keys)
      ? keys
      : [keys]
    setAjaxDataList([...ajaxDataList])
    chrome.storage.local.set({ ajaxDataList })
  }
  const onGroupOpenChange = (groupIndex: number, open: boolean) => {
    ajaxDataList[groupIndex].interfaceList = ajaxDataList[
      groupIndex
    ].interfaceList.map((v) => {
      v.open = open
      return v
    })
    setAjaxDataList([...ajaxDataList])
    chrome.storage.local.set({ ajaxDataList })
  }

  // interfaceList值变化
  const onInterfaceListChange = (
    groupIndex: number,
    interfaceIndex: number,
    key: string,
    value: string | boolean,
  ) => {
    if (key === 'headers' || key === 'responseText') {
      try {
        const lastValue
          = ajaxDataList[groupIndex]?.interfaceList?.[interfaceIndex]?.[key]
        const formattedValue = JSON.stringify(
          JSON.parse(value as string),
          null,
          4,
        )
        value = lastValue === formattedValue ? value : formattedValue
      }
      catch (e) {
        // value = value;
      }
    }
    ajaxDataList[groupIndex].interfaceList[interfaceIndex][key]! = value
    setAjaxDataList([...ajaxDataList])
    chrome.storage.local.set({ ajaxDataList })
  }
  const onInterfaceListAdd = (groupIndex: number) => {
    const key = String(Date.now())
    ajaxDataList[groupIndex].collapseActiveKeys.push(key)
    const interfaceItem = { ...defaultInterface }
    interfaceItem.key = key
    ajaxDataList[groupIndex].interfaceList.push(interfaceItem)
    setAjaxDataList([...ajaxDataList])
    chrome.storage.local.set({ ajaxDataList })
  }
  const onInterfaceListDelete = (groupIndex: number, key: string) => {
    ajaxDataList[groupIndex].collapseActiveKeys = ajaxDataList[
      groupIndex
    ].collapseActiveKeys.filter(activeKey => activeKey !== key)
    ajaxDataList[groupIndex].interfaceList = ajaxDataList[
      groupIndex
    ].interfaceList.filter(v => v.key !== key)
    setAjaxDataList([...ajaxDataList])
    chrome.storage.local.set({ ajaxDataList })
  }
  const onInterfaceListSave = ({
    groupIndex,
    interfaceIndex,
    replacementMethod,
    replacementUrl,
    replacementStatusCode,
    headersEditorValue,
    requestPayloadEditorValue,
    responseEditorValue,
    language,
  }: ModifyDataModalOnSaveProps) => {
    if (replacementMethod !== undefined) {
      onInterfaceListChange(
        groupIndex,
        interfaceIndex,
        'replacementMethod',
        replacementMethod,
      )
    }
    if (replacementUrl !== undefined) {
      onInterfaceListChange(
        groupIndex,
        interfaceIndex,
        'replacementUrl',
        replacementUrl,
      )
    }
    if (replacementStatusCode !== undefined) {
      onInterfaceListChange(
        groupIndex,
        interfaceIndex,
        'replacementStatusCode',
        replacementStatusCode,
      )
    }
    if (headersEditorValue !== undefined) {
      onInterfaceListChange(
        groupIndex,
        interfaceIndex,
        'headers',
        headersEditorValue,
      )
    }
    if (requestPayloadEditorValue !== undefined) {
      onInterfaceListChange(
        groupIndex,
        interfaceIndex,
        'requestPayloadText',
        requestPayloadEditorValue,
      )
    }
    if (responseEditorValue !== undefined) {
      onInterfaceListChange(
        groupIndex,
        interfaceIndex,
        'responseText',
        responseEditorValue,
      )
    }
    if (language !== undefined)
      onInterfaceListChange(groupIndex, interfaceIndex, 'language', language)
  }
  // placement: top|bottom
  const onInterfaceMove = (
    groupIndex: number,
    interfaceIndex: number,
    placement: string,
  ) => {
    const { interfaceList = [] } = ajaxDataList[groupIndex]
    const movedItem = interfaceList.splice(interfaceIndex, 1)[0]
    if (placement === 'top') {
      interfaceList.unshift(movedItem)
    }
    else if (placement === 'bottom') {
      interfaceList.push(movedItem)
    }
    ajaxDataList[groupIndex].interfaceList = interfaceList
    setAjaxDataList([...ajaxDataList])
    chrome.storage.local.set({ ajaxDataList })
  }

  const { defaultAlgorithm, darkAlgorithm } = theme
  const inIframe = top?.location !== self.location
  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? darkAlgorithm : defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
        },
      }}
    >
      <div
        className={`ajax-tools-iframe-container ${isDarkMode ? 'dark-theme' : ''}`}
      >
        <nav className="ajax-tools-iframe-action">
          <Space>
            <Dropdown.Button
              size="small"
              type="primary"
              onClick={onGroupAdd}
              menu={{
                items: [
                  {
                    key: '1',
                    label: '导入',
                    icon: <UploadOutlined style={{ fontSize: 14 }} />,
                    onClick: onImportClick,
                  },
                  {
                    key: '2',
                    label: '导出',
                    icon: <DownloadOutlined style={{ fontSize: 14 }} />,
                    onClick: () =>
                      exportJSON(
                        `MockNetworkData_${JSON.stringify(new Date())}`,
                        ajaxDataList,
                      ),
                    disabled: ajaxDataList.length < 1,
                  },
                ],
              }}
            >
              添加分组
            </Dropdown.Button>
          </Space>
          <div>
            <Checkbox
              defaultChecked
              checked={ajaxToolsTopLevelOnly}
              onChange={(e) => {
                setAjaxToolsTopLevelOnly(e.target.checked)
                chrome.storage.local.set({
                  ajaxToolsTopLevelOnly: e.target.checked,
                })
              }}
            >
              <span title="仅在顶层注入插件，如需拦截 iframe 内请求请禁用此选项">
                忽略iframe
              </span>
            </Checkbox>
            <Checkbox
              defaultChecked
              checked={ajaxToolsSwitchOnNot200}
              onChange={(e) => {
                setAjaxToolsSwitchOnNot200(e.target.checked)
                chrome.storage.local.set({
                  ajaxToolsSwitchOnNot200: e.target.checked,
                })
              }}
              style={{ filter: ajaxToolsSwitchOn ? undefined : 'opacity(0.5)' }}
            >
              <span title="将 404/500 等状态码改为 200">强制200</span>
            </Checkbox>
            <Switch
              defaultChecked
              checkedChildren="开启"
              unCheckedChildren="关闭"
              checked={ajaxToolsSwitchOn}
              onChange={(value) => {
                setAjaxToolsSwitchOn(value)
                chrome.storage.local.set({ ajaxToolsSwitchOn: value })
              }}
            />
            {inIframe
              ? null
              : (
                  <OpenNewWindowIcon
                    style={{ marginLeft: 12, cursor: 'pointer' }}
                    onClick={() =>
                      popupWindow({
                        url: chrome.runtime.getURL(
                          `src/ui/dist/index.html?theme=${
                            isDarkMode ? 'dark' : 'light'
                          }`,
                        ),
                      })}
                  />
                )}
          </div>
        </nav>
        <main
          className="ajax-tools-iframe-body"
          style={{ filter: ajaxToolsSwitchOn ? undefined : 'opacity(0.5)' }}
        >
          <InterceptorPanel
            ajaxDataList={ajaxDataList}
            modifyDataModalRef={modifyDataModalRef}
            theme={isDarkMode ? 'vs-dark' : 'vs'}
            onGroupAdd={onGroupAdd}
            onImportClick={onImportClick}
            onGroupSummaryTextChange={onGroupSummaryTextChange}
            onCollapseChange={onCollapseChange}
            onGroupOpenChange={onGroupOpenChange}
            onGroupMove={onGroupMove}
            onGroupDelete={onGroupDelete}
            onInterfaceListChange={onInterfaceListChange}
            onInterfaceListAdd={onInterfaceListAdd}
            onInterfaceListDelete={onInterfaceListDelete}
            onInterfaceMove={onInterfaceMove}
          />
        </main>
        <ModifyDataModal
          ref={modifyDataModalRef}
          onSave={onInterfaceListSave}
          theme={isDarkMode ? 'vs-dark' : 'vs'}
        />
      </div>
    </ConfigProvider>
  )
}

export default App
