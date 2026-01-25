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
    taskInstruction = `# Task: Create a New Table
你是一个 Figma 表格设计专家。请根据用户需求和提供的参考资料，从零开始设计一个表格。
必须确保生成的 JSON 符合 "intent": "create" 协议。
**重要格式约束：**
1. **只输出 JSON 对象本身**：不要包含任何前导或后继文字，不要使用 Markdown 代码块包裹。
2. **禁止嵌套**：确保 "data" 字段只包含字符串数组，严禁将整个 JSON 结构重复嵌套在 "data" 数组中。
3. **行数限制**：请务必生成正好 ${rowCount} 行数据内容。
4. **功能配置**：请务必在 JSON 的 "config" 字段中配置 "filters"（筛选器）和 "buttons"（按钮组），除非用户明确要求不需要。`;
  } else {
    taskInstruction = `# Task: Edit Existing Table
你是一个 Figma 表格编辑专家。用户当前正在对一个已有的 Figma 表格进行增量修改。
你必须基于提供的 [Current Table Context] 进行修改，并返回 "intent": "edit" 协议。
**重要格式约束：**
1. **只输出 JSON 对象本身**：不要包含任何前导或后继文字，不要使用 Markdown 代码块包裹。
2. **禁止重复输出**：严格按照 "patch" 协议返回修改操作，严禁在返回结果中包含多余的结构或嵌套。
3. **行数限制**：如果涉及新增行或重新生成内容，请确保最终结果中包含正好 ${rowCount} 行数据内容。`;
  }

  // 1.5 组件样式指南 (Component Style Guide)
  const styleGuide = `
## Component Style Guide
- **English Casing (英文大小写规范)**: 
    - 默认遵循 **Sentence case** 格式：仅首字母大写，其余小写（例如："User name", "Created date"）。
    - **特殊例外**：仅当字段为专有名词缩写、ID 或用户有明确全大写要求时，才使用 **UPPERCASE**（例如："ID", "URL", "SKU"）。
- **Avatar (头像)**: 专门用于展示人物或实体的列。在 JSON 中 type 应为 "Avatar"。
- **ActionText (操作列)**: 专门用于展示“查看、编辑、删除”等操作的列。在 JSON 中 type 应为 "ActionText"。
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
    selectionContext = `## User Selection in Figma
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
    tableContentContext = `\n## Current Table Context
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
    dataReference += `## Reference Data (from Uploaded Excel)
以下是用户上传的表格文件内容（已根据要求的行数 ${rowCount} 提取典型数据）。请将其作为生成数据的主要来源。
**注意：为了保持 Figma 性能和展示效果，请严格按照提供的这 ${rowCount} 行数据进行生成，不要自行扩展更多行。**\n`;
    tableAttachments.forEach((table, index) => {
      if (table.data) {
        dataReference += `\n--- File: ${table.fileName} ---\n${JSON.stringify(table.data, null, 2)}\n`;
      }
    });
  }

  if (imageAttachments.length > 0) {
    dataReference += `\n## Visual Reference
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

    currentState = `## Current Table Context (JSON)
这是当前 Figma 中选中目标的结构和上下文信息。你的修改必须基于此数据：
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

## User Requirement
${prompt || "请根据以上参考资料生成/优化表格"}

---
请严格遵守 SYSTEM_PROMPT 中定义的协议规范。
只能输出一个有效的 JSON 对象，严禁任何解释性文字、Markdown 标记或重复嵌套结构。
**注意：生成的 JSON 不要使用 Markdown 代码块（即不要使用 \`\`\`json ... \`\`\`）包裹。**
`.trim();

  return finalPrompt;
}
