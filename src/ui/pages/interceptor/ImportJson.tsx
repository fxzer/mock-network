import type { UploadFile, UploadProps } from 'antd'
import type { AjaxDataListObject } from '../../constants'
import { FileOutlined, InboxOutlined } from '@ant-design/icons'
import { Modal, notification, Upload } from 'antd'
import * as React from 'react'
import { useState } from 'react'
import { defaultAjaxDataList } from '../../constants'
import { exportJSON } from './ExportJson'

export function openImportJsonModal() {
  return new Promise((resolve: (val: AjaxDataListObject[] | unknown) => void) => {
    const Content = (props: {
      onFileChange: (f: UploadFile | null) => void
    }) => {
      const [fileList, setFileList] = useState<UploadFile[]>([])
      const [warnMsg, setWarnMsg] = useState('')
      const uploadProps: UploadProps = {
        showUploadList: false,
        beforeUpload: (file) => {
          if (file.type !== 'application/json') {
            setWarnMsg('仅支持上传 JSON 文件')
            setFileList([])
            props.onFileChange(null)
            return false
          }
          else {
            setWarnMsg('')
            setFileList([file])
            props.onFileChange(file)
          }
          setFileList([file])
          props.onFileChange(file)
          return false
        },
        fileList,
      }
      return (
        <>
          {typeof FileReader === 'undefined'
            ? (
                '当前浏览器不支持 FileReader'
              )
            : (
                <div style={{ minHeight: 210, marginTop: 12 }}>
                  <Upload.Dragger {...uploadProps}>
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">
                      点击或拖拽文件到此区域上传
                    </p>
                    <p className="ant-upload-hint">
                      <div>
                        可导入包含
                        <a
                          onClick={(e) => {
                            e.stopPropagation()
                            exportJSON(
                              'MockNetworkTemplate',
                              defaultAjaxDataList,
                            )
                          }}
                        >
                      &nbsp;MockNetwork&nbsp;
                        </a>
                        规则的
                        {' '}
                        <strong>.json</strong>
                        {' '}
                        文件
                      </div>
                      <div>
                        上传成功后将显示在插件中
                      </div>
                    </p>
                  </Upload.Dragger>
                  <div
                    style={{
                      background: '#f5f5f5',
                      lineHeight: '22px',
                      padding: '0 12px',
                      marginTop: 8,
                    }}
                  >
                    {fileList[0] && <FileOutlined style={{ marginRight: 8 }} />}
                    {fileList[0]?.name}
                  </div>
                  <div style={{ color: '#ff4d4f' }}>{warnMsg}</div>
                </div>
              )}
        </>
      )
    }
    let _file: Blob | UploadFile<any> | null = null
    Modal.confirm({
      icon: null,
      width: 520,
      title: '导入 .json 文件',
      content: (
        <Content onFileChange={(file: UploadFile | null) => (_file = file)} />
      ),
      onOk: () => {
        if (_file) {
          importJSON(_file)
            .then((result) => {
              resolve(result)
            })
            .catch((error) => {
              notification.error({
                message: error.message,
              })
            })
        }
      },
    })
  })
}

function importJSON(file: Blob | UploadFile<any>) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsText(file as Blob)

    reader.onerror = (error) => {
      reject({
        message: '解析 JSON 文件失败',
        description: error,
      })
    }

    reader.onload = () => {
      const resultData = reader.result
      if (resultData) {
        try {
          if (typeof resultData === 'string') {
            const importData = JSON.parse(resultData)
            resolve(importData)
          }
        }
        catch (error) {
          reject({
            message: '解析 JSON 失败',
            description: error,
          })
        }
      }
      else {
        reject({
          message: '读取数据失败',
          description: '读取数据失败',
        })
      }
    }
  })
}
