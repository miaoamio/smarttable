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
