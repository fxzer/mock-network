import * as React from 'react';
import MonacoEditor from '../../../components/MonacoEditor';
import { FormatApiMsg } from '../../../utils';
import CopyIcon from './CopyIcon';

export default function FormattedResponse({
  apiReply,
  displayData,
  theme,
}: {
  apiReply: string;
  displayData: any;
  theme?: 'light' | 'dark';
}) {
  return (
    <>
      {apiReply && (
        <div
          style={{
            padding: '4px',
            marginBottom: '12px',
            background: theme === 'dark' ? 'rgb(0, 0, 0,0.2)' : '#f0f2f5',
            color: theme === 'dark' ? '#e6e6e6' : '#666',
            borderRadius: '4px',
            borderLeft: '2px solid #1890ff',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <FormatApiMsg msgType={apiReply} />
          <CopyIcon text={apiReply} />
        </div>
      )}
      {displayData && typeof displayData === 'object' ? (
        <>
          <MonacoEditor
            language="json"
            text={JSON.stringify(displayData, null, 2)}
            theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
            readOnly={true}
            editorHeight="calc(100vh - 160px)"
            languageSelectOptions={[]}
          />
        </>
      ) : (
        <pre>{String(displayData || '')}</pre>
      )}
    </>
  );
}
