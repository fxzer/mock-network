# 👷 Content (内容脚本)

> **位置**: `src/content`
> **核心文件**: `index.js`
> **角色**: 驻场代表 / 桥梁

## 这是什么？

**Content Script** 是 Chrome 扩展中唯一可以直接访问网页 DOM（页面元素）的部分。但它有点"局限"，它虽然住在网页里，但它和网页原有的 JavaScript 是隔离的（就像住在同一栋楼的邻居，能看见对方但不能直接用对方家里的东西）。

## 它的工作职责

它是连接 **网页(Page)**、**注入脚本(Inject)** 和 **后台(Background)** 的核心枢纽。

### 1. 🏗️ 搭建舞台 (UI 容器)

当你看到那个配置拦截规则的侧边栏时，就是 Content Script 创建的。
它会在网页里创建一个 `iframe`，把我们的 [UI](../ui/README.md) 界面装进去。这样我们的配置界面就不会受到网页本身样式的影响。

### 2. 🕵️ 投放特工 (注入脚本)

因为 Content Script 和网页 JS 是隔离的，它没法直接拦截请求。
所以它进场的第一件事，就是把 [src/inject](../inject/README.md) 里的代码（特工），通过 `<script>` 标签强行插入到网页头部。
一旦插入，"特工"就进入了网页的"真身"环境，就能拦截请求了。

### 3. 📞 传声筒 (消息通信)

- **Background 说**: "用户点图标了，显示侧边栏！" -> Content 收到 -> 控制 iframe 显示。
- **UI 说**: "用户加了个新规则！" -> Content 收到 -> 转发给 Inject (特工)。
- **Inject 说**: "我拦截到一个请求！" -> Content 收到 -> 转发给 UI 显示在日志里。

## 代码简析

打开 `index.js`，你会看到：

- `injectedScript(...)`: 把 `../inject/index.js` 插入页面。
- `window.addEventListener("message", ...)`: 监听来自 UI iframe 或 Inject 的消息。
- `chrome.runtime.onMessage.addListener(...)`: 监听来自 Background 的消息。
