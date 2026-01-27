export type UploadedFileState = {
  fileId: string;
  fileName: string;
  previewUrl: string;
  url?: string;
  loading?: boolean;
  type: "image" | "table";
  data?: any;
};

/**
 * Prompt 分发系统
 * 
 * 职责分工：
 * 1. COZE_SYSTEM_PROMPT.md (静态): 负责定义协议 (JSON Schema)、列类型映射规则、通用的视觉识别逻辑。
 * 2. promptDispatcher.ts (动态): 负责注入当前操作上下文 (创建/编辑)、用户选中元素、以及上传的参考数据 (Excel/图片)。
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

  // 1. 任务指令 (Task Instruction)
  let taskInstruction = "";
  if (!isEdit) {
    taskInstruction = `# 任务：创建新表格 (Task: Create a New Table)
你是一个 Figma 表格设计专家。请根据用户需求和提供的参考资料，从零开始设计一个表格。

**🚨 核心准则 (CRITICAL RULE)：**
1. **优先使用参考数据**：如果下方提供了 [参考数据 (Reference Data)]，你 **必须** 提取其中的真实内容填充到 "data" 字段中。
2. **严禁使用示例值**：除非没有任何参考资料，否则严禁输出类似 "示例值"、"测试数据"、"John Doe" 等占位内容。
3. **语言一致性**：请务必保持输出语言与用户需求或上传资料中的语言一致。如果上传资料是中文，请生成中文内容。

必须确保生成的 JSON 符合 "intent": "create" 协议。
**重要格式约束：**
1. **只输出 JSON 对象本身**：不要包含任何前导或后继文字，不要使用 Markdown 代码块包裹。
2. **禁止嵌套**：确保 "data" 字段只包含字符串数组，严禁将整个 JSON 结构重复嵌套在 "data" 数组中。
3. **行数限制**：请务必生成正好 ${rowCount} 行数据内容。
4. **功能配置**：请务必在 JSON 的 "config" 字段中配置 "filters"（筛选器）和 "buttons"（按钮组），除非用户明确要求不需要。`;
  } else {
    taskInstruction = `# 任务：编辑现有表格 (Task: Edit Existing Table)
你是一个 Figma 表格编辑专家。用户当前正在对一个已有的 Figma 表格进行增量修改。

**🚨 核心准则 (CRITICAL RULE)：**
1. **优先使用参考数据**：如果上传了新的 Excel 或图片资料，请优先根据资料内容更新表格内容。
2. **保持连贯性**：除非用户要求，否则不要破坏现有的表格结构。
3. **语言一致性**：请务必保持输出语言与当前表格上下文或用户最新指令中的语言一致。

你必须基于提供的 [Current Table Context] 进行修改，并返回 "intent": "edit" 协议。
**重要格式约束：**
1. **只输出 JSON 对象本身**：不要包含任何前导或后继文字，不要使用 Markdown 代码块包裹。
2. **禁止重复输出**：严格按照 "patch" 协议返回修改操作，严禁在返回结果中包含多余的结构 or 嵌套。
3. **行数限制**：如果涉及新增行或重新生成内容，请确保最终结果中包含正好 ${rowCount} 行数据内容。`;
  }

  // 1.5 组件样式指南 (Component Style Guide)
  const styleGuide = `
## 组件样式指南 (Component Style Guide)
- **Language Consistency (语言一致性)**: 
    - **严禁擅自将中文转换为英文**。
    - 输出语言必须与用户输入及参考资料（Excel/图片）保持高度一致。
- **Casing (大小写规范)**: 
    - 对于英文内容，默认遵循 **Sentence case** 格式：仅首字母大写，其余小写（例如："User name", "Created date"）。
    - **特殊例外**：仅当字段为专有名词缩写、ID 或用户有明确全大写要求时，才使用 **UPPERCASE**（例如："ID", "URL", "SKU"）。
- **Avatar (头像)**: 专门用于展示人物或实体的列。在 JSON 中 type 应为 "Avatar"。
- **ActionText (操作列)**: 专门用于展示“查看、编辑、删除”等操作的列。在 JSON 中 type 应为 "ActionText"。
    - **特别要求**：如果操作项中包含“更多”，请务必使用 "..." 代替文字（系统会自动转换为“更多”图标样式）。
- **Tag (标签)**: 用于展示状态信息。在 JSON 中 type 应为 "Tag"。
- **Header (表头类型)**: 每一列的 "header" 字段支持以下四种带图标的模式：
    - "filter": 漏斗图标，表示可筛选。
    - "sort": 排序图标，表示可排序。
    - "search": 放大镜图标，表示可搜索。
    - "info": 提示图标 (i)，表示有提示信息。
- **Filters (筛选器)**: 在 config.filters 中配置，支持 "input", "select", "search" 类型。
- **Buttons (按钮组)**: 在 config.buttons 中配置，支持 "primary", "secondary", "text" 类型。
`;

  // 2. 选中态上下文 (Selection Context)
  let selectionContext = "";
  if (isEdit) {
    selectionContext = `## 用户在 Figma 中的选中内容 (User Selection in Figma)
当前用户在 Figma 中选中了: 【${selectionLabel}】
请根据选中目标精准理解用户的修改意图：`;

    if (selectionKind === "filter") {
      selectionContext += `\n- 重点调整 [update_filters] 操作。关注筛选器的标签、类型 (select/input/search) 和数量。`;
    } else if (selectionKind === "button_group") {
      selectionContext += `\n- 重点调整 [update_buttons] 操作。关注按钮的文字和类型（主要按钮始终在最右，且只有一个）。`;
    } else if (selectionKind === "tabs") {
      selectionContext += `\n- 重点调整 [update_tabs] 操作。关注页签的名称和数量。`;
    } else if (selectionKind === "column") {
      selectionContext += `\n- 重点调整列的属性 (title, type, header, width, align)。当前选中列索引为 ${selectionColumn}。`;
      selectionContext += `\n- 如果用户要求修改该列内容，请使用 {"op": "replace_column_text", "col": ${selectionColumn}, "find": "*", "replace": "..."}。`;
    } else if (selectionKind === "cell") {
      selectionContext += `\n- 重点调整表格内容数据或行操作 (add_rows, update_cell)。当前选中单元格为: 行 ${selectionCell?.row}, 列 ${selectionCell?.col}。`;
      selectionContext += `\n- 如果用户要求修改该单元格内容，请使用 {"op": "update_cell", "row": ${selectionCell?.row}, "col": ${selectionCell?.col}, "value": "..."}。`;
    } else if (selectionKind === "pagination") {
      selectionContext += `\n- 重点调整分页器相关的表格配置。`;
    } else {
      selectionContext += `\n- 对表格进行全局性调整或内容更新。`;
    }
  }

  // 2.5 表格内容上下文 (Table Content Context)
  let tableContentContext = "";
  if (isEdit && tableContext) {
    tableContentContext = `\n## 当前表格上下文 (Current Table Context)
- Rows: ${tableContext.rows}
- Columns: ${tableContext.cols}
- Headers: ${JSON.stringify(tableContext.headers)}
`;
    if (tableContext.data) {
       tableContentContext += `- Current Data (Preview): ${JSON.stringify(tableContext.data)}\n`;
     }
   }

  // 3. 参考数据注入 (Data Reference)
  let dataReference = "";
  if (tableAttachments.length > 0) {
    dataReference += `## 参考数据（来自上传的 Excel） (Reference Data from Uploaded Excel)
以下是用户上传的表格文件内容。请将其作为生成 JSON 中 "columns" (表头) 和 "data" (数据行) 的**唯一真实来源**。
**重要指令：**
1. **真实性**：严禁修改、翻译或替换参考数据中的任何文字。
2. **结构映射**：参考数据中的 "headers" 必须映射为 JSON 的 "columns"；"data" 必须映射为 JSON 的 "data"。
3. **行数限制**：请务必生成正好 ${rowCount} 行数据。如果参考数据行数不足，请循环使用参考数据中的行，严禁引入占位符。
4. **优先级**：如果此参考数据与 [Current Table Context] 不一致，请以**此参考数据为准**进行更新。\n`;
    tableAttachments.forEach((table, index) => {
      if (table.data) {
        dataReference += `\n--- 文件: ${table.fileName} ---\n${JSON.stringify(table.data, null, 2)}\n`;
      }
    });
  }

  if (imageAttachments.length > 0) {
    dataReference += `\n## 视觉参考 (Visual Reference)
用户上传了 ${imageAttachments.length} 张截图。请结合视觉特征（如颜色、布局、组件样式）来决定表格的配置。`;
  }

  // 4. 表格上下文 (Current State)
  let currentState = "";
  if (isEdit && tableContext) {
    let contextToProvide = tableContext;

    // 根据 selectionKind 过滤 Context
    if (selectionKind === "filter") {
      // 选中的是筛选器：只携带筛选器信息 + 表头信息
      contextToProvide = {
        headers: tableContext.headers,
        config: {
          filters: tableContext.config?.filters
        }
      };
    } else if (selectionKind === "button_group") {
      // 选中的是按钮组：只携带按钮信息
      contextToProvide = {
        config: {
          buttons: tableContext.config?.buttons
        }
      };
    } else if (selectionKind === "tabs") {
      // 选中的是页签
      contextToProvide = {
        config: {
          tabs: tableContext.config?.tabs
        }
      };
    }
    // else: 选中的是表格或表格列或单元格或分页器，则 prompt 携带现在整个表格的信息（表格+按钮组+分页器+页签信息）
    // 默认就是 tableContext

    currentState = `## 当前表格 JSON 上下文 (Current Table Context JSON)
这是当前 Figma 中选中目标的结构和上下文信息。你的修改必须基于此数据，并保持语言一致性：
\`\`\`json
${JSON.stringify(contextToProvide, null, 2)}
\`\`\`
`;
  }

  // 5. 组装最终 Prompt
  const finalPrompt = `
${taskInstruction}

${styleGuide}

${selectionContext}

${tableContentContext}

${dataReference}

${currentState}

## 用户需求 (User Requirement)
${prompt || "请根据以上参考资料生成/优化表格"}

---
请严格遵守 SYSTEM_PROMPT 中定义的协议规范。
只能输出一个有效的 JSON 对象，严禁任何解释性文字、Markdown 标记或重复嵌套结构。
**特别提醒：保持语言的一致性，输入为中文则输出为中文。**
**注意：生成的 JSON 不要使用 Markdown 代码块（即不要使用 \`\`\`json ... \`\`\`）包裹。**
`.trim();

  return finalPrompt;
}
