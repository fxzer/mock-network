import { Spin } from 'antd'
import * as React from 'react'
import LazyMonacoEditor from '../../../components/LazyMonacoEditor'
import {
  formatJsonLikeText,
  getEditorTheme,
  parseJsonSafely,
} from '../utils'

export default function RequestResponse({
  loading = false,
  responseContent,
  theme,
}: {
  loading?: boolean
  responseContent: string
  theme?: 'light' | 'dark'
}) {
  const parsedResponse = React.useMemo(
    () => parseJsonSafely(responseContent),
    [responseContent],
  )

  if (loading && !responseContent) {
    return <Spin size="small" />
  }

  if (parsedResponse && typeof parsedResponse === 'object') {
    return (
      <LazyMonacoEditor
        language="json"
        text={JSON.stringify(parsedResponse, null, 2)}
        theme={getEditorTheme(theme)}
        readOnly={true}
        editorHeight="calc(100vh - 180px)"
        languageSelectOptions={[]}
      />
    )
  }

  return <pre>{formatJsonLikeText(responseContent)}</pre>
}
