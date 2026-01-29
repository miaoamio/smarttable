export type UploadedFileState = {
  fileId: string;
  fileName: string;
  previewUrl: string;
  url?: string;
  loading?: boolean;
  type: "image" | "table";
  data?: any;
};

export const SYSTEM_PROMPT = `# Role
你是一个表格数据生成与编辑专家。你的核心职责是将用户的自然语言、图片 OCR 数据或上传的表格数据，精准转化为符合 **Smart Table Protocol** 的 JSON 结构。

# Core Guidelines
1. **严格输出**：只能输出一个合法的 JSON 对象，严禁包含任何 Markdown 代码块（如 \`\`\`json）或解释性文字。
2. **忠实还原**：若输入包含图片或上传表格，必须优先还原其中的原始数据（表头、行内容、结构），仅在用户追加描述的基础上进行针对性修改。
3. **类型推断**：根据语义映射最合适的列类型。默认 \`Text\`。
   - \`Avatar\`: 负责人、创建人等人物相关。
   - \`State\`: 状态、阶段。
   - \`Tag\`: 标签、分类。
   - \`ActionText\`: 操作、管理（"查看 编辑 ..." 格式）。
4. **格式规范**：
   - 英文默认使用 Sentence case。
   - 数字/金额右对齐 (\`align: "right"\`)。
   - 操作列中若有“更多”，统一使用 "..." 占位。
5. **操作列控制**：
   - \`rowAction\` (如 "Checkbox", "Radio") 仅在用户明确要求或参考图中清晰存在多选/单选框时才生成。
   - 若用户上传的 Excel/CSV 数据中不包含选择列，且未要求添加，**禁止**生成 \`rowAction\`。
   - 如果生成的 \`rowAction\` 列无法填充有效内容，应直接忽略该列，不要生成空的操作列。
6. **数据结构严格约束** (CRITICAL):
   - \`data\` 字段必须是 **二维数组** (\`string[][]\`)，严禁使用对象数组。
   - **错误示例**: \`[{"name": "Alice", "age": 18}, ...]\` (禁止使用 key-value)
   - **正确示例**: \`[["Alice", "18"], ["Bob", "20"]]\` (必须是纯值数组)
   - 值的顺序必须与 \`columns\` 数组定义的顺序严格一致。

# Protocol Definition (JSON Schema)

## 1. Create (intent: "create")
用于从零开始生成表格或根据参考资料重建表格。
\`\`\`json
{
  "intent": "create",
  "schema": {
    "rows": number,
    "cols": number,
    "rowAction": "Checkbox" | "Radio" | "Drag" | "Expand" | "Switch",
    "config": {
      "tabs": [{ "label": string }],
      "filters": [{ "label": string, "type": "select" | "input" | "search" }],
      "buttons": [{ "label": string, "type": "primary" | "secondary" | "outline" | "text" }]
    },
    "columns": [{ "title": string, "type": string, "header": "none" | "filter" | "sort" | "search" | "info", "width": "FILL" | "FIXED", "align": "left" | "center" | "right" }],
    "data": [["cell1", "cell2", ...]]
  }
}
\`\`\`

### Full Example (Create)
\`\`\`json
{
  "intent": "create",
  "schema": {
    "rows": 2,
    "cols": 6,
    "rowAction": "Checkbox",
    "config": {
      "tabs": [{ "label": "全部策略" }],
      "filters": [{ "label": "搜索", "type": "search" }],
      "buttons": [{ "label": "新建策略", "type": "primary" }]
    },
    "columns": [
      { "title": "策略ID", "type": "Text", "width": "FIXED", "align": "left" },
      { "title": "策略名称", "type": "Text", "width": "FILL", "align": "left" },
      { "title": "生效范围", "type": "Text", "width": "FILL", "align": "left" },
      { "title": "负责人", "type": "Avatar", "width": "FIXED", "align": "left" },
      { "title": "变更类型", "type": "Tag", "width": "FIXED", "align": "left" },
      { "title": "操作", "type": "ActionText", "width": "FIXED", "align": "right" }
    ],
    "data": [
      ["68f789bc9", "商业化PSM变更", "影像|商业化|服务树...", "宋明杰", "创建", "查看 编辑"],
      ["72a123bc4", "电商退货策略", "电商|退货|物流...", "王小明", "迁移", "查看 编辑"]
    ]
  }
}
\`\`\`

## 2. Edit (intent: "edit")
用于对现有表格进行增量修改。
\`\`\`json
{
  "intent": "edit",
  "patch": {
    "operations": [
      { "op": "update_cell", "row": number, "col": number, "value": string },
      { "op": "add_rows", "count": number, "position": "start" | "end" | number },
      { "op": "remove_rows", "indexes": number[] },
      { "op": "add_cols", "count": number, "position": "start" | "end" | number, "columns": [...] },
      { "op": "remove_cols", "indexes": number[] },
      { "op": "rename_column", "index": number, "title": string },
      { "op": "move_column", "fromIndex": number, "toIndex": number },
      { "op": "set_table_config", "size": "mini" | "default" | "medium" | "large", "rowAction": "none" | "multiple" | "single", "switches": { "pagination": boolean, "filter": boolean, "actions": boolean, "tabs": boolean } },
      { "op": "update_filters" | "update_tabs" | "update_buttons", "items": [...] }
    ]
  }
}
\`\`\`
`;

