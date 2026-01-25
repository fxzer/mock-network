# 🔍 DevTools (开发者工具)

> **位置**: `src/devtools`
> **核心文件**: `index.html`, `index.js`
> **角色**: 监察员 / 专用面板

## 这是什么？

当你按 `F12` 打开 Chrome 浏览器的开发者工具时，你会看到 Elements, Console, Network 等面板。
DevTools 这一部分的代码，就是为了在这里面增加一个咱们自己的页签：**M-Network**。

## 它的作用

虽然 Chrome 自带的 Network 面板很强大，但它不能修改响应。
**M-Network** 面板提供了更贴合我们修改需求的功能：

1. **👀 专属视角**: 列出流经我们插件的请求。
2. **⚡️ 快速操作**: 看到一个请求，右键或者点击一下，就能直接基于这个请求创建一个拦截规则（不用自己一个个填 URL 那么多字）。
3. **📄 查看状态**: 明确告诉你哪个请求被拦截了，哪个被修改了。

## 代码简析

- **`index.html`**: 面板的骨架。
- **`index.js`**:
  ```javascript
  // 告诉 Chrome 创建一个叫 "M-Network" 的面板
  // 加载的页面其实是 ../ui/dist/network.html
  chrome.devtools.panels.create(...)
  ```
- 真正的界面内容其实还是在 [ui](../ui/README.md) 里实现的，这里只是个入口。
