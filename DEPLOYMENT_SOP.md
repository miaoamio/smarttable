# SmartTable 项目部署标准作业程序 (SOP)

本文档总结了 SmartTable 项目在 Vercel 部署过程中遇到的挑战及解决方案，并提供了正确的部署流程。

## 1. 核心失败原因总结

在多次尝试中，部署失败主要归结为以下几个技术难点：

1.  **Monorepo 依赖孤岛**：Vercel 的 Serverless Functions 默认不包含 Monorepo 中其他 Workspace 的代码。
2.  **Prisma 运行时丢失**：Prisma 需要二进制查询引擎文件，如果直接打包进 JS 文件，运行时会找不到生成的 Client。必须在打包时将其设为 `external`，并在构建流程中手动运行 `prisma generate`。
3.  **语法错误 (TS1160)**：在 `handler.ts` 中硬编码大型 HTML 模板时，如果内部 JavaScript 包含未转义的反引号 (`` ` ``)，会导致模板字符串提前闭合，引发“Unterminated template literal”构建错误。
4.  **请求体体积限制**：默认的 1MB 限制无法处理较大的 Excel 文件（Base64 编码会增加 33% 体积）。
5.  **CORS 预检失败**：浏览器发出的 `OPTIONS` 请求如果未得到 200 响应或没有正确的 CORS 头（特别是 Origin 为 `null` 时），会导致跨域失败。
6.  **Node.js 版本不匹配**：Vercel 设置与 `package.json` 中的 `engines` 冲突。

## 2. 正确的部署架构

为了解决上述问题，我们采用了以下架构：

*   **Bundling (打包)**：使用 `esbuild` 将代码打包进 `api/gateway.js`，但**排除** `@prisma/client` 等二进制相关库。
*   **Prisma Pre-build**：在构建命令中加入 `prisma generate`。
*   **Unified Body Limit**：统一将请求体限制提升至 100MB。
*   **Hardcoded Assets**：将管理后台 HTML 静态资源硬编码在 `handler.ts` 中，避免 Serverless 环境下的文件读取路径问题。

## 3. 正确部署步骤

### 第一步：本地配置校验

确保根目录的 [package.json](package.json) 包含以下关键配置：
```json
{
  "dependencies": {
    "@prisma/client": "6.2.1"
  },
  "devDependencies": {
    "prisma": "6.2.1"
  },
  "scripts": {
    "build": "prisma generate --schema=packages/mcp-gateway/prisma/schema.prisma && npm run build -w packages/mcp-server -w packages/mcp-gateway && node scripts/bundle-gateway.mjs"
  }
}
```

### 第二步：子包构建命令规范

子包（如 `packages/mcp-gateway`）的 [package.json](packages/mcp-gateway/package.json) 必须显式引用根目录的 `tsc`：
```json
"scripts": {
  "build": "../../node_modules/.bin/tsc -p tsconfig.json"
}
```

### 第三步：打包脚本优化 (bundle-gateway.mjs)

确保 `esbuild` 配置中 `external` 包含 Prisma：
```javascript
external: ['node:*', 'canvas', 'jsdom', '@prisma/client', '.prisma/client'],
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
