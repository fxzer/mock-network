// 设置iframeVisible默认值，刷新后重置storage
chrome.storage.local.set({ iframeVisible: true });

async function injectedScript(path, root = document?.documentElement) {
  if (!chrome.runtime?.id || !root) return;
  // 获取顶层插入开关设置
  const result = await chrome.storage.local.get(['ajaxToolsTopLevelOnly']);
  const { ajaxToolsTopLevelOnly = true } = result;
  if (window.self === window.top || !ajaxToolsTopLevelOnly) {
    const scriptNode = document.createElement('script');
    scriptNode.src = chrome.runtime.getURL(path);
    root.appendChild(scriptNode);
    return scriptNode;
  }
}
async function injectedCss(path, root = document?.documentElement) {
  if (!chrome.runtime?.id || !root) return;
  // 获取顶层插入开关设置
  const result = await chrome.storage.local.get(['ajaxToolsTopLevelOnly']);
  const { ajaxToolsTopLevelOnly = true } = result;
  if (window.self === window.top || !ajaxToolsTopLevelOnly) {
    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.href = chrome.runtime.getURL(path);
    root.appendChild(linkElement);
    return linkElement;
  }
}
async function injectedStyle(styleContent, root = document?.documentElement) {
  if (!chrome.runtime?.id || !root) return;
  // 获取顶层插入开关设置
  const result = await chrome.storage.local.get(['ajaxToolsTopLevelOnly']);
  const { ajaxToolsTopLevelOnly = true } = result;
  if (window.self === window.top || !ajaxToolsTopLevelOnly) {
    const styleElement = document.createElement('style');
    styleElement.textContent = styleContent;
    root.appendChild(styleElement);
    return styleElement;
  }
}

async function injectContent() {
  injectedStyle(`
    .ajax-interceptor-container {
      display: flex;
      flex-direction: column;
      height: 100% !important;
      width: 580px !important;
      min-width: 1px !important;
      position: fixed !important;
      inset: 0px 0px auto auto !important;
      z-index: 2147483647 !important;
      transform: translateX(0px) !important;
      transition: all 0.4s ease 0s !important;
      box-shadow: rgba(0, 0, 0, 0.12) 0px 0px 15px 2px !important;
      background: #fff;
      overflow: hidden;
    }
    .ajax-interceptor-action-bar {
      height: 40px;
      min-height: 40px;
      padding: 0 12px 0 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
      
    .ajax-interceptor-iframe {
      border: none;
      height: calc(100% - 40px);
      width: 100%;
      border-top: 1px solid #d1d3d8;
    }
    .ajax-interceptor-icon {
      cursor: pointer;
      position: relative;
    }
    .ajax-interceptor-new::after {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #ff0000;
      position: absolute;
      right: -2px;
      top: -2px;
    }
    .ajax-interceptor-mr-8 {
      margin-right: 8px;
    }
    /* 暗黑主题样式 */
    .dark-theme.ajax-interceptor-container {
      background: #1f1f1f;
      box-shadow: rgba(0, 0, 0, 0.5) 0px 0px 15px 2px !important;
    }
    .dark-theme .ajax-interceptor-action-bar {
      background: #1f1f1f;
    }
    .dark-theme .ajax-interceptor-iframe {
      border-top-color: #424242;
    }
    .dark-theme .ajax-interceptor-icon {
      color: rgba(255, 255, 255, 0.85);
    }
  `);
  injectedScript('src/inject/mock.js');
  const pageScripts = await injectedScript('src/inject/index.js');
  if (pageScripts) {
    pageScripts.addEventListener('load', () => {
      if (!chrome.runtime?.id) return;
      chrome.storage.local.get(
        [
          'iframeVisible',
          'ajaxToolsSwitchOn',
          'ajaxToolsSwitchOnNot200',
          'ajaxDataList',
          'ajaxToolsSkin',
        ],
        result => {
          // console.log('【ajaxTools content.js】【storage】', result);
          const {
            ajaxToolsSwitchOn = true,
            ajaxToolsSwitchOnNot200 = true,
            ajaxDataList = [],
          } = result;
          postMessage({
            type: 'ajaxTools',
            to: 'pageScript',
            key: 'ajaxDataList',
            value: ajaxDataList,
          });
          postMessage({
            type: 'ajaxTools',
            to: 'pageScript',
            key: 'ajaxToolsSwitchOn',
            value: ajaxToolsSwitchOn,
          });
          postMessage({
            type: 'ajaxTools',
            to: 'pageScript',
            key: 'ajaxToolsSwitchOnNot200',
            value: ajaxToolsSwitchOnNot200,
          });
        },
      );
    });
  }
}
injectContent();

