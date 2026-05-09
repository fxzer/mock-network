import { message } from 'antd'
import * as React from 'react'

interface FormatApiMsgProps {
  msgType: string
  hidePrefix?: boolean
  fontSize?: string | number
  disableCopy?: boolean
  requestPath?: string
}

const API_MODULE_COLOR_RULES = [
  { prefix: '/account/api', color: '#ef4444' },
  { prefix: '/hybridwan/api', color: '#22c55e' },
  { prefix: '/cmidocking/api', color: '#f59e0b' },
  { prefix: '/tunnel/api', color: '#06b6d4' },
  { prefix: '/monitor-query/api', color: '#3b82f6' },
  { prefix: '/alarm/api', color: '#f97316' },
  { prefix: '/partner/api', color: '#14b8a6' },
  { prefix: '/zstack/api', color: '#8b5cf6' },
]

function normalizeRequestPath(path?: string) {
  if (!path) {
    return ''
  }

  try {
    return new URL(path).pathname
  }
  catch {
    return path
  }
}

function getModuleColor(requestPath?: string) {
  const normalizedPath = normalizeRequestPath(requestPath)
  const matchedRule = API_MODULE_COLOR_RULES.find(rule =>
    normalizedPath.startsWith(rule.prefix),
  )

  return matchedRule?.color || '#ec4899'
}

function fallbackCopyTextToClipboard(text: string) {
  const textArea = document.createElement('textarea')
  textArea.value = text
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
    }
    else {
      message.error('复制失败')
    }
  }
  catch (error) {
    console.error('Fallback: Oops, unable to copy', error)
    message.error('复制失败')
  }

  document.body.removeChild(textArea)
}

function handleCopy(text: string) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      message.success('复制成功')
    }).catch((error) => {
      console.error('Clipboard API failed', error)
      fallbackCopyTextToClipboard(text)
    })
    return
  }

  fallbackCopyTextToClipboard(text)
}

export default function FormatApiMsg({
  msgType,
  hidePrefix,
  fontSize = '12px',
  disableCopy = false,
  requestPath,
}: FormatApiMsgProps) {
  if (!msgType) {
    return null
  }

  const parts = msgType.split('.header.')
  if (parts.length < 2) {
    return (
      <span style={{ fontFamily: 'monospace', fontSize }}>
        {msgType}
      </span>
    )
  }

  const afterHeader = parts[1]
  const segments = afterHeader.split('.')
  const apiMethod = segments[segments.length - 1]
  const modulePath = segments.slice(0, -1).join('.')
  const operationMatch = apiMethod.match(/^API(.+?)(Reply|Msg|Event)?$/)
  const operation = operationMatch ? operationMatch[1] : apiMethod
  const moduleColor = getModuleColor(requestPath)
  const suffix = apiMethod.replace(
    /^API(.+?)(Reply|Msg|Event)?$/,
    (_, __, matchedSuffix) => matchedSuffix || '',
  )

  return (
    <span style={{ color: '#262626', fontFamily: 'monospace', fontSize }}>
      {!hidePrefix && (
        <span style={{ color: '#8c8c8c', marginLeft: '4px' }}>
          {parts[0]}
          .header.
        </span>
      )}
      <span
        style={{
          color: moduleColor,
          fontWeight: 600,
        }}
      >
        {modulePath}
      </span>
      <span style={{ color: '#8c8c8c' }}>.API</span>
      <span
        style={{
          color: '#a855f7',
          cursor: disableCopy ? 'default' : 'pointer',
          fontWeight: 600,
          marginLeft: '2px',
          marginRight: '2px',
        }}
        title={disableCopy ? undefined : `点击复制: ${operation}`}
        onClick={disableCopy
          ? undefined
          : (event) => {
              event.stopPropagation()
              handleCopy(operation)
            }}
      >
        {operation}
      </span>
      <span style={{ color: '#8c8c8c' }}>{suffix}</span>
    </span>
  )
}
