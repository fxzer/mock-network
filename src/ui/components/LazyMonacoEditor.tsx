import type {
  MonacoEditorHandle,
  MonacoEditorProps,
} from './MonacoEditor'
import * as React from 'react'

const MonacoEditor = React.lazy(() => import('./MonacoEditor'))

function getFallbackHeight(editorHeight: MonacoEditorProps['editorHeight']) {
  if (typeof editorHeight === 'number') {
    return `${editorHeight}px`
  }

  return editorHeight || 240
}

function LazyMonacoEditor({ ref, ...props }: MonacoEditorProps & { ref?: React.RefObject<MonacoEditorHandle | null> }) {
  const fallbackStyle = {
    height: getFallbackHeight(props.editorHeight),
    minHeight: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#999',
    border: '1px solid #f0f0f0',
    background: 'var(--ant-color-bg-container, #fff)',
  } satisfies React.CSSProperties

  return (
    <React.Suspense fallback={<div style={fallbackStyle}>编辑器加载中...</div>}>
      <MonacoEditor ref={ref} {...props} />
    </React.Suspense>
  )
}

export default React.memo(LazyMonacoEditor)
