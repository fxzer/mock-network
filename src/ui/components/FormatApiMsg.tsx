import { message } from 'antd'
import * as React from 'react'


interface FormatApiMsgProps {
  msgType: string
  hidePrefix?: boolean
}

export default function FormatApiMsg({
  msgType,
  hidePrefix,
}: FormatApiMsgProps) {
  if (!msgType)
    return null

  // 按 '.header.' 分割
  const parts = msgType.split('.header.')
  if (parts.length < 2) {
    return (
      <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
        {msgType}
      </span>
    )
  }

  const afterHeader = parts[1] // 例如: hybridwan.message.contact.APICreateAccountContactReply
  const segments = afterHeader.split('.')

  // 最后一段是 API 方法名，前面的是模块路径
  const apiMethod = segments[segments.length - 1] // APICreateAccountContactReply
  const modulePath = segments.slice(0, -1).join('.') // hybridwan.message.contact

  // 提取 API 方法中的操作名 (去掉 API 前缀和 Reply/Msg 后缀)
  const operationMatch = apiMethod.match(/^API(.+?)(Reply|Msg|Event)?$/)
  const operation = operationMatch ? operationMatch[1] : apiMethod

  const handleCopy = (text: string) => {
    // 尝试使用 navigator.clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        message.success('复制成功')
      }).catch((err) => {
        console.error('Clipboard API failed', err)
        fallbackCopyTextToClipboard(text)
      })
    }
    else {
      fallbackCopyTextToClipboard(text)
    }
  }

  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement('textarea')
    textArea.value = text
    
    // Avoid scrolling to bottom
    textArea.style.top = '0'
    textArea.style.left = '0'
    textArea.style.position = 'fixed'

    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    try {
      const successful = document.execCommand('copy')
      if (successful) {
        message.success('复制成功')
      } else {
        message.error('复制失败')
      }
    }
    catch (err) {
      console.error('Fallback: Oops, unable to copy', err)
      message.error('复制失败')
    }

    document.body.removeChild(textArea)
  }

  return (
    <span
      style={{ fontFamily: 'monospace', fontSize: '12px', color: '#262626' }}
    >
      {!hidePrefix && (
        <span style={{ color: '#8c8c8c', marginLeft: '4px' }}>
          {parts[0]}
          .header.
        </span>
      )}
      <span
        style={{
          color: '#ec4899',
          fontWeight: 600,
        }}
      >
        {modulePath}
      </span>
      <span style={{ color: '#8c8c8c' }}>.API</span>
      <span
        style={{
          color: '#a855f7',
          fontWeight: 600,
          marginLeft: '2px',
          marginRight: '2px',
          cursor: 'pointer',
        }}
        title={`点击复制: ${operation}`}
        onClick={(e) => {
          e.stopPropagation()
          handleCopy(operation)
        }}
      >
        {operation}
      </span>
      <span style={{ color: '#8c8c8c' }}>
        {apiMethod.replace(
          /^API(.+?)(Reply|Msg|Event)?$/,
          (_, __, suffix) => suffix || '',
        )}
      </span>
    </span>
  )
}
