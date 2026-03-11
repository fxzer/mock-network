import { Divider } from 'antd';
import * as React from 'react';
import MonacoEditor from '../../../components/MonacoEditor';
import FormattedResponse from './FormattedResponse';

// Helper function duplicated for SFC independence, or could be imported from a utils file
function formatText(value: string) {
  let text = '';
  try {
    text = JSON.stringify(JSON.parse(value), null, 4);
  } catch (e) {
    text = value;
  }
  return text;
}

export default function RequestPayload({
  record,
  theme,
  apiReply,
  displayData,
}: {
  record: any;
  theme?: 'light' | 'dark';
  apiReply?: string;
  displayData?: any;
}) {
  const postData = record.request.postData || {};
  return (
    <>
      {record.request.queryString && record.request.queryString.length > 0 && (
        <>
          <h4 className="ajax-tools-devtools-title" style={{ marginTop: 0 }}>
            <strong>查询参数</strong>
          </h4>
          {record.request.queryString.map(
            (v: { name: string; value: string }) => {
              return (
                <div className="ajax-tools-devtools-text" key={v.name}>
                  <strong>
                    {v.name}
                    :&nbsp;
                  </strong>
                  <span>{v.value}</span>
                </div>
              );
            },
          )}
          <Divider orientation="left" style={{ margin: '12px 0 4px' }} />
        </>
      )}
      <h4
        className="ajax-tools-devtools-title"
        style={{
          ...(record.request.queryString &&
          record.request.queryString.length > 0
            ? {}
            : { marginTop: 0 }),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <strong>请求载荷</strong>
        {postData.mimeType && (
          <span
            style={{ fontSize: '12px', fontWeight: 'normal', color: '#999' }}
          >
            {postData.mimeType}
          </span>
        )}
      </h4>
      <div style={{ marginTop: 8 }}>
        {(() => {
          try {
            const json = JSON.parse(postData.text);
            if (typeof json === 'object' && json !== null) {
              return (
                <MonacoEditor
                  language="json"
                  text={JSON.stringify(json, null, 2)}
                  theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
                  editorHeight="calc(100vh - 500px)"
                  readOnly={true}
                  languageSelectOptions={[]}
                />
              );
            }
          } catch (e) {
            // ignore
          }
          return <pre>{formatText(postData.text)}</pre>;
        })()}
      </div>
      {postData.params && (
        <div className="ajax-tools-devtools-text">
          <strong>Params:&nbsp;</strong>
          {(postData.params || []).map((v: { name: string; value: string }) => {
            return (
              <div className="ajax-tools-devtools-text" key={v.name}>
                <strong>
                  {v.name}
                  :&nbsp;
                </strong>
                <span>{v.value}</span>
              </div>
            );
          })}
        </div>
      )}
      {displayData !== undefined && displayData !== null && (
        <>
          <Divider orientation="left" style={{ margin: '12px 0 4px' }} />
          <h4 className="ajax-tools-devtools-title">
            <strong>{apiReply ? '格式化响应' : '响应'}</strong>
          </h4>
          <div style={{ marginTop: 8 }}>
            <FormattedResponse
              apiReply={apiReply || ''}
              displayData={displayData}
              theme={theme}
              editorHeight="400px"
            />
          </div>
        </>
      )}
    </>
  );
}
