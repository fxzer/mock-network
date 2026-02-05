import * as React from 'react';
import { Divider } from 'antd';

export default function RequestHeaders({ record }: { record: any }) {
  return (
    <>
      <h4>
        <strong>General</strong>
      </h4>
      <div className="ajax-tools-devtools-text">
        <strong>Request URL:&nbsp;</strong>
        <span>{record.request.url}</span>
      </div>
      <div className="ajax-tools-devtools-text">
        <strong>Request Method:&nbsp;</strong>
        <span>{record.request.method}</span>
      </div>
      <div className="ajax-tools-devtools-text">
        <strong>Status Code:&nbsp;</strong>
        <span>{record.response.status}</span>
      </div>
      <div className="ajax-tools-devtools-text">
        <strong>Remote Address:&nbsp;</strong>
        <span>{record.serverIPAddress}</span>
      </div>

      <Divider orientation="left" style={{ margin: '12px 0 4px' }} />
      <h4>
        <strong>响应头</strong>
      </h4>
      <div className="ajax-tools-devtools-text">
        <strong>Http Version:&nbsp;</strong>
        <span>{record.response.httpVersion}</span>
      </div>
      {record.response.headers.map((v: { name: string; value: string }) => {
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
        <strong>请求头</strong>
      </h4>
      <div className="ajax-tools-devtools-text">
        <strong>Http Version:&nbsp;</strong>
        <span>{record.request.httpVersion}</span>
      </div>
      {record.request.headers.map((v: { name: string; value: string }) => {
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
    </>
  );
}
