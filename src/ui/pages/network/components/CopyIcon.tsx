import * as React from 'react';
import { useEffect, useState } from 'react';
import { CheckCircleFilled, CopyOutlined } from '@ant-design/icons';

export default function CopyIcon({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let timer: any;
    if (copied) {
      timer = setTimeout(() => {
        setCopied(false);
      }, 3000);
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [copied]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!text) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
      });
    } else {
      // Fallback for context where clipboard API might be restricted
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        const successful = document.execCommand('copy');
        if (successful) setCopied(true);
      } catch (e) {
        console.error(e);
      } finally {
        document.body.removeChild(textarea);
      }
    }
  };

  if (copied) {
    return (
      <CheckCircleFilled
        style={{ marginLeft: 8, color: '#52c41a' }}
        title="已复制"
      />
    );
  }

  return (
    <CopyOutlined
      style={{ marginLeft: 8, cursor: 'pointer', color: '#1890ff' }}
      title="复制 API Msg"
      onClick={handleCopy}
    />
  );
}
