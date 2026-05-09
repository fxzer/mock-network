import * as React from 'react'
import FormatApiMsg from '../../../components/FormatApiMsg'
import LazyMonacoEditor from '../../../components/LazyMonacoEditor'
import { formatDisplayContent, getEditorTheme } from '../utils'
import CopyIcon from './CopyIcon'

export default function FormattedResponse({
  apiReply,
  displayData,
  editorHeight = 'calc(100vh - 160px)',
  requestPath,
  theme,
}: {
  apiReply: string
  displayData: unknown
  editorHeight?: string
  requestPath?: string
  theme?: 'light' | 'dark'
}) {
  const formattedText = React.useMemo(
    () => formatDisplayContent(displayData),
    [displayData],
  )

  return (
    <>
      {apiReply && (
        <div
          style={{
            alignItems: 'center',
            background: theme === 'dark' ? 'rgb(0, 0, 0, 0.2)' : '#f0f2f5',
            borderLeft: '2px solid #1890ff',
            borderRadius: '4px',
            color: theme === 'dark' ? '#e6e6e6' : '#666',
            display: 'flex',
            marginBottom: '12px',
            padding: '4px',
          }}
        >
          <FormatApiMsg msgType={apiReply} requestPath={requestPath} />
          <CopyIcon text={apiReply} />
        </div>
      )}

      {displayData && typeof displayData === 'object'
        ? (
            <LazyMonacoEditor
              language="json"
              text={formattedText}
              theme={getEditorTheme(theme)}
              readOnly={true}
              editorHeight={editorHeight}
              languageSelectOptions={[]}
            />
          )
        : (
            <pre>{formattedText}</pre>
          )}
    </>
  )
}