async function callbackIframeLoad(iframe) {
  if (!chrome.runtime?.id) return;
  try {
    // 检查 iframe 和 contentDocument 是否存在
    const doc = iframe?.contentDocument;
    if (!iframe || !doc || !doc.documentElement) {
      // console.warn('iframe contentDocument not available');
      return;
    }

    await injectedScript('src/inject/mock.js', doc.documentElement);
    const pageScripts = await injectedScript(
      'src/inject/index.js',
      doc.documentElement,
    );
    if (pageScripts) {
      pageScripts.addEventListener('load', () => {
        chrome.storage.local.get(
          ['ajaxToolsSwitchOn', 'ajaxToolsSwitchOnNot200', 'ajaxDataList'],
          result => {
            const {
              ajaxToolsSwitchOn = true,
              ajaxToolsSwitchOnNot200 = true,
              ajaxDataList = [],
            } = result;
            iframe.contentWindow.postMessage(
              {
                type: 'ajaxTools',
                to: 'pageScript',
                key: 'ajaxDataList',
                value: ajaxDataList,
              },
              '*',
            );
            iframe.contentWindow.postMessage(
              {
                type: 'ajaxTools',
                to: 'pageScript',
                key: 'ajaxToolsSwitchOn',
                value: ajaxToolsSwitchOn,
              },
              '*',
            );
            iframe.contentWindow.postMessage(
              {
                type: 'ajaxTools',
                to: 'pageScript',
                key: 'ajaxToolsSwitchOnNot200',
                value: ajaxToolsSwitchOnNot200,
              },
              '*',
            );
          },
        );
      });
    }
  } catch (err) {
    console.error('Failed to inject scripts into iframe:', err);
  }
}

const observer = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (node.nodeName === 'IFRAME') {
        const iframe = node;
        if (
          iframe.complete ||
          (iframe.contentDocument &&
            iframe.contentDocument.readyState === 'complete')
        ) {
          callbackIframeLoad(iframe);
        } else {
          iframe.addEventListener('load', () => {
            callbackIframeLoad(iframe);
          });
        }
      }
    });
  });
});

// 监听系统主题变化
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
function handleThemeChange(e) {
  const container = document.querySelector('.ajax-interceptor-container');
  if (container) {
    if (e.matches) {
      container.classList.add('dark-theme');
    } else {
      container.classList.remove('dark-theme');
    }
  }
}
mediaQuery.addListener(handleThemeChange);

observer.observe(document, { childList: true, subtree: true });

