import { Divider } from 'antd'
import * as React from 'react'
import LazyMonacoEditor from '../../../components/LazyMonacoEditor'
import {
  formatDisplayContent,
  formatJsonLikeText,
  getEditorTheme,
  parseJsonSafely,
} from '../utils'
import CopyIcon from './CopyIcon'
import FormattedResponse from './FormattedResponse'

function KeyValueList({
  entries,
}: {
  entries: Array<{ name: string, value: string }>
}) {
  /* eslint-disable react/no-array-index-key -- 同名 header 可能多条，需序号区分 */
  const items = entries.map((entry, index) => (
    <div className="ajax-tools-devtools-text" key={`${entry.name}-${index}`}>
      <strong>
        {entry.name}
        :&nbsp;
      </strong>
      <span>{entry.value}</span>
    </div>
  ))
  /* eslint-enable react/no-array-index-key */

  return items
}

export default function RequestPayload({
  apiReply,
  displayData,
  record,
  theme,
}: {
  apiReply?: string
  displayData?: unknown
  record: any
  theme?: 'light' | 'dark'
}) {
  const postData = record.request.postData || {}
  const queryEntries = record.request.queryString || []
  const paramEntries = postData.params || []
  const payloadText = postData.text || ''
  const parsedPayload = React.useMemo(
    () => parseJsonSafely(payloadText),
    [payloadText],
  )
  const requestPayloadText = React.useMemo(
    () => formatJsonLikeText(payloadText),
    [payloadText],
  )
  const formattedResponseText = React.useMemo(
    () => formatDisplayContent(displayData),
    [displayData],
  )
  const hasQueryEntries = queryEntries.length > 0

  return (
    <>
      {hasQueryEntries && (
        <>
          <h4 className="ajax-tools-devtools-title" style={{ marginTop: 0 }}>
            <strong>查询参数</strong>
          </h4>
          <KeyValueList entries={queryEntries} />
          <Divider orientation="left" style={{ margin: '12px 0 4px' }} />
        </>
      )}

      <h4
        className="ajax-tools-devtools-title"
        style={{
          alignItems: 'center',
          display: 'flex',
          justifyContent: 'space-between',
          ...(hasQueryEntries ? {} : { marginTop: 0 }),
        }}
      >
        <span style={{ alignItems: 'center', display: 'flex' }}>
          <strong>请求载荷</strong>
          {requestPayloadText && (
            <CopyIcon text={requestPayloadText} title="复制请求载荷" />
          )}
        </span>
        {postData.mimeType && (
          <span style={{ color: '#999', fontSize: '12px', fontWeight: 'normal' }}>
            {postData.mimeType}
          </span>
        )}
      </h4>

      <div style={{ marginTop: 8 }}>
        {parsedPayload && typeof parsedPayload === 'object'
          ? (
              <LazyMonacoEditor
                language="json"
                text={JSON.stringify(parsedPayload, null, 2)}
                theme={getEditorTheme(theme)}
                editorHeight="calc(100vh - 500px)"
                readOnly={true}
                languageSelectOptions={[]}
              />
            )
          : (
              <pre>{requestPayloadText}</pre>
            )}
      </div>

      {paramEntries.length > 0 && (
        <div className="ajax-tools-devtools-text">
          <strong>Params:&nbsp;</strong>
          <KeyValueList entries={paramEntries} />
        </div>
      )}

      {displayData !== undefined && displayData !== null && (
        <>
          <Divider orientation="left" style={{ margin: '12px 0 4px' }} />
          <h4 className="ajax-tools-devtools-title">
            <span style={{ alignItems: 'center', display: 'flex' }}>
              <strong>{apiReply ? '格式化响应' : '响应'}</strong>
              {formattedResponseText && (
                <CopyIcon
                  text={formattedResponseText}
                  title={apiReply ? '复制格式化响应' : '复制响应'}
                />
              )}
            </span>
          </h4>
          <div style={{ marginTop: 8 }}>
            <FormattedResponse
              apiReply={apiReply || ''}
              displayData={displayData}
              theme={theme}
              editorHeight="400px"
              requestPath={record?.request?.url}
            />
          </div>
        </>
      )}
    </>
  )
}
