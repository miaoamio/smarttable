# Figma AI 插件开发 SOP

## 1) 项目启动总览

- 根目录：`/Users/bytedance/Desktop/table`
- Node 版本：建议使用当前 LTS（如 18+）
- 启动顺序（本地开发）：
  1. 安装依赖：`npm install`
  2. 启动后端网关：`npm run dev:gateway`
  3. 启动 Figma 插件构建：`npm run dev:plugin` 只需运行重新构建开发版，开发模式 Tab 就会重新出现。
  4. 在 Figma Desktop 中导入并运行插件

## 2) 一次性准备

在项目根目录安装依赖：

```bash
cd /Users/bytedance/Desktop/table
npm install
```

在项目根目录配置 `.env.local`（只放本机，不要提交）：

```env
LLM_BASE_URL=https://api.coze.cn
LLM_MODEL=你的_COZE_BOT_ID
LLM_API_KEY=pat_你的访问令牌
COZE_USER_ID=123456789
COZE_WORKFLOW_ID=你的_WORKFLOW_ID
```

要点：
- `LLM_MODEL` 填 Coze 的 `bot_id`（智能体开发页 URL 里 `bot/` 后面的数字）。
- `COZE_WORKFLOW_ID` 填 Coze 的工作流 ID，用于处理包含复杂工具调用（如 OCR）的任务。
- `LLM_API_KEY` 只填 `pat_...`，不要加 `Bearer`，不要加引号/反引号/空格。

## 3) 启动后端网关（本地）

在项目根目录执行：

```bash
npm run dev:gateway
```

确认启动成功：
- 看到 `{"service":"mcp-gateway","port":8787,...,"llm":{"apiKeyLen":...}}`
- `apiKeyLen` > 0

## 4) 用 curl 验证链路（必须通过）

健康检查：

```bash
curl -s http://localhost:8787/health
```

预期输出：

```json
{"ok":true}
```

验证 LLM：

```bash
curl -s -X POST http://localhost:8787/tools/llm_chat \
  -H 'content-type: application/json' \
  -d '{"args":{"prompt":"回复我一句：连接成功","temperature":0.1}}'
```

预期输出（示例）：
- 返回 JSON 且包含 `text`
- `text` 里能看到“连接成功”

## 5) 启动插件与开发调试

### 启动插件开发模式
在项目根目录执行：
```bash
npm run dev:plugin
```
此命令会启动监听模式，每当你保存代码（`Cmd + S`），它都会自动重新构建插件代码到 `dist` 目录。

### 如何更新到 Figma？
Figma 插件不会自动“热更新”界面，你需要在修改代码后执行以下操作：
1. **保存代码**：确保终端中的 `npm run dev:plugin` 运行正常且没有报错。
2. **刷新插件**：在 Figma 窗口中按下 **`Cmd + Option + P`** (Mac) 或 **`Ctrl + Alt + P`** (Windows)。
   - 这会重新运行你最后一次使用的插件。
   - 如果快捷键失效，可以通过右键菜单：`Plugins` -> `Development` -> `你的插件名` 重新打开。

---

## 6) 核心命令说明

| 命令 | 场景 | 效果 |
| :--- | :--- | :--- |
| **`npm run dev:plugin`** | **日常开发** | **自动更新**。监听代码变化并实时编译。终端会保持运行。 |
| **`npm run build`** | **发布/交付** | **单次构建**。代码压缩优化，运行一次即结束，用于最终发布。 |

---

## 7) AI 数据生成说明

### AI 内容来源
- 本插件不包含任何本地 AI 模型或硬编码的随机生成逻辑（如随机姓名）。
- **所有 AI 生成的内容**（包括但不限于：头像列的姓名、表格数据、多语言翻译等）均由 **Coze (扣子)** 平台提供的大模型实时生成。
- 插件通过网关向 Coze 发送 Prompt，Coze 处理后返回结构化的 JSON 数据。

### 关键逻辑
1. **初始生成/AI 修改**：直接使用 Coze 返回的 JSON 中的 `data` 字段值。
2. **类型切换（Avatar）**：为了保证交互体验，手动将列切换为“头像”时，UI 会默认显示“宋明杰”，但底层的 `cellValue` 会保留原始数据，不会被覆盖。
3. **数据流向**：Coze (LLM) -> 网关 (Gateway) -> 插件 UI -> Figma 渲染。

