# MockNetwork 打包和安装指南

## 📦 方式一: 构建并加载开发版本 (推荐用于开发)

### 1. 安装依赖

在仓库根目录下进入前端子项目并安装依赖：

```bash
cd src/ui
pnpm install
```

### 2. 构建项目

```bash
# 主 UI（Vite 8 / Rolldown，多页入口见 src/ui/vite.config.js）
pnpm build
```

构建完成后会在 `src/ui/dist` 目录生成打包文件。

#### 2.1 inject 与整包发布（打包流水线说明）

`src/inject/index.js` 与 `mock.js` **不参与**主应用的 HTML 多页入口，因此使用单独的 **`src/ui/vite.inject.config.mjs`**：在**仓库根目录**下调用 Vite，以 Rolldown 将每个文件打成 **IIFE**，并用 **Oxc** 做生产压缩。与主 UI 共用同一套 `vite` 版本，**不再**在 `package.json` 里单独声明 `esbuild` 作为 inject 的压缩工具。

| 项目 | 配置文件 | 产物位置（本地） | 说明 |
|------|----------|------------------|------|
| 主 UI | `src/ui/vite.config.js` | `src/ui/dist/` | 侧边栏、M-Network、规则页等 |
| inject | `src/ui/vite.inject.config.mjs` | 先写入 `.cache/inject-dist/`，再由 `scripts/pack.js` 覆盖到打包目录内的 `src/inject/` | 两次构建：`INJECT_FILE=index` 与 `INJECT_FILE=mock`（第二次设 `INJECT_EMPTY_OUT_DIR=0` 以保留同一输出目录）；避免多入口 IIFE 与 `codeSplitting` 冲突 |

**本地只预构建 inject**（在 `src/ui` 下，与 `package.json` 中 `build:inject` 一致）：

```bash
cd src/ui
pnpm run build:inject
```

**一键打可分发目录与 zip**：在仓库根目录执行（加 `-b` 会先尝试在 `src/ui` 内执行 `pnpm build`）：

```bash
node scripts/pack.js -b
```

成功后会得到 **`mock-network-extension/`**（可直接在 Chrome 中「加载已解压的扩展程序」）以及 **`mock-network-extension.zip`**。若 `src/ui/node_modules` 不存在或没有 `vite` 可执行文件，inject 会保持从源码拷贝的未压缩版本，并在日志中提示。

**实现细节（便于排错）**：IIFE 的 `output.name` 设为 `__MN_INJECT_INDEX__` / `__MN_INJECT_MOCK__`，用于消除 Rolldown 对无名 IIFE 的告警；`mock.js` 中占位符参数解析使用 **间接** `(0, eval)(...)`，避免对直接 `eval` 的构建告警，语义上仍在全局作用域执行字符串（参见 [Rolldown：Avoiding Direct eval](https://rolldown.rs/guide/troubleshooting#avoiding-direct-eval)）。

### 3. 加载到 Chrome 浏览器

1. 打开 Chrome 浏览器
2. 在地址栏输入: `chrome://extensions/`
3. 打开右上角的 **"开发者模式"** 开关
4. 点击 **"加载已解压的扩展程序"** 按钮
5. 选择本仓库根目录下已构建好的扩展目录（开发时选含 `manifest.json` 的仓库根；若使用 `node scripts/pack.js` 产出，则选 **`mock-network-extension`** 目录）
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
cd src/ui

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
cd src/ui
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

### Q2: 扩展加载失败?

检查以下几点:

- 确保 `manifest.json` 文件存在
- 开发加载：确保已执行 `pnpm build`，存在 `src/ui/dist`
- 使用 `node scripts/pack.js` 后：加载 **`mock-network-extension`** 目录（内含已改写的 `src/ui` 路径）
- 查看 Chrome 扩展页面的错误信息

### Q6: inject 打包告警或体积异常?

- 先执行 `cd src/ui && pnpm install`，确保存在 `node_modules/.bin/vite`
- 单独验证：`pnpm run build:inject`，检查仓库根 `.cache/inject-dist/` 下 `index.js`、`mock.js`

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
<仓库根>/
├── manifest.json              # ✅ 必需 - 扩展配置
├── scripts/
│   └── pack.js                # 整包复制、inject 二次构建、写 zip
├── assets/                    # ✅ 必需 - 静态资源
│   └── icons/                 # 图标资源
├── .cache/                    # 构建缓存（gitignore），含 inject-dist
└── src/                       # ✅ 源码目录
    ├── background/            # 后台服务脚本
    │   └── index.js
    ├── content/               # 内容脚本
    │   └── index.js
    ├── inject/                # 页面注入脚本（源码；发布包内为 Rolldown 产物）
    │   ├── index.js
    │   └── mock.js
    ├── shared/                # DevTools 与 UI 共用的工具模块
    ├── devtools/              # DevTools 扩展入口
    │   ├── index.html
    │   └── index.js
    └── ui/                    # React UI 应用（Vite 8）
        ├── dist/              # ⚠️ 需要 pnpm build - 主 UI 打包输出
        ├── vite.config.js     # 主应用 Vite 配置
        ├── vite.inject.config.mjs  # inject 单独构建配置
        ├── pages/
        │   ├── interceptor/   # 拦截器配置面板
        │   ├── network/       # 网络监控面板
        │   └── rules/         # 声明式规则配置
        ├── components/        # 公共组件
        ├── hooks/             # 自定义 hooks
        ├── utils/             # 工具函数
        ├── constants/         # 常量/默认值
        └── package.json       # 依赖与 scripts（含 build:inject）
```

---

## 🚀 快速命令参考

```bash
# 进入前端项目目录（相对仓库根）
cd src/ui

# 安装依赖
pnpm install

# 开发模式 (http://localhost:4001)
pnpm dev

# 构建主 UI（生产）
pnpm build

# 仅构建 inject（两次 Rolldown+IIFE，输出到仓库根 .cache/inject-dist/）
pnpm run build:inject

# 预览主 UI 构建结果
pnpm preview
```

在**仓库根目录**：

```bash
# 构建 UI 并打 mock-network-extension 与 zip
node scripts/pack.js -b

# 不触发 UI 构建（使用已有 src/ui/dist）
node scripts/pack.js
```

---
