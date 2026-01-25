# 🎨 UI (用户界面)

> **位置**: `src/ui`
> **核心框架**: React + Ant Design
> **角色**: 前台接待 / 装修队

## 这是什么？

这里是整个项目里**代码量最大**、**颜值最高**的地方。
所有你平时能点、能看、能拖拽的界面，都是在这里做出来的。这是一个标准的 React 前端项目。

## 目录结构

这里比外面几个部门要复杂一点，因为它有很多个"分会场"：

### 1. 📄 pages (页面)

每个页面都是一个独立的 React 应用：

- **[interceptor/](./pages/interceptor/App.tsx)**: **拦截配置主界面**
  - 这就是那个侧边栏！
  - 你在这里添加规则、编辑 JSON、开启/关闭拦截。
- **[network/](./pages/network/App.tsx)**: **网络监控面板**
  - 这就是你在 F12 -> M-Network 里看到的界面。
  - 用来展示抓包日志和详细信息。

- **[rules/](./pages/rules/index.tsx)**: **规则管理页**
  - 处理一些更底层的静态规则配置。

### 2. 🧩 components (组件)

这里放着大家共用的"积木块"：

- **MonacoEditor**: 那个像 VS Code 一样的代码编辑器，就是这个组件封装的。

### 3. 🛠️ utils (工具箱)

- 各种辅助函数，比如格式化时间、解析 JSON 等。

## 它是怎么构建的？

因为浏览器读不懂 `.tsx` 和 React 代码，所以我们需要用 **Vite** 把这里的代码打包（编译）成浏览器能看懂的 HTML, CSS 和 JavaScript。
打包后的文件会生成在 `dist` 目录里，然后被 [Content Script](../content/README.md) 或者 [DevTools](../devtools/README.md) 引用。
