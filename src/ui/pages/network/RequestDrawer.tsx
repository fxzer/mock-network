import { FilterOutlined } from '@ant-design/icons';
import { Drawer, Tabs } from 'antd';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { FormatApiMsg } from '../../utils';
import CopyIcon from './components/CopyIcon';
import FormattedResponse from './components/FormattedResponse';
import RequestHeaders from './components/RequestHeaders';
import RequestPayload from './components/RequestPayload';
import RequestResponse from './components/RequestResponse';
import './RequestDrawer.css';

interface RequestDrawerProps {
  drawerOpen: boolean;
  record: any;
  onClose: () => void;
  onAddInterceptorClick: (record: any) => void;
  theme?: 'light' | 'dark';
}

function Wrapper(props: { children: any }) {
  return (
    <div style={{ height: 'calc(100vh - 120px)', overflow: 'auto' }}>
      {props.children}
    </div>
  );
}

// 纯函数：解析 API 响应，直接返回要展示的数据
const parseApiResponse = (url: string, responseText: string) => {
  const result = {
    displayData: null as any,
    apiReply: '',
  };

  if (!responseText || responseText === 'undefined') {
    return result;
  }

  // 非 API 接口，直接解析返回
  if (!url?.endsWith('/api') && !url?.includes('/api/result')) {
    try {
      result.displayData = JSON.parse(responseText);
    } catch {
      result.displayData = responseText;
    }
    return result;
  }

  // API 接口，检查是否有特殊格式的 result 字段
  try {
    const response = JSON.parse(responseText);

    if (
      response.result &&
      typeof response.result === 'string' &&
      response.result.includes('com.syscxp')
    ) {
      // 解析双重编码的 result 字段
      const resultObj = JSON.parse(response.result);
      const firstKey = Object.keys(resultObj)[0];

      if (firstKey) {
        result.apiReply = firstKey;
        result.displayData = resultObj[firstKey]; // 直接返回要展示的数据
      } else {
        result.displayData = response;
      }
    } else {
      result.displayData = response;
    }
  } catch (e) {
    console.error('解析 API 响应失败:', e);
    result.displayData = responseText;
  }

  return result;
};

export default (props: RequestDrawerProps) => {
  const { drawerOpen, record, onClose, onAddInterceptorClick, theme } = props;

  // Lifted state
  const [displayData, setDisplayData] = useState<any>(null);
  const [apiReply, setApiReply] = useState('');
  const [rawContent, setRawContent] = useState(''); // 保存原始响应内容

  useEffect(() => {
    // Polyfill for navigator.clipboard.writeText to fix "Permissions policy violation"
    // blocked by the browser in this iframe context.
    if (!navigator.clipboard) {
      (navigator as any).clipboard = {};
    }
    navigator.clipboard.writeText = (text: string) => {
      return new Promise((resolve, reject) => {
        try {
          // Use legacy execCommand which is allowed
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.left = '-9999px';
          textarea.style.top = '0';
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          const successful = document.execCommand('copy');
          document.body.removeChild(textarea);
          if (successful) {
            // message.success('已复制到剪贴板'); // 移除默认提示，由调用方控制
            resolve();
          } else {
            console.error('Fallback: Copying text command failed');
            reject(new Error('Copy command failed'));
          }
        } catch (err) {
          console.error('Fallback: Oops, unable to copy', err);
          reject(err);
        }
      });
    };
  }, []);

  useEffect(() => {
    if (drawerOpen && record.getContent) {
      record.getContent((content: string) => {
        setRawContent(content); // 保存原始响应内容
        const result = parseApiResponse(record.request.url, content);
        setDisplayData(result.displayData);
        setApiReply(result.apiReply);
      });
    }
  }, [record, drawerOpen]);

  const title = (
    <span>
      <span style={{ color: '#1890ff' }}>
        {record?._displayFormattedPath ||
          record?._displayPath ||
          record?.request?.url}
      </span>
      {record?._displayApiMsg && (
        <span style={{ marginLeft: 12 }}>
          <FormatApiMsg msgType={record._displayApiMsg} />
          <CopyIcon text={record._displayApiMsg} />
        </span>
      )}
    </span>
  );
  return (
    <Drawer
      title={<span style={{ fontSize: 12 }}>{title}</span>}
      open={drawerOpen}
      onClose={() => onClose()}
      width="80%"
      placement="right"
      mask={false}
      headerStyle={{
        padding: '8px',
        fontSize: '14px',
        wordBreak: 'break-all',
      }}
      bodyStyle={{ padding: '6px 20px' }}
    >
      <Tabs
        defaultActiveKey="4"
        size="small"
        tabBarExtraContent={{
          right: (
            <FilterOutlined
              className="ajax-tools-devtools-text-btn"
              title="添加到拦截列表"
              onClick={() => {
                // 将 apiReply 和原始响应内容附加到 record
                const enhancedRecord = {
                  ...record,
                  _apiReply: apiReply,
                  _rawContent: rawContent, // 传递原始响应内容
                };
                onAddInterceptorClick(enhancedRecord);
              }}
            />
          ),
        }}
        items={[
          {
            label: `请求头`,
            key: '1',
            children: (
              <Wrapper>
                <RequestHeaders record={record} />
              </Wrapper>
            ),
          },
          {
            label: `载荷`,
            key: '2',
            children: (
              <Wrapper>
                <RequestPayload record={record} theme={theme} />
              </Wrapper>
            ),
          },
          {
            label: `响应`,
            key: '3',
            children: (
              <Wrapper>
                <RequestResponse
                  record={record}
                  drawerOpen={drawerOpen}
                  theme={theme}
                />
              </Wrapper>
            ),
          },
          {
            label: `格式化响应`,
            key: '4',
            children: (
              <Wrapper>
                <FormattedResponse
                  apiReply={apiReply}
                  displayData={displayData}
                  theme={theme}
                />
              </Wrapper>
            ),
          },
        ]}
      />
    </Drawer>
  );
};
