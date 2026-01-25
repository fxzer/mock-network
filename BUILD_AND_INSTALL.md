# MockNetwork 打包和安装指南

## 📦 方式一: 构建并加载开发版本 (推荐用于开发)

### 1. 安装依赖

```bash
cd /Users/fxj/m/ajax-tools/src/ui
pnpm install
```

### 2. 构建项目

```bash
# 构建生产版本
pnpm build
```

构建完成后会在 `src/ui/dist` 目录生成打包文件。

### 3. 加载到 Chrome 浏览器

1. 打开 Chrome 浏览器
2. 在地址栏输入: `chrome://extensions/`
3. 打开右上角的 **"开发者模式"** 开关
4. 点击 **"加载已解压的扩展程序"** 按钮
5. 选择项目根目录: `/Users/fxj/m/ajax-tools`
6. 完成! 扩展已加载

---

## 📦 方式二: 直接使用已打包的 .crx 文件 (最简单)

项目根目录已经有一个打包好的文件: `kphegobalneikdjnboeiheiklpbbhncm.crx`

### 安装步骤:

**方法 A: 拖拽安装 (推荐)**

1. 打开 Chrome 浏览器
2. 在地址栏输入: `chrome://extensions/`
3. 打开右上角的 **"开发者模式"** 开关
4. 直接将 `kphegobalneikdjnboeiheiklpbbhncm.crx` 文件拖拽到浏览器窗口
5. 点击 **"添加扩展程序"** 确认安装

**方法 B: 解压后加载**

1. 将 `.crx` 文件重命名为 `.zip`
2. 解压缩文件
3. 按照方式一的步骤 3 加载解压后的文件夹

---

## 🔧 开发模式 (实时预览)

如果你需要修改代码并实时预览:

```bash
cd /Users/fxj/m/ajax-tools/src/ui

# 启动开发服务器
pnpm dev
```

开发服务器会在 `http://localhost:4001` 启动,但注意:

- 扩展功能需要在 `chrome://extensions/` 中加载
- 修改代码后需要点击扩展卡片上的 **"刷新"** 按钮

---

## ✅ 验证安装

安装成功后,你应该能看到:

1. **扩展图标** - Chrome 工具栏右上角出现 MockNetwork 图标
2. **Badge 状态** - 图标上显示 "ON" 或 "OFF" 徽章
3. **DevTools 面板** - 按 F12 打开开发者工具,可以看到 "M-Network" 标签页

---

## 🎯 使用扩展

### 快速开始:

1. **点击扩展图标** - 打开侧边栏配置界面
2. **添加分组** - 点击 "添加分组" 按钮
3. **添加接口** - 点击 "+" 按钮添加要拦截的接口
4. **配置规则**:
   - 输入要匹配的 URL (支持正则表达式)
   - 选择 HTTP 方法 (GET/POST/等)
   - 编辑响应内容 (JSON 或 JavaScript)
5. **启用拦截** - 确保开关是 "开启" 状态

### 使用 M-Network 面板:

1. 按 **F12** 打开 DevTools
2. 切换到 **"M-Network"** 标签页
3. 点击 **录制按钮** 开始记录网络请求
4. 刷新页面或执行操作触发请求
5. 点击请求行的 **Filter 图标** 快速添加拦截规则

---

## 🐛 常见问题

### Q1: 构建失败怎么办?

```bash
# 清理依赖重新安装
cd /Users/fxj/m/ajax-tools/src/ui
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

### Q2: 扩展加载失败?

检查以下几点:

- 确保 `manifest.json` 文件存在
- 确保 `src/ui/dist` 目录已构建
- 查看 Chrome 扩展页面的错误信息

### Q3: 修改代码后不生效?

1. 在 `chrome://extensions/` 页面点击扩展的 **"刷新"** 按钮
2. 刷新目标网页
3. 如果还不生效,尝试禁用后重新启用扩展

### Q4: .crx 文件无法安装?

Chrome 可能阻止从外部来源安装扩展:

- 使用 **"开发者模式"** 加载解压后的文件夹
- 或者从 Chrome Web Store 安装官方版本

### Q5: 未安装 pnpm?

```bash
# 使用 npm 安装
npm install -g pnpm

# 或使用 corepack 启用 (Node.js 16.13+)
corepack enable
corepack prepare pnpm@latest --activate
```

---

## 📝 项目目录说明

```
ajax-tools/
├── manifest.json              # ✅ 必需 - 扩展配置
├── assets/                    # ✅ 必需 - 静态资源
│   └── icons/                 # 图标资源
└── src/                       # ✅ 源码目录
    ├── background/            # 后台服务脚本
    │   └── index.js
    ├── content/               # 内容脚本
    │   └── index.js
    ├── inject/                # 页面注入脚本
    │   ├── index.js
    │   └── mock.js
    ├── devtools/              # DevTools 扩展入口
    │   ├── index.html
    │   └── index.js
    └── ui/                    # React UI 应用
        ├── dist/              # ⚠️ 需要构建 - 打包后的文件
        ├── pages/
        │   ├── interceptor/   # 拦截器配置面板
        │   ├── network/       # 网络监控面板
        │   └── rules/         # 声明式规则配置
        ├── components/        # 公共组件
        ├── hooks/             # 自定义 hooks
        ├── utils/             # 工具函数
        ├── constants/         # 常量/默认值
        └── package.json       # 依赖配置
```

---

## 🚀 快速命令参考

```bash
# 进入前端项目目录
cd /Users/fxj/m/ajax-tools/src/ui

# 安装依赖
pnpm install

# 开发模式 (http://localhost:4001)
pnpm dev

# 构建生产版本
pnpm build

# 预览构建结果
pnpm preview
```

---
