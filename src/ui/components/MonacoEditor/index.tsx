import type { MenuProps } from 'antd'
import type { ForwardedRef } from 'react'
import { AlignLeftOutlined, DownOutlined } from '@ant-design/icons'
import { Dropdown, Select, Space } from 'antd'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
// @ts-ignore
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
// @ts-ignore
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
// @ts-ignore
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import * as React from 'react'
import { useEffect, useImperativeHandle, useRef, useState } from 'react'
// import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
// import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
// editor.all中可查看完整的
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution' // 代码高亮&提示
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution' // 代码高亮&提示
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution' // 代码高亮&提示
import 'monaco-editor/esm/vs/language/json/monaco.contribution' // 代码高亮&提示
import 'monaco-editor/esm/vs/editor/contrib/contextmenu/browser/contextmenu.js' // 右键显示菜单
import 'monaco-editor/esm/vs/editor/contrib/folding/browser/folding.js' // 折叠
import 'monaco-editor/esm/vs/editor/contrib/format/browser/formatActions.js' // 格式化代码
import 'monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestController.js' // 代码联想提示
import 'monaco-editor/esm/vs/editor/contrib/tokenization/browser/tokenization.js' // 代码联想提示
import 'monaco-editor/esm/vs/editor/contrib/comment/browser/comment.js' // 注释
import 'monaco-editor/esm/vs/editor/contrib/find/browser/findController.js' // 搜索

import './index.css'

self.MonacoEnvironment = {
  getWorker(workerId, label) {
    switch (label) {
      case 'json':
        return new jsonWorker()
      //   case 'css':
      //   case 'scss':
      //   case 'less':
      //     return new cssWorker();
      //   case 'html':
      //   case 'handlebars':
      //   case 'razor':
      //     return new htmlWorker();
      case 'typescript':
      case 'javascript':
        return new tsWorker()
      default:
        return new editorWorker()
    }
  },
}

