export interface AjaxDataListObject {
  summaryText: string
  collapseActiveKeys: string []
  headerClass: string
  interfaceList: DefaultInterfaceObject[]
}
export interface DefaultInterfaceObject {
  key: string
  open: boolean
  matchType: string // normal regex
  matchMethod: string // GET、POST、PUT、DELETE、HEAD、OPTIONS、CONNECT、TRACE、PATCH
  request: string // matched url
  requestDes: string
  // modify ⬇️
  replacementMethod: string
  replacementUrl: string
  replacementStatusCode: string
  headers: string
  requestPayloadText: string
  responseText: string
  language: string // json javascript
  [key: string]: any
}

export const defaultInterface: DefaultInterfaceObject = {
  key: '1',
  open: true,
  matchType: 'normal',
  matchMethod: '',
  request: '',
  requestDes: '',
  // modify ⬇️
  replacementMethod: '',
  replacementUrl: '',
  replacementStatusCode: '200',
  headers: '',
  requestPayloadText: '',
  responseText: '',
  language: 'json',
}

export const defaultAjaxDataList: AjaxDataListObject[] = [
  {
    summaryText: '分组名称（可编辑）',
    collapseActiveKeys: ['1'],
    headerClass: 'ajax-tools-color-volcano',
    interfaceList: [
      { ...defaultInterface },
    ],
  },
]

export const HTTP_METHOD_MAP = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'HEAD',
  'OPTIONS',
  'CONNECT',
  'TRACE',
  'PATCH',
]

export const HEADERS_EXAMPLES = [
  {
    egType: 'json',
    egTitle: '示例：JSON',
    egText: `{
  "Content-Type": "application/json"
}
`,
  },
  {
    egType: 'javascript',
    egTitle: '示例：JavaScript',
    egText: `return {
  "Content-Type": "application/json"
}
`,
  },
]
export const REQUEST_PAYLOAD_EXAMPLES = [
  {
    egTitle: '示例：GET',
    egText: `const { requestUrl, queryStringParameters } = arguments[0];

let newRequestUrl = requestUrl.split('?')[0] + '?';
const queryParams = Object.assign(queryStringParameters, {
  // Add or replace the input parameters
  test: 'test123'
})
Object.keys(queryParams).forEach((key, index) => {
  if (index !== 0) newRequestUrl += '&';
  newRequestUrl += key+'='+queryParams[key];
});

return newRequestUrl;
`,
  },
  {
    egTitle: '示例：POST JSON',
    egText: `// if args is Json
const args = arguments[0];

const params = JSON.parse(args);
params.test = 'test123';

return JSON.stringify(params);
`,
  },
  {
    egTitle: '示例：POST FormData',
    egText: `// if args is FormData Object
const args = arguments[0];

args.append('test', 'test123');

return args;
`,
  },
]

export const RESPONSE_EXAMPLES = [
  {
    egType: 'json',
    egTitle: '示例：JSON 基础',
    egText: `{
  "status": 200,
  "response": "OK"
}
`,
  },
  {
    egType: 'javascript',
    egTitle: '示例：JavaScript 基础',
    egText: `const data = [];
for (let i = 0; i < 10; i++) {
  data.push({ id: i });
}

return {
  "status": 200,
  "response": data
}
`,
  },
  {
    egType: 'javascript',
    egTitle: '示例：Mock.js',
    egText: `const data = Mock.mock({
  'list|1-10': [{
    'id|+1': 1
  }]
});

return {
  "status": 200,
  "response": data
}

// Mock.js: https://github.com/nuysoft/Mock/wiki/Getting-Started
`,
  },
  {
    egType: 'javascript',
    egTitle: '示例：场景构建',
    egText: `const { method, payload, originalResponse } = arguments[0];
if (method === 'get') { // Method
  // do something 
}
if (payload) { // parameters { queryStringParameters，requestPayload }
  // do something
}

return {
  "status": 200,
  "response": originalResponse
}
`,
  },
]

export const DECLARATIVE_NET_REQUEST_EXAMPLES = [
  {
    egTitle: '示例：重定向 URL',
    egText: `[
  {
    "id": 1,
    "priority": 1,
    "action": {
      "type": "redirect",
      "redirect": {
        "transform": {
          "host": "new.react.docschina.org",
          "scheme": "https"
        }
      }
    },
    "condition": {
      "urlFilter": "main",
      "domains" : ["react.docschina.org"],
      "resourceTypes": ["script"]
    }
  }
]
`,
  },
  {
    egTitle: '示例：阻止 URL',
    egText: `[
  {
    "id" : 1,
    "priority": 1,
    "action" : { "type" : "block" },
    "condition" : {
      "urlFilter" : "main",
      "domains" : ["react.docschina.org"],
      "resourceTypes" : ["script"]
    }
  }
]
`,
  },
]
