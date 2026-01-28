## 10) 经验总结与最佳实践

### 10.1 样式与变量处理 (Style & Variable Handling)

在 Figma 插件开发中，正确处理样式（TextStyles, PaintStyles）和变量（Variables）的 Key 是避免 API 报错（如 404）的关键。

#### A. Key 的格式问题
- **原始 Key**: 从某些来源获取的 Key 可能包含额外信息，例如 `S:ac8ef12de...,131052:2`。
- **API 要求**: Figma 的 `importStyleByKeyAsync` 和 `importVariableByKeyAsync` 仅接受纯净的 32-40 位哈希 Key（例如 `ac8ef12de2cc499e51922d6b5239c26b3645a05a`）。
- **S: 前缀**: 必须去除 `S:` 前缀以及逗号后的任何内容。

#### B. 核心处理函数
在 `code.ts` 中，我们实现了以下机制来保证健壮性：

1.  **`normalizeStyleKey(key: string)`**:
    -   负责清洗 Key。
    -   逻辑：去除 `S:` 前缀，截断第一个逗号及之后的内容，去除首尾空格。
    -   **强制使用**: 在调用任何 import API 前，必须先调用此函数。

2.  **`resolveStyleId(policy, key, kind)`**:
    -   负责安全地加载样式 ID。
    -   **缓存 (Cache)**: 内存中缓存已解析的 Style ID，避免重复网络请求。
    -   **熔断 (Circuit Breaker)**: 记录每个 Key 的失败次数。如果连续失败超过阈值（如 3 次），则将其加入黑名单，后续直接返回 null，防止因死链导致的控制台报错洪流。
    -   **使用示例**:
        ```typescript
        const policy = createStylePolicy(3);
        const styleId = await resolveStyleId(policy, rawKey, "text");
        if (styleId) await node.setTextStyleIdAsync(styleId);
        ```

#### C. 异步 API 迁移
-   在 `documentAccess: "dynamic-page"` 权限下，严禁使用同步属性赋值（如 `node.textStyleId = id`）。
-   **必须**使用对应的 Async 方法：
    -   `setTextStyleIdAsync(id)`
    -   `setFillStyleIdAsync(id)`
    -   `setEffectStyleIdAsync(id)`
    -   `setGridStyleIdAsync(id)`

### 10.2 性能优化
-   **批量处理**: 尽量在一次遍历中收集所需信息，避免多次遍历节点树。
-   **日志控制**: 在生产环境或高频循环中，务必注释掉调试日志（特别是 `console.log`），否则会显著拖慢插件运行速度并污染控制台。
-   **Yield to Main**: 在处理大量节点（如大型表格生成）时，适当插入 `await new Promise(r => setTimeout(r, 0))` 让出主线程，避免界面卡死。
