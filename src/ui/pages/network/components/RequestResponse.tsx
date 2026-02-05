import * as React from 'react'
import { useEffect, useState } from 'react'
import MonacoEditor from '../../../components/MonacoEditor'

function formatText(value: string) {
  let text = ''
  try {
    text = JSON.stringify(JSON.parse(value), null, 4)
  }
  catch (e) {
    text = value
  }
  return text
}

export default function RequestResponse({
  record,
  drawerOpen,
  theme,
}: {
  record: any
  drawerOpen: boolean
  theme?: 'light' | 'dark'
}) {
  const [response, setResponse] = useState('')
  useEffect(() => {
    if (drawerOpen && record.getContent) {
      record.getContent((content: string) => {
        setResponse(content)
      })
    }
  }, [drawerOpen, record])

  let jsonContent = null
  try {
    jsonContent = JSON.parse(response)
  }
  catch (e) {
    // ignore
  }

  if (jsonContent && typeof jsonContent === 'object') {
    return (
      <MonacoEditor
        language="json"
        text={JSON.stringify(jsonContent, null, 2)}
        theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
        readOnly={true}
        editorHeight="calc(100vh - 180px)"
        languageSelectOptions={[]}
      />
    )
  }

  return (
    <>
      <pre>{formatText(response)}</pre>
    </>
  )
}