interface MonacoEditorProps {
  languageSelectOptions?: string[]
  editorHeight?: number | string
  language?: string
  text?: string
  examples?: { egTitle?: string, egText: string, egType?: string }[]
  theme?: string
  headerLeftNode?: React.ReactNode
  headerRightNode?: React.ReactNode
  headerRightRightNode?: React.ReactNode
  headerStyle?: object
  onDidChangeContent?: (arg0: string) => void
  onSaveKeyword?: (arg0: any) => void
  readOnly?: boolean // 只读模式
}
type ExamplesType = NonNullable<MonacoEditorProps['examples']>[number]
function MonacoEditor(
  props: MonacoEditorProps,
  ref: ForwardedRef<{ editorInstance: any }>,
) {
  const editorRef = useRef<HTMLDivElement | null>(null)
  const editorInstanceRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const changeDisposableRef = useRef<monaco.IDisposable | null>(null)
  const resizeFrameRef = useRef<number | null>(null)
  useImperativeHandle(ref, () => ({
    editorInstance: editorInstanceRef.current,
  }))
  const {
    languageSelectOptions = ['json', 'javascript'],
    editorHeight = document.body.offsetHeight - 300,
    examples = [{ egTitle: '', egText: '示例', egType: 'json' }],
    theme = 'vs-light',
    headerStyle,
    headerLeftNode,
    headerRightNode,
    headerRightRightNode,
    onDidChangeContent,
    onSaveKeyword,
    readOnly = false, // 默认可编辑
  } = props
  const [editor, setEditor] = useState<any>(null)
  const [language, setLanguage] = useState<string>(props.language || 'json')

  function formatDocumentAction() {
    if (editor)
      editor.getAction('editor.action.formatDocument').run()
  }

  useEffect(() => {
    if (!editor && editorRef.current) {
      const editor = monaco.editor.create(editorRef.current, {
        value: '',
        language,
        theme,
        scrollBeyondLastLine: false,
        tabSize: 2,
        readOnly, // 只读模式
        lineNumbersMinChars: 3, // 调整行号宽度
        minimap: {
          enabled: false, // 禁用 minimap
        },
        scrollbar: {
          alwaysConsumeMouseWheel: false,
        },
      })
      // 添加保存快捷键
      editor.addAction({
        id: 'save',
        label: 'Save',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS], // Ctrl+S 快捷键
        contextMenuGroupId: 'navigation',
        contextMenuOrder: 1.5,
        run(editor) {
          if (onSaveKeyword) {
            onSaveKeyword(editor)
          }
          return undefined
        },
      })
      editorInstanceRef.current = editor
      setEditor(editor)

      return () => {
        const activeElement = document.activeElement
        if (activeElement instanceof HTMLElement && editorRef.current?.contains(activeElement)) {
          activeElement.blur()
        }

        const findController = editor.getContribution(
          'editor.contrib.findController',
        ) as { closeFindWidget?: () => void } | null
        findController?.closeFindWidget?.()

        changeDisposableRef.current?.dispose()
        changeDisposableRef.current = null

        if (resizeFrameRef.current !== null) {
          cancelAnimationFrame(resizeFrameRef.current)
          resizeFrameRef.current = null
        }

        const model = editor.getModel()
        editor.dispose()
        model?.dispose()
        editorInstanceRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    changeDisposableRef.current?.dispose()
    changeDisposableRef.current = null

    if (editor && onDidChangeContent) {
      changeDisposableRef.current = editor.getModel()?.onDidChangeContent(() => {
        onDidChangeContent(editor.getModel()?.getValue() || '')
      }) || null
    }

    return () => {
      changeDisposableRef.current?.dispose()
      changeDisposableRef.current = null
    }
  }, [editor, onDidChangeContent])

  useEffect(() => {
    if (editor) {
      const model = editor.getModel()
      if (!model)
        return

      if (model.getValue() !== (props.text || '')) {
        model.setValue(props.text || '')
      }
      const timer = setTimeout(() => {
        clearTimeout(timer)
        // 格式化代码
        formatDocumentAction()
      }, 300)
    }
  }, [editor, props.text])

  // 监听 theme 变化，动态切换主题
  useEffect(() => {
    if (editor) {
      monaco.editor.setTheme(theme)
    }
  }, [editor, theme])

  // 监听容器宽度变化，自动调整编辑器布局（修复 Drawer 拖拽时编辑器不响应的问题）
  useEffect(() => {
    if (!editor || !editorRef.current)
      return

    let lastWidth = 0
    let lastHeight = 0
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry)
        return

      const { width, height } = entry.contentRect
      if (width === lastWidth && height === lastHeight)
        return

      lastWidth = width
      lastHeight = height

      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current)
      }
      resizeFrameRef.current = requestAnimationFrame(() => {
        resizeFrameRef.current = null
        editor.layout()
      })
    })

    resizeObserver.observe(editorRef.current)

    return () => {
      resizeObserver.disconnect()
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current)
        resizeFrameRef.current = null
      }
    }
  }, [editor])

  const onLanguageChange = (_language: string) => {
    if (editor) {
      setLanguage(_language)
      monaco.editor.setModelLanguage(editor.getModel(), _language) // 切换语言
    }
  }

  const onAddExampleClick = (eg: ExamplesType) => {
    const { egText, egType } = eg
    if (egType)
      onLanguageChange(egType)
    if (editor)
      editor.getModel().setValue(egText)
  }

  const items: MenuProps['items'] = examples.map((eg: ExamplesType, index) => {
    return {
      key: index,
      label: <div onClick={() => onAddExampleClick(eg)}>{eg.egTitle}</div>,
    }
  })
  return (
    <div className="ajax-tools-monaco-editor-container">
      {!readOnly && (
        <header className="ajax-tools-monaco-editor-header" style={headerStyle}>
          <div>
            {headerLeftNode}
            {languageSelectOptions.length > 0
              ? (
                  <Select
                    size="small"
                    value={language}
                    onChange={onLanguageChange}
                    className="ajax-tools-monaco-language-select"
                  >
                    {languageSelectOptions.map(lang => (
                      <Select.Option key={lang} value={lang}>
                        {lang}
                      </Select.Option>
                    ))}
                  </Select>
                )
              : null}
          </div>
          <div>
            <Space size={16}>
              {headerRightNode}
              {examples.length > 1
                ? (
                    <Dropdown menu={{ items }}>
                      <a onClick={e => e.preventDefault()}>
                        <Space size={4}>
                          示例
                          <DownOutlined />
                        </Space>
                      </a>
                    </Dropdown>
                  )
                : (
                    <a title="示例" onClick={() => onAddExampleClick(examples[0])}>
                      示例
                    </a>
                  )}
              <AlignLeftOutlined
                title="格式化"
                onClick={formatDocumentAction}
              />
              {headerRightRightNode}
            </Space>
          </div>
        </header>
      )}
      <div
        ref={editorRef}
        style={{
          height: editorHeight,
          minHeight: 100,
        }}
      />
    </div>
  )
}
export default React.memo(React.forwardRef(MonacoEditor))
