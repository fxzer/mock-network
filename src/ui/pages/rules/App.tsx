import { SaveOutlined } from '@ant-design/icons'
import { ConfigProvider, theme } from 'antd'
import * as React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { OpenNewWindowIcon } from '../../components/Icons'
import LazyMonacoEditor from '../../components/LazyMonacoEditor'
import { DECLARATIVE_NET_REQUEST_EXAMPLES } from '../../constants'
import { debounce } from '../../utils'
import { popupWindow } from '../interceptor/PictureInPicture'
import Countdown from './Countdown'

export default function RulesApp() {
  const delayDoUpdateRulesTimer = useRef<any>({})
  const monacoEditorRef = useRef<any>({})
  const [text, setText] = useState('[]')
  const [saveTextTips, setSaveTextTips] = useState<React.ReactNode>(<></>)
  useEffect(() => {
    chrome.declarativeNetRequest
    && chrome.declarativeNetRequest.getDynamicRules((rulesList) => {
      setText(JSON.stringify(rulesList, null, 2))
    })
  }, [])

  const updateRules = (rulesStr: string) => {
    clearTimeout(delayDoUpdateRulesTimer.current)
    try {
      setSaveTextTips(<span style={{ color: '#999' }}>保存中...</span>)
      const rules = JSON.parse(rulesStr)
      chrome.declarativeNetRequest.getDynamicRules(async (rulesList) => {
        try {
          await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: rulesList.map(v => v.id),
            addRules: rules,
          })
          setSaveTextTips(<span style={{ color: '#999' }}>保存成功！</span>)
        }
        catch (err) {
          console.error(err)
          setSaveTextTips(<span style={{ color: '#ff0000' }}>保存失败！</span>)
        }
      })
    }
    catch (err) {
      console.error(err)
      setSaveTextTips(<span style={{ color: '#ff0000' }}>保存失败！</span>)
    }
  }

  const delayDoUpdateRules = (rulesStr: string, seconds = 6) => {
    setSaveTextTips(
      <span style={{ color: '#999' }}>
        <Countdown seconds={seconds} />
        {' '}
        秒后保存
      </span>,
    )
    const timeout = seconds * 1000
    delayDoUpdateRulesTimer.current = setTimeout(() => {
      updateRules(rulesStr)
    }, timeout)
  }
  const debounceUpdateRules = debounce(delayDoUpdateRules, 1000)
  const onDidChangeContent = useCallback((v: string) => {
    if (delayDoUpdateRulesTimer.current) {
      clearTimeout(delayDoUpdateRulesTimer.current)
    }
    setSaveTextTips(<span style={{ color: '#999' }}>内容已变更</span>)
    debounceUpdateRules(v)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSave = useCallback(() => {
    const { editorInstance } = monacoEditorRef.current
    updateRules(editorInstance.getValue())
  }, [])

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
      }}
    >
      <div>
        <LazyMonacoEditor
          ref={monacoEditorRef}
          theme="vs"
          headerStyle={{
            background: '#fff',
            color: '#000',
            borderColor: '#d1d3d8',
          }}
          headerLeftNode={(
            <>
              <SaveOutlined
                title="保存"
                style={{ fontSize: 18, marginRight: 12 }}
                onClick={onSave}
              />
              {saveTextTips}
            </>
          )}
          headerRightNode={(
            <a
              title="文档"
              href="https://github.com/fxzer/ajax-tools#support-blocking-or-modifying-network-requests-using-specified-declarative-rules-through-chromedeclarativenetrequest"
              target="_blank"
              rel="noreferrer"
            >
              文档
            </a>
          )}
          headerRightRightNode={(
            <OpenNewWindowIcon
              style={{ cursor: 'pointer' }}
              onClick={() =>
                popupWindow({
                  url: chrome.runtime.getURL('src/ui/dist/rules.html'),
                })}
            />
          )}
          language="json"
          languageSelectOptions={[]}
          text={text}
          examples={DECLARATIVE_NET_REQUEST_EXAMPLES}
          editorHeight={document.body.offsetHeight - 50}
          onDidChangeContent={onDidChangeContent}
          onSaveKeyword={onSave}
        />
      </div>
    </ConfigProvider>
  )
}