---

## 8) 最小排障

- `缺少大模型 API Key`
  - `.env.local` 是否在项目根目录
  - 是否重启过 `npm run dev:gateway`
  - `LLM_API_KEY` 是否非空且没有引号/反引号/空格

- `大模型请求失败(4100): authentication is invalid` 或 `4101 token 不合法`
  - token 是否来自 `coze.cn` 对应环境（不要把 coze.com 的 token 用在 `api.coze.cn`）
  - `.env.local` 里只填 `pat_...`，不要带 `Bearer`

## 9) 常见问题及解决方案

### **问题 A: AI 生成失败 (无法识别 AI 返回结构)**
- **现象**: UI 提示 `AI 生成失败: 无法识别 AI 返回结构`，或者解析 JSON 时报错。
- **根本原因**:
  - LLM 返回了非纯 JSON 格式（如带有 Markdown 代码块包裹）。
  - LLM 返回了嵌套的 schema 结构（如 `schema.schema`）。
  - LLM 返回的 JSON 结构不完整或末尾有多余的闭合括号。
- **解决方案**:
  1. **Prompt 强化**: 确保 [promptDispatcher.ts](file:///Users/bytedance/Desktop/table/packages/figma-plugin/src/promptDispatcher.ts) 中的提示词明确要求 `请只输出 JSON 对象本身，不要包含任何前导或后继文字，不要使用 Markdown 代码块包裹`。
  2. **解析逻辑容错**: 在 [ui.ts](file:///Users/bytedance/Desktop/table/packages/figma-plugin/src/ui.ts) 中使用 `extractAllJsonObjects` 和 `tryParseTruncatedJson` 进行容错解析，自动修复截断的 JSON 和多余的括号。
  3. **结构标准化**: 在 `coerceLegacyToEnvelope` 中处理可能的嵌套结构。

### **问题 B: Figma 插件 API 异步报错**
- **现象**: 报错 `Cannot call with documentAccess: dynamic-page. Use node.getMainComponentAsync instead.`。
- **根本原因**:
  - 在 `manifest.json` 中开启了 `documentAccess: "dynamic-page"` 权限。
  - 在此权限下，Figma 强制要求使用异步 API（如 `getMainComponentAsync`）替代同步 API（如 `.mainComponent`）。
- **解决方案**:
  1. **全面异步化**: 将所有 `.mainComponent` 调用替换为 `await getMainComponentAsync()`。
  2. **调用链检查**: 确保所有调用这些异步函数的上层链路也都标记为 `async` 并使用了 `await`。
  3. **强制构建**: 如果源码已修改但插件仍报错，请务必执行 `npm run build` 确保 `dist/code.js` 产物已更新。

### **问题 C: "手动调整" Tab 选中元素不更新 (Selection Change 失效)**
- **现象**: 在画布上选中表格、列或单元格时，插件 "手动调整" 面板没有任何反应（不切换面板，也不更新选中内容）。
- **根本原因**:
  1. **事件监听丢失**: `code.ts` 中 `figma.on("selectionchange", ...)` 监听代码被意外覆盖或移除，导致插件初始化后无法响应后续的选中变化。
  2. **面板切换逻辑缺陷**: `ui.ts` 中 `setActiveTab` 过于严格地检查所有 Tab 面板（含开发模式）是否存在，导致生产环境（隐藏开发模式）下切换失败；且手动点击 Tab 时未强制刷新内部子面板状态。
  3. **表格判定过严**: `isSmartTableFrame` 仅支持严格的前缀命名和布局结构，导致重命名后的表格或包含特殊子元素的表格无法识别。
- **解决方案**:
  1. **恢复事件监听**: 确保 `code.ts` 包含 `figma.on("selectionchange", () => postSelection())`。
  2. **放宽判定逻辑**: 更新 `isSmartTableFrame` 支持模糊匹配（如包含 "table"、"block"）和基于子元素特征（如包含列组件）的推断。
  3. **优化 UI 状态同步**: 重构 `setActiveTab` 和 `updatePanels`，移除对开发模式面板的强依赖，并在 Tab 点击时强制刷新子面板状态。
  4. **兜底定位**: 在 `postSelection` 中增加兜底逻辑，若无法精确定位行列，至少识别为表格容器，确保基础配置项可用。

### **问题 D: "Failed to apply TextStyle/Variable" (API 限制与权限)**
- **现象**: 尝试应用团队库样式或变量时报错 `Cannot call with documentAccess: dynamic-page` 或 `could not find variable`。
- **根本原因**:
  1. **异步 API 强制**: `documentAccess: dynamic-page` 模式下，设置样式 ID（如 `textStyleId`）必须使用异步方法 `setTextStyleIdAsync`。
  2. **变量查找限制**: `importVariableByKeyAsync` 仅适用于从未导入过的远程变量。如果变量已在本地存在（即使是引用的库变量），该方法可能失败。
- **解决方案**:
  1. **样式应用**: 
     - **TextStyle**: 使用 `await node.setTextStyleIdAsync(id)` 替代 `node.textStyleId = id`。
     - **PaintStyle**: 使用 `await node.setFillStyleIdAsync(id)` 替代 `node.fillStyleId = id`。
  2. **变量应用**:
     - **查找策略**: 优先尝试 `importVariableByKeyAsync(key)`。如果失败（抛错），捕获错误并降级尝试 `getVariableByIdAsync(id)`。
     - **绑定**: 使用 `figma.variables.setBoundVariableForPaint(paint, 'color', variable)` 绑定颜色变量。注意先检查 `paint.type === 'SOLID'`。

- `EADDRINUSE`（端口占用）
  - 结束旧的 gateway 进程后再重新启动

- **Coze 插件/工具执行中断**
  - **现象**：API 调用只返回 `FunctionCallPlugin` 或工具调用指令，不执行后续逻辑。
  - **原因**：Coze Chat API (`/v3/chat`) 默认需要客户端处理工具调用闭环。
  - **解决**：改用 Workflow API (`/v1/workflows/chat`)，由服务端托管工具执行流程，直接返回最终结果。本项目已在 MCP Server 层封装此逻辑。

## 7) 架构设计思路（简版）

- 分层与职责
  - Figma 插件（packages/figma-plugin）：最小化，负责 UI 与主线程交互，不直接持有任何后端密钥
  - 网关（packages/mcp-gateway）：HTTP 服务入口，鉴权、CORS、限流、请求体校验；通过 MCP 客户端与后端工具对接
  - MCP 服务（packages/mcp-server）：实现工具集（如 `llm_chat`），统一封装 LLM 调用、错误处理与返回格式

- 进程与通信
  - 网关为独立 Node 进程（HTTP），启动时以子进程方式拉起 MCP 服务，双方使用 stdio 作为传输层
  - 插件只调用网关的 HTTP 接口（如 `/tools/llm_chat`），避免在插件侧暴露任何后端配置与 Token

- 数据流（一次 llm_chat 调用）
  - 插件 → 网关：POST `/tools/llm_chat`，携带最小参数（prompt 等）
  - 网关 → MCP：转发为 `tools/call` 请求，返回标准内容片段
  - MCP → LLM：默认尝试 Coze 接口；若检测为 Coze 且 404，自动切换 Coze v3 流程并返回最终回答
  - LLM 实现：见 [index.ts](file:///Users/bytedance/Desktop/table/packages/mcp-server/src/index.ts#L42-L100)
  - Coze Workflow 实现（支持工具闭环）：见 [index.ts](file:///Users/bytedance/Desktop/table/packages/mcp-server/src/index.ts#L114-L296)
  - 自动切换判断：见 [index.ts](file:///Users/bytedance/Desktop/table/packages/mcp-server/src/index.ts#L398-L408)

- 配置与安全
  - 环境变量加载：网关与 MCP 在启动时读取项目根目录 `.env.local`，不要求 shell export
  - Token 仅放在后端 `.env.local`，插件 UI 不显示、不透传
  - 网关提供基础 CORS、限流、最大请求体约束；见 [mcp-gateway/index.ts](file:///Users/bytedance/Desktop/table/packages/mcp-gateway/src/index.ts#L40-L66)

- 错误处理
  - 统一包裹并返回简明错误（含 HTTP 状态与短消息）
  - Coze 失败码直通，便于定位是鉴权/权限/发布配置问题

- 部署演进（面向最终用户隐藏后端）
  - 将网关部署到你的服务端，只保留域名给插件，所有密钥与配置继续在服务端 `.env.local`
  - 插件侧不变，仍调用 `/tools/*`；需要时在 manifest 里添加允许域名