function closeButton(container) {
  const closeIcon = document.createElement('span');
  closeIcon.title = '关闭';
  closeIcon.className = 'ajax-interceptor-icon ajax-interceptor-mr-8';
  closeIcon.style.display = 'inline-flex';
  closeIcon.style.alignItems = 'center';
  closeIcon.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="m12 13.4l-4.9 4.9q-.275.275-.7.275t-.7-.275t-.275-.7t.275-.7l4.9-4.9l-4.9-4.9q-.275-.275-.275-.7t.275-.7t.7-.275t.7.275l4.9 4.9l4.9-4.9q.275-.275.7-.275t.7.275t.275.7t-.275.7L13.4 12l4.9 4.9q.275.275.275.7t-.275.7t-.7.275t-.7-.275z"/></svg>';
  closeIcon.addEventListener('click', function () {
    if (!chrome.runtime?.id) return;
    container.style.setProperty(
      'transform',
      'translateX(calc(100% + 20px))',
      'important',
    );
    chrome.storage.local.set({ iframeVisible: true });
  });
  return closeIcon;
}
function zoomButton(container) {
  let zoomOut = true;
  const zoomIcon = document.createElement('span');
  zoomIcon.className = 'ajax-interceptor-icon ajax-interceptor-mr-8';
  zoomIcon.style.display = 'inline-flex';
  zoomIcon.style.alignItems = 'center';
  const reduceSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M7 13q-.425 0-.712-.288T6 12t.288-.712T7 11h10q.425 0 .713.288T18 12t-.288.713T17 13z"/></svg>';
  const fullscreenSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M3 21v-5h2v3h3v2zm13 0v-2h3v-3h2v5zM3 8V3h5v2H5v3zm16 0V5h-3V3h5v5z"/></svg>';

  // Initial icon
  zoomIcon.innerHTML = reduceSvg;

  zoomIcon.addEventListener('click', function () {
    if (zoomOut) {
      // 缩小
      container.style.setProperty('height', '40px', 'important');
      let timer = setTimeout(() => {
        container.style.setProperty('width', '180px', 'important');
        clearTimeout(timer);
      }, 400);
      zoomOut = false;
      zoomIcon.title = '最大化';
      zoomIcon.innerHTML = fullscreenSvg;
    } else {
      // 放大
      container.style.setProperty('width', '580px', 'important');
      let timer = setTimeout(() => {
        container.style.setProperty('height', '100%', 'important');
        clearTimeout(timer);
      }, 400);
      zoomOut = true;
      zoomIcon.title = '最小化';
      zoomIcon.innerHTML = reduceSvg;
    }
  });
  return zoomIcon;
}
function pipButton(container) {
  const pipIcon = document.createElement('span');
  pipIcon.title = '画中画';
  const className = 'ajax-interceptor-icon';
  pipIcon.className = className;
  pipIcon.style.display = 'inline-flex';
  pipIcon.style.alignItems = 'center';
  pipIcon.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M8 22q-.825 0-1.412-.587T6 20v-2H4q-.825 0-1.412-.587T2 16v-1q0-.425.288-.712T3 14t.713.288T4 15v1h2V8q0-.825.588-1.412T8 6h8V4h-1q-.425 0-.712-.288T14 3t.288-.712T15 2h1q.825 0 1.413.588T18 4v2h2q.825 0 1.413.588T22 8v12q0 .825-.587 1.413T20 22zm0-2h12V8H8zm-5-8q-.425 0-.712-.288T2 11V9q0-.425.288-.712T3 8t.713.288T4 9v2q0 .425-.288.713T3 12m0-6q-.425 0-.712-.288T2 5V4q0-.825.588-1.412T4 2h1q.425 0 .713.288T6 3t-.288.713T5 4H4v1q0 .425-.288.713T3 6m6-2q-.425 0-.712-.288T8 3t.288-.712T9 2h2q.425 0 .713.288T12 3t-.288.713T11 4zM8 20V8z"/></svg>';

  if (chrome.runtime?.id) {
    chrome.storage.local.get(
      ['ajaxToolsPipBtnNewHideFlag'],
      ({ ajaxToolsPipBtnNewHideFlag }) => {
        pipIcon.className = ajaxToolsPipBtnNewHideFlag
          ? className
          : `${className} ajax-interceptor-new`;
      },
    );
  }

  pipIcon.addEventListener('click', async function () {
    if (!chrome.runtime?.id) return;
    if (!('documentPictureInPicture' in window)) {
      alert(
        '当前浏览器不支持 documentPictureInPicture，可前往 chrome://flags/#document-picture-in-picture-api 开启。\n' +
          '如已开启，请使用 HTTPS 协议，或 localhost/127.0.0.1，或在新标签页打开配置页面后使用画中画功能。',
      );
      return;
    }
    pipIcon.className = className;
    chrome.storage.local.set({ ajaxToolsPipBtnNewHideFlag: true });
    const iframe = document.querySelector('.ajax-interceptor-iframe');
    const pipWindow = await documentPictureInPicture.requestWindow({
      width: 580,
      height: 680,
    });
    // css
    const allCSS = [...document.styleSheets]
      .map(styleSheet => {
        try {
          return [...styleSheet.cssRules].map(r => r.cssText).join('');
        } catch (e) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.type = styleSheet.type;
          link.media = styleSheet.media;
          link.href = styleSheet.href;
          pipWindow.document.head.appendChild(link);
        }
      })
      .filter(Boolean)
      .join('\n');
    const style = document.createElement('style');
    style.textContent = allCSS;
    pipWindow.document.head.appendChild(style);
    // js
    [...document.scripts].map(v => {
      const script = document.createElement('script');
      script.src = v.src;
      script.type = v.type;
      pipWindow.document.head.appendChild(script);
    });
    pipWindow.document.body.append(iframe);
    // 收起侧边
    container.style.setProperty(
      'transform',
      'translateX(calc(100% + 20px))',
      'important',
    );
    iframe.style.setProperty('height', '100%');
    pipWindow.addEventListener('pagehide', event => {
      // 展示侧边
      container.style.setProperty('transform', 'translateX(0)', 'important');
      iframe.style.setProperty('height', 'calc(100% - 40px)');
      container?.append(iframe);
    });
  });
  return pipIcon;
}

