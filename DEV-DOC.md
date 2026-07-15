# MiniMD 开发文档

版本：v0.1.0  
最后更新：2026-06-29  
技术栈：React + TypeScript + Vite + Tauri 2

---

## 1. 项目结构

```
D:\Tools\PyWrokSpace\mdeditor
├── web                         # 前端项目（React + Vite）
│   ├── src
│   │   ├── App.tsx            # 主应用组件，编辑器、标签栏、工具栏
│   │   ├── App.css            # 全局样式 + 目录层宽度覆盖
│   │   ├── store
│   │   │   └── useDocumentStore.ts   # Zustand 文档状态管理
│   │   └── main.tsx           # React 入口
│   ├── src-tauri              # Tauri 后端（Rust）
│   │   ├── src
│   │   │   └── lib.rs         # 插件注册 + 单实例逻辑
│   │   ├── capabilities
│   │   │   └── default.json   # 前端能力权限配置
│   │   ├── icons              # 各平台图标
│   │   ├── Cargo.toml         # Rust 依赖
│   │   └── tauri.conf.json    # Tauri 应用 + 打包配置
│   ├── package.json
│   ├── index.html
│   └── vite.config.ts
├── PRD.md                     # 原始产品需求文档
├── README-Windows.md          # Windows 用户安装说明
└── DEV-DOC.md                 # 本开发文档
```

---

## 2. 核心技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | React 19 + TypeScript | UI 与交互逻辑 |
| 构建工具 | Vite 8 | 开发服务器与生产打包 |
| 编辑器 | md-editor-rt 6.x | React 版 Markdown 编辑器 |
| 扩展组件 | @vavt/rt-extension 4.x | Emoji、ExportPDF 工具栏按钮 |
| 状态管理 | Zustand 5.x | 文档、主题、活动页签 |
| 图标 | lucide-react | 标签栏与工具栏图标 |
| 桌面框架 | Tauri 2.x | Rust + WebView 打包 |
| Rust 工具链 | stable-x86_64-pc-windows-msvc | Windows 打包必须 MSVC |

---

## 3. 环境准备

### 3.1 必须安装

1. **Node.js** 18+（推荐 20+）
2. **Rust + Cargo**：https://rustup.rs
3. **MSVC 工具链**（Windows 打包必需）：
   ```bash
   rustup toolchain install stable-x86_64-pc-windows-msvc
   rustup default stable-x86_64-pc-windows-msvc
   ```
4. **Visual Studio 2022 生成工具**（含 C++ 工具负载）
5. **WebView2 Runtime**（Windows 10/11 通常已内置）

### 3.2 安装依赖

```bash
cd D:\Tools\PyWrokSpace\mdeditor\web
npm install
```

---

## 4. 常用开发命令

```bash
# 启动开发服务器（前端热更新 + Tauri 窗口）
npm run tauri dev

# 仅构建前端
npm run build

# 代码检查
npm run lint

# 生产构建 Windows 安装包（MSI + NSIS）
npx tauri build
```

---

## 5. 关键文件修改指南

### 5.1 调整界面/工具栏

文件：`web/src/App.tsx`

- `toolbars` 数组控制编辑器顶部工具栏按钮顺序与分组。
  - 数字 `0,1,2,3` 表示分隔栏位。
  - 字符串为内置按钮：`'bold'`, `'save'`, `'preview'`, `'catalog'` 等。
  - 去掉 `'github'` 等即可移除对应按钮。
- `defToolbars` 数组定义自定义工具栏按钮，目前包含：
  - 打开文件按钮
  - Emoji 按钮（当前注释中）
  - 导出 PDF 按钮（当前注释中）
  - 主题切换按钮
- 工具栏样式在 `web/src/App.css` 中，类名如 `.tool-btn`、`.tab-bar`。

### 5.2 调整目录/大纲弹出层宽度

文件：`web/src/App.css`

```css
.md-editor-catalog-editor {
  width: 400px !important;
}
.md-editor-catalog-fixed,
.md-editor-catalog-flat {
  width: 400px !important;
}
```

修改 `400px` 即可改变目录层宽度。

### 5.3 调整文档状态/新增字段

文件：`web/src/store/useDocumentStore.ts`

`Document` 接口与 `DocumentState` 定义文档数据结构。当前包含：

```ts
interface Document {
  id: string
  title: string
  content: string
  isDirty: boolean
  mode: ViewMode
  filePath?: string   // 磁盘文件路径
}
```

如需新增字段（如最近修改时间、编码），同步修改：
1. `Document` 接口
2. `addDocument` / `markSaved` / `updateContent` 等函数
3. 使用处（如 `App.tsx`）

