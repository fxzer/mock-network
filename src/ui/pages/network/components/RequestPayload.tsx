import * as React from 'react';
import { Divider } from 'antd';
import MonacoEditor from '../../../components/MonacoEditor';

// Helper function duplicated for SFC independence, or could be imported from a utils file
const formatText = (value: string) => {
  let text = '';
  try {
    text = JSON.stringify(JSON.parse(value), null, 4);
  } catch (e) {
    text = value;
  }
  return text;
};

export default function RequestPayload({
  record,
  theme,
}: {
  record: any;
  theme?: 'light' | 'dark';
}) {
  const postData = record.request.postData || {};
  return (
    <>
      <h4>
        <strong>查询参数</strong>
      </h4>
      {record.request.queryString.map((v: { name: string; value: string }) => {
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
      <Divider orientation="left" style={{ margin: '12px 0 4px' }} />
      <h4>
        <strong>请求载荷</strong>
      </h4>
      <div className="ajax-tools-devtools-text">
        <strong>mimeType:&nbsp;</strong>
        <span>{postData.mimeType}</span>
      </div>
      <div className="ajax-tools-devtools-text">
        <strong>text:&nbsp;</strong>
      </div>
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
                  editorHeight="calc(100vh - 240px)"
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
    </>
  );
}
