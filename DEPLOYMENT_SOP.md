# SmartTable 项目部署标准作业程序 (SOP)

本文档总结了 SmartTable 项目在 Vercel 部署过程中遇到的挑战及解决方案，并提供了正确的部署流程。

## 1. 核心失败原因总结

在多次尝试中，部署失败主要归结为以下四个技术难点：

1.  **Monorepo 依赖孤岛**：Vercel 的 Serverless Functions 默认不包含 Monorepo 中其他 Workspace 的代码。如果直接引用 `packages/` 下的代码，运行时会报错 `Module Not Found`。
2.  **构建环境路径冲突**：在 Vercel 容器中，直接运行 `tsc` 可能会因为 `npx` 缓存或环境变量问题找不到命令，或者错误地使用了全局安装的旧版本 `tsc`。
3.  **Node.js 运行时 Bug**：Node.js 20.x 版本的 npm 在处理复杂的 Workspace 安装时，偶尔会触发 `Exit handler never called!` 错误，导致构建中断。
4.  **入口文件不匹配**：Vercel 默认期望 API 路由在 `api/` 目录下，但 TypeScript 源码需要编译和打包后才能运行。

## 2. 正确的部署架构

为了解决上述问题，我们采用了以下架构：

*   **Bundling (打包)**：使用 `esbuild` 将所有依赖和子包代码打包进一个单文件 `api/gateway.js`。
*   **Explicit Paths (显式路径)**：在子包的 `scripts` 中使用指向根目录的绝对路径调用工具。
*   **Version Pinning (版本锁定)**：强制使用 Node.js 22+ 环境。

## 3. 正确部署步骤

### 第一步：本地配置校验

确保根目录的 [package.json](package.json) 包含以下关键配置：
```json
{
  "type": "module",
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "build": "npm run build -w packages/mcp-server -w packages/mcp-gateway && node scripts/bundle-gateway.mjs"
  }
}
```

### 第二步：子包构建命令规范

子包（如 `packages/mcp-server`）的 [package.json](packages/mcp-server/package.json) 必须显式引用根目录的 `tsc`：
```json
"scripts": {
  "build": "../../node_modules/.bin/tsc -p tsconfig.json"
}
```

### 第三步：Vercel 项目设置

在 Vercel 控制台中，确保以下设置：

1.  **Build Command**: `npm run build`
2.  **Output Directory**: `public` (即使没有静态网页，也需要一个输出目录)
3.  **Node.js Version**: `22.x`
4.  **Framework Preset**: `Other`

### 第四步：路由配置 (vercel.json)

确保 [vercel.json](vercel.json) 正确映射打包后的文件：
```json
{
  "functions": {
    "api/gateway.js": {
      "includeFiles": "packages/mcp-server/dist/**",
      "memory": 1024,
      "maxDuration": 30
    }
  },
  "routes": [
    { "src": "/health", "dest": "/api/gateway.js" },
    { "src": "/mcp/(.*)", "dest": "/api/gateway.js" }
  ]
}
```

## 4. 常见问题排查 (Troubleshooting)

| 现象 | 原因 | 解决方法 |
| :--- | :--- | :--- |
| `tsc: command not found` | Vercel 环境变量未同步 | 在 `package.json` 中改用 `../../node_modules/.bin/tsc` |
| `Module not found: @modelcontextprotocol/sdk` | 依赖未打包 | 检查 `scripts/bundle-gateway.mjs` 是否正常生成了 `api/gateway.js` |
| `401: access_token require prefix Bearer` | API Key 缺少 Bearer 前缀 | 检查代码是否使用了 `apiKey.startsWith("Bearer ") ? apiKey : \`Bearer ${apiKey}\`` 动态处理逻辑 |
| `CORS Error: Preflight request failed` | OPTIONS 请求未正确响应或 Origin 为 null | 确保 `vercel.json` 和 `handler.ts` 显式允许 `Origin: null` 并返回 200 OK |
| `npm error Exit handler never called!` | Node 20 版本的 npm Bug | 在 Vercel 设置中将 Node.js 版本切换到 22.x |

## 5. 跨域 (CORS) 专项配置

由于 Figma 插件环境的特殊性（Origin 经常为 `null`），必须在两个层面确保 CORS 正常工作：

### 1. Vercel 层配置 (vercel.json)
显式拦截 `OPTIONS` 方法并直接返回成功，避免进入 Serverless 函数前被 Vercel 默认拦截。
```json
{
  "src": "/(.*)",
  "methods": ["OPTIONS"],
  "headers": {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS,DELETE",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With"
  },
  "dest": "/api/gateway.js"
}
```

### 2. 代码层配置 (handler.ts)
在代码中手动处理 `origin: null` 的情况：
```typescript
if (origin === "null") {
  res.setHeader("access-control-allow-origin", "*");
}
```

## 6. 维护建议

*   **更新依赖**：在根目录运行 `npm install` 后，务必检查 `package-lock.json` 是否已同步。
*   **测试构建**：在推送代码前，本地运行 `npm run build`，检查 `api/gateway.js` 是否成功生成。

## 6. 附录：API 调用参考 (Coze Workflow)

如果你需要手动验证 API Key 或工作流是否有效，可以使用以下 `curl` 命令：

```bash
curl -X POST 'https://api.coze.cn/v1/workflows/chat' \
 -H "Authorization: Bearer <你的_PAT_TOKEN>" \
 -H "Content-Type: application/json" \
 -d '{
   "workflow_id": "7595980726576152630",
   "parameters": {
     "CONVERSATION_NAME": "Default",
     "USER_INPUT": "测试输入内容"
   },
   "additional_messages": [
     {
       "content": "测试输入内容",
       "content_type": "text",
       "role": "user",
       "type": "question"
     }
   ]
 }'
```

> **注意**：`Authorization` 必须包含 `Bearer ` 前缀。代码中已实现自动补全，但手动测试时需手动添加。