### 5.4 调整窗口标题/尺寸/标识

文件：`web/src-tauri/tauri.conf.json`

```json
{
  "productName": "MiniMD",
  "version": "0.1.0",
  "identifier": "com.minimd.mdeditor",
  "app": {
    "windows": [{
      "title": "MiniMD",
      "width": 800,
      "height": 600
    }]
  }
}
```

### 5.5 调整文件关联

仍在 `tauri.conf.json` 的 `bundle.fileAssociations` 中：

```json
"fileAssociations": [{
  "ext": ["md", "markdown", "mdx"],
  "name": "Markdown Document",
  "description": "Markdown document",
  "role": "Editor",
  "mimeType": "text/markdown"
}]
```

### 5.6 调整后端插件/权限

- Rust 插件注册：`web/src-tauri/src/lib.rs`
- 前端权限：`web/src-tauri/capabilities/default.json`

新增 Tauri 插件时，需要同时：
1. `npm install @tauri-apps/plugin-xxx`
2. `Cargo.toml` 添加 `tauri-plugin-xxx = "x.x.x"`
3. `lib.rs` 调用 `.plugin(tauri_plugin_xxx::init())`
4. `default.json` 添加对应权限

---

## 6. 文件打开流程

```
用户双击 .md 文件
   ↓
系统启动 MiniMD，传入文件路径
   ↓
Tauri CLI 插件解析参数（tauri.conf.json plugins.cli）
   ↓
App.tsx useEffect 调用 getMatches() 获取文件路径
   ↓
openDocument(filePath) 读取内容 → addDocument → markSaved

已运行状态下再次双击 .md
   ↓
single-instance 插件拦截新实例
   ↓
Rust 侧 emit("open-file", path)
   ↓
前端 listen("open-file") 收到事件
   ↓
openDocument()：
   - 若 filePath 已存在 → 激活已有页签
   - 否则 → 新建页签
```

---

## 7. 打包发布

### 7.1 Windows 包

```bash
cd D:\Tools\PyWrokSpace\mdeditor\web
npx tauri build
```

输出位置：

```
web/src-tauri/target/release/bundle/msi/MiniMD_0.1.0_x64_zh-CN.msi
web/src-tauri/target/release/bundle/nsis/MiniMD_0.1.0_x64-setup.exe
```

- MSI：标准 Windows 安装包，写入「程序和功能」。
- NSIS `.exe`：便携安装程序。

### 7.2 仅生成 MSI

```bash
npx tauri build --bundles msi
```

### 7.3 未来跨平台

Tauri 2 已内置移动端支持，后续只需增加对应 target：

```bash
# macOS
rustup target add x86_64-apple-darwin aarch64-apple-darwin
npx tauri build --target aarch64-apple-darwin

# Linux
rustup target add x86_64-unknown-linux-gnu
npx tauri build --target x86_64-unknown-linux-gnu

# iOS / Android
npx tauri ios init
npx tauri android init
npx tauri ios build
npx tauri android build
```

---

## 8. 常见问题

| 问题 | 解决方案 |
|------|---------|
| `dlltool.exe not found` | 切换为 MSVC 工具链：`rustup default stable-x86_64-pc-windows-msvc` |
| 前端资源找不到 | 检查 `tauri.conf.json` 的 `frontendDist` 是否为 `../dist` |
| 插件权限报错 | 在 `capabilities/default.json` 添加对应权限 |
| 单实例不生效 | 确认 `tauri-plugin-single-instance` 已注册且未使用 dev server 多开 |
| 打包版本号未变 | 修改 `tauri.conf.json` 的 `version` 字段 |

---

## 9. 后续功能扩展建议

| 功能 | 建议实现位置 |
|------|-------------|
| 最近打开文件列表 | `useDocumentStore` + 本地存储（localStorage / Tauri store plugin） |
| 文件树侧边栏 | 新增 `Sidebar.tsx` + Tauri fs 插件读取目录 |
| 设置面板 | 新增 `Settings.tsx` + 持久化到 Tauri store / localStorage |
| 自动保存 | `useEffect` 监听 `content` 变化 + 定时 `writeTextFile` |
| 图片粘贴自动保存 | 监听编辑器 paste 事件 + Tauri fs 写入同目录 assets |
| 多语言 | i18n 库（如 react-i18next）+ 语言文件 |
| PDF 高级导出 / 云端同步 | 预留接口，作为会员功能后续接入 |

---

## 10. 联系方式

- 项目仓库：https://github.com/zhangy12385/minimd
- 问题反馈：[GitHub Issues](https://github.com/zhangy12385/minimd/issues)