function newTabButton() {
  const newTabIcon = document.createElement('span');
  newTabIcon.title = '在新标签页打开';
  newTabIcon.className = 'ajax-interceptor-icon';
  newTabIcon.style.display = 'inline-flex';
  newTabIcon.style.alignItems = 'center';
  newTabIcon.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M18 20v-3h-3v-2h3v-3h2v3h3v2h-3v3zM1 21V3h18v7h-2V8H3v11h13v2zM3 6h14V5H3zm0 0V5z"/></svg>';
  newTabIcon.addEventListener('click', function () {
    window.open(chrome.runtime.getURL('src/ui/dist/index.html'));
  });
  return newTabIcon;
}
function actionBar(container) {
  const header = document.createElement('header');
  header.className = 'ajax-interceptor-action-bar';
  // left
  const left = document.createElement('div');
  const closeBtn = closeButton(container);
  left.appendChild(closeBtn);
  const zoomBtn = zoomButton(container);
  left.appendChild(zoomBtn);
  const pipBtn = pipButton(container);
  left.appendChild(pipBtn);
  header.appendChild(left);
  // right
  const right = document.createElement('div');
  const newTabBtn = newTabButton();
  right.appendChild(newTabBtn);
  header.appendChild(right);
  return header;
}
// 只在最顶层页面嵌入iframe
if (window.self === window.top) {
  let container = null;
  const init = () => {
    if (container || !document.body) return;
    container = document.createElement('div');
    container.className = 'ajax-interceptor-container';
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) {
      container.classList.add('dark-theme');
    }
    container.style.setProperty(
      'transform',
      'translateX(calc(100% + 20px))',
      'important',
    ); // 470px
    const _actionBar = actionBar(container);
    container.appendChild(_actionBar);
    const iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL(
      `src/ui/dist/index.html?theme=${isDark ? 'dark' : 'light'}`,
    );
    iframe.className = 'ajax-interceptor-iframe';
    container.appendChild(iframe);
    if (document.body) document.body.appendChild(container);
  };

  // 监听系统主题变化
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleThemeChange = e => {
    if (container) {
      const isDark = e.matches;
      if (isDark) {
        container.classList.add('dark-theme');
      } else {
        container.classList.remove('dark-theme');
      }
      const iframe = container.querySelector('iframe');
      if (iframe) {
        iframe.contentWindow.postMessage(
          { type: 'themeChange', theme: isDark ? 'dark' : 'light' },
          '*',
        );
      }
    }
  };
  // 兼容旧版浏览器
  try {
    mediaQuery.addEventListener('change', handleThemeChange);
  } catch (e) {
    mediaQuery.addListener(handleThemeChange);
  }

  if (
    document.readyState === 'complete' ||
    document.readyState === 'interactive'
  ) {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
    window.addEventListener('load', init);
  }

  if (chrome.runtime?.id) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      // console.log('【content】【ajax-tools-iframe-show】receive message', request);
      const { type, iframeVisible } = request;
      if (type === 'iframeToggle') {
        if (!container) init();
        if (container) {
          container.style.setProperty(
            'transform',
            iframeVisible ? 'translateX(0)' : 'translateX(calc(100% + 20px))',
            'important',
          );
          sendResponse({ nextIframeVisible: !iframeVisible }); // 返回信息到popup.js / App.jsx
        } else {
          sendResponse({ nextIframeVisible: iframeVisible });
        }
      }
      return true;
    });
  }
}

chrome.storage.onChanged.addListener(function (changes, namespace) {
  for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
    if (
      key === 'ajaxDataList' ||
      key === 'ajaxToolsSwitchOn' ||
      key === 'ajaxToolsSwitchOnNot200'
    ) {
      // 发送到pageScript/index
      postMessage({
        type: 'ajaxTools',
        to: 'pageScript',
        key,
        value: newValue,
      });
    }
  }
});