/**
 * Prompt 分发系统 (Prompt Dispatcher)
 * 
 * 职责分工：
 * 1. System Prompt: 静态定义协议 (JSON Schema)、通用准则、列类型推断逻辑。
 * 2. Dispatcher: 动态注入任务上下文、用户指令、多模态参考数据 (OCR/Excel)，并提供场景化的执行指令。
 */
export function distributePrompt(
  prompt: string,
  isEdit: boolean,
  attachments: UploadedFileState[],
  selectionLabel: string,
  tableContext: any,
  rowCount: number = 5,
  selectionKind?: "table" | "column" | "cell" | "filter" | "button_group" | "tabs" | "pagination",
  selectionCell?: { row: number; col: number },
  selectionColumn?: number
): string {
  const imageAttachments = attachments.filter((a) => a.type === "image");
  const tableAttachments = attachments.filter((a) => a.type === "table");

  // STRICT RULE: Only treat as "Edit" if isEdit is true AND we have valid tableContext.
  // If user clicked "Edit" but selected nothing (or non-table), we fallback to "Create".
  const effectiveIsEdit = isEdit && !!tableContext;

  // 1. 场景判定与基础指令
  let scenarioInstruction = "";
  if (!effectiveIsEdit) {
    scenarioInstruction = `# 任务：创建新表格 (Intent: Create)
请根据用户输入和参考资料，设计一个全新的表格。`;
  } else {
    scenarioInstruction = `# 任务：编辑现有表格 (Intent: Edit)
用户当前选中了 Figma 中的【${selectionLabel}】。请基于当前表格上下文进行增量修改。`;
  }

  // 2. 忠实还原规则 (Faithful Reconstruction Rules)
  let reconstructionRule = "";
  if (imageAttachments.length > 0 || tableAttachments.length > 0) {
    reconstructionRule = `
## 核心准则：忠实还原 (Critical: Faithful Reconstruction)
1. **内容优先**：你必须 100% 还原参考资料（图片 OCR 或 Excel）中的表头和数据。
2. **最小修改**：除非用户在追加描述中有明确的“修改”要求，否则不要改动参考资料中的文字、顺序或结构。
3. **数据补全**：如果参考资料行数少于 ${rowCount} 行，请循环使用资料中的现有数据进行补全，严禁自行捏造测试数据。`;
  }

  // 3. 动态上下文注入 (Context Injection)
  let contextSection = "";
  
  // 3.1 用户指令
  contextSection += `\n## 用户指令 (User Instruction)\n${prompt || "无明确描述，请根据资料自行推断或保持现状。"}`;

  // 3.2 参考资料 (OCR / Table Data)
  if (tableAttachments.length > 0) {
    contextSection += `\n\n## 参考数据 (来自上传的 Excel)\n`;
    tableAttachments.forEach((file) => {
      if (file.data) {
        contextSection += `### 文件: ${file.fileName}\n${JSON.stringify(file.data, null, 2)}\n`;
      }
    });
  }

  if (imageAttachments.length > 0) {
    contextSection += `\n\n## 视觉参考 (用户上传了图片)\n请结合视觉特征（如列宽、对齐、颜色、图标）优化 JSON 配置。`;
  }

  // 3.3 当前表格状态 (Current State - for Edit intent)
  if (effectiveIsEdit && tableContext) {
    let contextToProvide = tableContext;
    // 优化：根据选中类型过滤 Context，减少 Token 干扰
    if (selectionKind === "filter") {
      contextToProvide = { headers: tableContext.headers, config: { filters: tableContext.config?.filters } };
    } else if (selectionKind === "button_group") {
      contextToProvide = { config: { buttons: tableContext.config?.buttons } };
    } else if (selectionKind === "tabs") {
      contextToProvide = { config: { tabs: tableContext.config?.tabs } };
    }

    contextSection += `\n\n## 当前表格 JSON 上下文 (Current JSON Context)\n\`\`\`json\n${JSON.stringify(contextToProvide, null, 2)}\n\`\`\``;
  }

  // 4. 组装最终 Prompt
  return `
${scenarioInstruction}
${reconstructionRule}
${contextSection}

## 执行要求 (Execution Requirements)
- 生成正好 ${rowCount} 行数据。
- **表头元素控制**：除非用户明确要求（如“添加筛选”、“支持排序”）或参考图片中明显存在，否则表头 header 属性默认保持为空或 "none"，不要主动添加 filter/sort/info 图标。
- **操作列控制**：仅在用户明确要求或参考图中清晰存在多选/单选框时，才生成 \`rowAction\` (Checkbox/Radio)。若不确定，请不要生成。
- 必须保持语言一致性（中文需求输出中文，英文需求输出英文）。
- 只输出纯 JSON 对象。
`.trim();
}
