const requestBuffer = [];
// 1. 每次打开开发者工具，默认记录状态为 true
let isRecording = true;
let panelWindow = null;

// 监听网络请求
chrome.devtools.network.onRequestFinished.addListener(request => {
  if (isRecording) {
    if (requestBuffer.length > 2000) {
      requestBuffer.shift(); // 防止内存溢出，保留最近2000条
    }
    requestBuffer.push(request);

    // 如果面板已经打开，实时同步数据
    if (panelWindow && panelWindow.syncNetworkData) {
      panelWindow.syncNetworkData([request]); // 增量更新
    }
  }
});

chrome.devtools.panels.create(
  'M-Network',
  'icon.png',
  '../src/ui/dist/network.html',
  function (panel) {
    console.log('M-Network 面板创建成功！');

    panel.onShown.addListener(function (window) {
      panelWindow = window;

      // 注入控制对象到 panel 的 window 对象中
      window.bridge = {
        getBuffer: () => requestBuffer,
        getRecordingState: () => isRecording,
        setRecording: state => {
          isRecording = state;
        },
        clearBuffer: () => {
          requestBuffer.length = 0;
        },
      };

      // 如果UI已经加载完成，手动触发初始化
      if (window.initializeFromBridge) {
        window.initializeFromBridge();
      }
    });

    panel.onHidden.addListener(function () {
      panelWindow = null;
    });
  },
);
