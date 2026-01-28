import {
  ColumnType,
  HeaderMode,
  TableOperation,
  UiToPluginMessage,
  TableContext,
  TableAuxConfig,
  TableSchema
} from "./shared/messages";
import {
  CELL_COMPONENT_KEY,
  HEADER_COMPONENT_KEY as SHARED_HEADER_COMPONENT_KEY,
  HEADER_PROP_KEYS,
  initialComponents
} from "../../mcp-gateway/src/component-config";

const DEFAULT_CN_NAME = "宋明杰";
const DEFAULT_EN_NAME = "Sally";

function getDefaultAvatarName(text?: string): string {
  if (!text || text.trim() === "") return DEFAULT_CN_NAME;
  // If text contains any Chinese characters, use Chinese default
  if (/[\u4e00-\u9fa5]/.test(text)) return DEFAULT_CN_NAME;
  // Otherwise use English default
  return DEFAULT_EN_NAME;
}

// Minimal Surname Map (Top 100+ Common Surnames)
const SURNAME_MAP: Record<string, string> = {
  "赵": "Z", "钱": "Q", "孙": "S", "李": "L", "周": "Z", "吴": "W", "郑": "Z", "王": "W",
  "冯": "F", "陈": "C", "褚": "C", "卫": "W", "蒋": "J", "沈": "S", "韩": "H", "杨": "Y",
  "朱": "Z", "秦": "Q", "尤": "Y", "许": "X", "何": "H", "吕": "L", "施": "S", "张": "Z",
  "孔": "K", "曹": "C", "严": "Y", "华": "H", "金": "J", "魏": "W", "陶": "T", "姜": "J",
  "戚": "Q", "谢": "X", "邹": "Z", "喻": "Y", "柏": "B", "水": "S", "窦": "D", "章": "Z",
  "云": "Y", "苏": "S", "潘": "P", "葛": "G", "奚": "X", "范": "F", "彭": "P", "郎": "L",
  "鲁": "L", "韦": "W", "昌": "C", "马": "M", "苗": "M", "凤": "F", "花": "H", "方": "F",
  "俞": "Y", "任": "R", "袁": "Y", "柳": "L", "酆": "F", "鲍": "B", "史": "S", "唐": "T",
  "费": "F", "廉": "L", "岑": "C", "薛": "X", "雷": "L", "贺": "H", "倪": "N", "汤": "T",
  "滕": "T", "殷": "Y", "罗": "L", "毕": "B", "郝": "H", "邬": "W", "安": "A", "常": "C",
  "乐": "L", "于": "Y", "时": "S", "傅": "F", "皮": "P", "卞": "B", "齐": "Q", "康": "K",
  "伍": "W", "余": "Y", "元": "Y", "卜": "B", "顾": "G", "孟": "M", "平": "P", "黄": "H",
  "和": "H", "穆": "M", "萧": "X", "尹": "Y", "姚": "Y", "邵": "S", "湛": "Z", "汪": "W",
  "祁": "Q", "毛": "M", "禹": "Y", "狄": "D", "米": "M", "贝": "B", "明": "M", "臧": "Z",
  "计": "J", "伏": "F", "成": "C", "戴": "D", "谈": "T", "宋": "S", "茅": "M", "庞": "P",
  "熊": "X", "纪": "J", "舒": "S", "屈": "Q", "项": "X", "祝": "Z", "董": "D", "梁": "L",
  "杜": "D", "阮": "R", "蓝": "L", "闵": "M", "席": "X", "季": "J", "麻": "M", "强": "Q",
  "贾": "J", "路": "L", "娄": "L", "危": "W", "江": "J", "童": "T", "颜": "Y", "郭": "G",
  "梅": "M", "盛": "S", "林": "L", "刁": "D", "钟": "Z", "徐": "X", "邱": "Q", "骆": "L",
  "高": "G", "夏": "X", "蔡": "C", "田": "T", "樊": "F", "胡": "H", "凌": "L", "霍": "H",
  "虞": "Y", "万": "W", "支": "Z", "柯": "K", "昝": "Z", "管": "G", "卢": "L", "莫": "M",
  "经": "J", "房": "F", "裘": "Q", "缪": "M", "干": "G", "解": "X", "应": "Y", "宗": "Z",
  "丁": "D", "宣": "X", "贲": "B", "邓": "D", "郁": "Y", "单": "S", "杭": "H", "洪": "H",
  "包": "B", "诸": "Z", "左": "Z", "石": "S", "崔": "C", "吉": "J", "钮": "N", "龚": "G",
  "程": "C", "嵇": "J", "邢": "X", "滑": "H", "裴": "P", "陆": "L", "荣": "R", "翁": "W",
  "荀": "X", "羊": "Y", "於": "Y", "惠": "H", "甄": "Z", "曲": "Q", "家": "J", "封": "F",
  "芮": "R", "羿": "Y", "储": "C", "靳": "J", "汲": "J", "邴": "B", "糜": "M", "松": "S",
  "井": "J", "段": "D", "富": "F", "巫": "W", "乌": "W", "焦": "J", "巴": "B", "弓": "G",
  "牧": "M", "隗": "K", "山": "S", "谷": "G", "车": "C", "侯": "H", "宓": "M", "蓬": "P",
  "全": "Q", "郗": "X", "班": "B", "仰": "Y", "秋": "Q", "仲": "Z", "伊": "Y", "宫": "G"
};

function getVariantProps(node: InstanceNode | ComponentNode): Record<string, string> {
  const res: Record<string, string> = {};
  
  if (node.type === "INSTANCE") {
    const props = node.componentProperties;
    for (const [key, prop] of Object.entries(props)) {
      const name = key.split("#")[0];
      if (typeof prop.value === "boolean") {
        res[name] = prop.value ? "True" : "False";
      } else {
        res[name] = String(prop.value);
      }
    }
  } else {
    // For ComponentNode, variantProperties is still fine or we use definitions
    const props = node.variantProperties;
    if (props) {
      for (const [key, val] of Object.entries(props)) {
        res[key] = val;
      }
    }
  }
  
  return res;
}

function getInitial(char: string): string {
  // 1. Check direct map (Chinese Surname)
  if (SURNAME_MAP[char]) {
    return SURNAME_MAP[char];
  }
  // 2. Check if it's Latin (A-Z)
  if (/^[A-Za-z]/.test(char)) {
    return char.toUpperCase();
  }
  // 3. Fallback
  return "A";
}

console.log("Smart Table plugin starting...");
  
  const COMPONENT_KEY = CELL_COMPONENT_KEY;
const HEADER_COMPONENT_KEY = SHARED_HEADER_COMPONENT_KEY;

function isHeaderNode(node: SceneNode): boolean {
  if (node.type === "FRAME" && node.getPluginData("cellType") === "Header") return true;
  return node.name === "Header" || 
         node.getPluginData("isHeader") === "true" || 
         node.name.toLowerCase().includes("header") ||
         node.name.toLowerCase().includes("表头");
}

async function isHeaderInstance(instance: InstanceNode): Promise<boolean> {
  if (instance.getPluginData("cellType") === "Header") return true;
  const main = await instance.getMainComponentAsync();
  if (!main) return false;
  if (main.key === HEADER_COMPONENT_KEY || main.key === ACTION_HEADER_KEY) return true;
  if (main.parent && main.parent.type === "COMPONENT_SET") {
    const parentKey = (main.parent as ComponentSetNode).key;
    if (parentKey === HEADER_COMPONENT_KEY || parentKey === ACTION_HEADER_KEY) return true;
    if ((main.parent as ComponentSetNode).children.some((child) => (child.type === "COMPONENT" || child.type === "COMPONENT_SET") && (child.key === HEADER_COMPONENT_KEY || child.key === ACTION_HEADER_KEY))) {
      return true;
    }
  }
  const props = instance.componentProperties;
  const hasAny = (keys: string[]) => Object.keys(props).some((k) => keys.some((x) => k.includes(x)));
  if (hasAny(PROP_KEYS.filter) || hasAny(PROP_KEYS.sort) || hasAny(PROP_KEYS.search)) return true;
  return false;
}

/**
 * Design Tokens
 * 用于维护全局色彩、尺寸、字号变量
 */
const TOKENS = {
  colors: {
    "text-1": "0C0D0E",
    "text-2": "42464E", // Added text-2 color
    "link-6": "1664FF",
    "danger-6": "D7312A",
    "color-fill-2": "737A87",
    "color-fill-3": "42464E",
    "color-bg-4": "F6F8FA", // Added header background color
  },
  sizes: {
    base: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
  },
  fontSizes: {
    xs: 11,
    sm: 12,
    md: 13,
    lg: 14,
    "body-2": 13,
  },
  typography: {
    fontFamily: "PingFang SC",
    lineHeight: 22,
    letterSpacing: 0.3, // in percent
  }
};

/**
 * Helper to convert hex to RGB for Figma
 */
function hexToRgb(hex: string): { r: number, g: number, b: number } {
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  return { r, g, b };
}

/**
 * Fetch local Figma variables and styles
 */
async function getFigmaTokens() {
  const tokens: any = {
    variables: [],
    paintStyles: [],
    textStyles: [],
    selection: []
  };

  try {
    console.log("getFigmaTokens started");
    const selection = figma.currentPage.selection;
    console.log("Current selection length:", selection.length);
    
    // 1. Fetch Variables (if available)
    if (typeof figma.variables !== 'undefined') {
      const localVariables = await figma.variables.getLocalVariablesAsync();
      console.log("Local variables found:", localVariables.length);
      tokens.variables = localVariables.map(v => ({
        id: v.id,
        name: v.name,
        resolvedType: v.resolvedType,
        description: v.description
      }));
    }

    // 2. Fetch Paint Styles
    try {
      const paintStyles = figma.getLocalPaintStyles();
      console.log("Local paint styles found:", paintStyles.length);
      tokens.paintStyles = paintStyles.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        paints: s.paints
      }));
    } catch (e) {
      console.log("figma.getLocalPaintStyles failed, trying Async version...");
      if (typeof (figma as any).getLocalPaintStylesAsync === 'function') {
        const paintStyles = await (figma as any).getLocalPaintStylesAsync();
        console.log("Local paint styles found (Async):", paintStyles.length);
        tokens.paintStyles = paintStyles.map((s: any) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          paints: s.paints
        }));
      } else {
        console.warn("getLocalPaintStylesAsync is not available");
      }
    }

    // 3. Fetch Text Styles
    try {
      const textStyles = figma.getLocalTextStyles();
      console.log("Local text styles found:", textStyles.length);
      tokens.textStyles = textStyles.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        fontName: s.fontName,
        fontSize: s.fontSize,
        lineHeight: s.lineHeight,
        letterSpacing: s.letterSpacing
      }));
    } catch (e) {
      console.log("figma.getLocalTextStyles failed, trying Async version...");
      if (typeof (figma as any).getLocalTextStylesAsync === 'function') {
        const textStyles = await (figma as any).getLocalTextStylesAsync();
        console.log("Local text styles found (Async):", textStyles.length);
        tokens.textStyles = textStyles.map((s: any) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          fontName: s.fontName,
          fontSize: s.fontSize,
          lineHeight: s.lineHeight,
          letterSpacing: s.letterSpacing
        }));
      } else {
        console.warn("getLocalTextStylesAsync is not available");
      }
    }

    // 4. Inspect Selection (for Library Tokens)
    for (const node of selection) {
      console.log("Inspecting node:", node.name, node.type);
      const nodeTokens: any = {
        nodeName: node.name,
        nodeType: node.type,
        appliedTokens: []
      };

      try {
        // Check for Fill Style
        if ('fillStyleId' in node && node.fillStyleId) {
          console.log("Node has fillStyleId:", node.fillStyleId);
          let styleName = 'Unknown Style (Remote/Library)';
          try {
            const style = figma.getStyleById(node.fillStyleId as string);
            if (style) styleName = style.name;
          } catch (e) {
            console.log("figma.getStyleById failed for fillStyleId, this is normal for some remote styles");
          }
          
          nodeTokens.appliedTokens.push({
            type: 'PaintStyle',
            id: node.fillStyleId,
            name: styleName
          });
        }

        // Check for Text Style
        if ('textStyleId' in node && node.textStyleId && node.textStyleId !== figma.mixed) {
          console.log("Node has textStyleId:", node.textStyleId);
          let styleName = 'Unknown Style (Remote/Library)';
          try {
            const style = figma.getStyleById(node.textStyleId as string);
            if (style) styleName = style.name;
          } catch (e) {
            console.log("figma.getStyleById failed for textStyleId");
          }
          
          nodeTokens.appliedTokens.push({
            type: 'TextStyle',
            id: node.textStyleId,
            name: styleName
          });
        }

        // Check for Bound Variables
        if ('boundVariables' in node && node.boundVariables) {
          const bv = node.boundVariables;
          console.log("Node has boundVariables:", Object.keys(bv));
          for (const [key, variable] of Object.entries(bv)) {
            if (variable) {
              const vars = Array.isArray(variable) ? variable : [variable];
              for (const v of vars) {
                let variableId: string | null = null;
                if (typeof v === 'string') {
                  variableId = v;
                } else if (v && typeof v === 'object' && 'id' in v) {
                  variableId = (v as any).id;
                }

                if (variableId) {
                  console.log("Found bound variable ID:", variableId, "for key:", key);
                  let varName = 'Unknown Variable (Remote/Library)';
                  try {
                    const varObj = await figma.variables.getVariableByIdAsync(variableId);
                    if (varObj) varName = varObj.name;
                  } catch (e) {
                    console.log("figma.variables.getVariableByIdAsync failed for", variableId);
                  }

                  nodeTokens.appliedTokens.push({
                    type: 'Variable',
                    property: key,
                    id: variableId,
                    name: varName
                  });
                }
              }
            }
          }
        }
      } catch (nodeErr) {
        console.warn("Error inspecting node", node.name, ":", nodeErr);
      }

      if (nodeTokens.appliedTokens.length > 0) {
        tokens.selection.push(nodeTokens);
      }
    }
    console.log("getFigmaTokens completed, tokens.selection length:", tokens.selection.length);
  } catch (e) {
    console.warn("Failed to fetch Figma tokens:", e);
  }

  return tokens;
}

const TABS_COMPONENT_KEY = "4c762a63f502f3c4596e4cdb0647514cf00a2ec7";
const FILTER_COMPONENT_KEY = "cadcfc99d9dc7ac32eac6eda4664ad68a712d19d"; // Updated Key
const FILTER_ITEM_COMPONENT_KEY = "7eaa61f7dda9a4e8271e2dbfcafcb5c2730ac2ab"; // Filter Item Key
const BUTTON_GROUP_COMPONENT_KEY = "180fb77e98e458d377212d51f6698085a4bf2f9f";
const PAGINATION_COMPONENT_KEY = "4a052d113919473bb3079dd723e05ccd343042c5";

let isProcessing = false;

function setProcessing(processing: boolean) {
  isProcessing = processing;
  figma.ui.postMessage({ type: processing ? "processing_start" : "processing_end" });
}
const ROW_ACTION_COMPONENT_KEY = "de6d6250b7566cb97aaff74d5e3383e9a5316db9";

// Row Action Components (New)
const ACTION_CHECKBOX_KEY = "5d0f58a93a5ed9d198526fa58e73baf1174cf4f5";
const ACTION_RADIO_KEY = "527424ae4a193ab57ae943d377b9bc7f23891824";
const ACTION_DRAG_KEY = "75003cfee167850ea18191b92cb73918245ac38e";
const ACTION_EXPAND_KEY = "5205f643a92b766838e43cdb9fc98f596053c9f5";
const ACTION_SWITCH_KEY = "8632dbefd9f75a954a6e4f7584ad9f0d43a644a4";
const ACTION_HEADER_KEY = "dcbc04f8242aaf11879a08cc6f8b9bffa5662614";

const TAG_COMPONENT_KEY = "63afa78c2d544c859634166c877d00da5346ed18";
const TAG_COUNTER_COMPONENT_KEY = "76f72d9a460e6f65e823c601d64ac7512fc1f9b2";
const AVATAR_COMPONENT_KEY = "8365ec79313a17f0687ed671a0fde43bc64e8f14";
const MORE_ICON_COMPONENT_KEY = "1a4450f46c58d5dacd02d9cde1450a5edbf493c4";
const EDIT_ICON_COMPONENT_KEY = "53c9064cdbb04581b764c7bfe92ef2862ca6af8d";
const DELETE_ICON_COMPONENT_KEY = "3cf68ee183ff9840dffb8e4ba760dfea519e4a8d";
const ACTION_MORE_ICON_COMPONENT_KEY = "27e130c675fe44532f717656d04b2597eb05a67d";
const INPUT_COMPONENT_KEY = "e1c520fea681ece9994290c63d0b77ad19dbf7fa";
const SELECT_COMPONENT_KEY = "27245acbfd46e812fb383443f0aac88df751fa15";
const STATE_COMPONENT_KEY = "e8ec559c3604ae1e23b354c120d63b481f333527";
const HEADER_ICON_COMPONENT_KEY = "e53fcaef4cf94334b30b019356eaeedde137887b";

const componentCache = new Map<string, ComponentNode | ComponentSetNode>();

let tableSwitchesState = {
  pagination: true,
  filter: true,
  actions: true,
  tabs: false, // Initial state off as requested
  rowHeight: 40 // Default row height
};

function yieldToMain() {
  return new Promise((resolve) => setTimeout(resolve, 20));
}

const PROP_KEYS = HEADER_PROP_KEYS;

const CELL_TYPE_VARIANT_KEYS: Record<string, string> = {
  Text: "Text",
  Tag: "Tag",
  State: "State",
  Avatar: "Avatar",
  Input: "Input",
  Select: "Select",
  ActionIcon: "ActionIcon",
  ActionText: "ActionText"
};

const CELL_TOGGLE_PROP_LABELS: Record<string, string> = {
  text: "Text",
  icon: "Icon",
  state: "State",
  tag: "Tag",
  avatar: "Avatar",
  input: "Input",
  select: "Select",
  check: "Check",
  actionIcon: "ActionIcon",
  actionText: "ActionText",
  description: "Description"
};

function getCellVariantCriteria(type: ColumnType): { [key: string]: string | boolean } {
  // Priority 1: Use predefined config from initialComponents
  const entry = initialComponents.find((c) => c.key === `Cell/${type}`);
  if (entry) {
    const props = entry.config.props as any;
    const toggles = props?.toggles as Record<string, boolean> | undefined;
    if (toggles) {
      const criteria: { [key: string]: string | boolean } = {};
      for (const [toggleKey, enabled] of Object.entries(toggles)) {
        const label = CELL_TOGGLE_PROP_LABELS[toggleKey];
        if (label) criteria[label] = enabled;
      }
      if (Object.keys(criteria).length > 0) return criteria;
    }
  }

  // Priority 2: Use mapping
  const criteria: any = {};
  
  // Define all possible toggles to ensure we disable others
  const allToggles = [
    "Text", "Icon", "State", "Tag", "Avatar", "Input", "Select", "Check", 
    "ActionIcon", "ActionText", "Description",
    "文字", "图标", "状态", "标签", "头像", "输入", "选择", "多选",
    "操作图标", "操作文字", "描述"
  ];

  // Initialize all to False
  allToggles.forEach(t => { criteria[t] = "False"; });

  // Set the target type to True
  if (type === "Avatar") {
    criteria["Avatar"] = "True";
    criteria["头像"] = "True";
    criteria["Text"] = "False";
    criteria["文字"] = "False";
  } else if (type === "Tag") {
    criteria["Tag"] = "True";
    criteria["标签"] = "True";
  } else if (type === "State") {
    criteria["State"] = "True";
    criteria["状态"] = "True";
  } else if (type === "ActionText") {
    criteria["ActionText"] = "True";
    criteria["操作文字"] = "True";
  } else if (type === "ActionIcon") {
    criteria["ActionIcon"] = "True";
    criteria["操作图标"] = "True";
  } else if (type === "Input") {
    criteria["Input"] = "True";
    criteria["输入"] = "True";
  } else if (type === "Select") {
    criteria["Select"] = "True";
    criteria["选择"] = "True";
  } else {
    // Default to Text
    criteria["Text"] = "True";
    criteria["文字"] = "True";
  }

  return criteria;
}

function toHeaderMode(props: { filter: boolean; sort: boolean; search: boolean; info: boolean } | null): HeaderMode | undefined {
  if (!props) return undefined;
  if (props.search) return "search";
  if (props.sort) return "sort";
  if (props.filter) return "filter";
  if (props.info) return "info";
  return "none";
}

async function isFilter(node: SceneNode): Promise<boolean> {
  const p = node.parent;
  const parentName = p ? p.name : "";
  
  const checkKey = async (n: SceneNode): Promise<boolean> => {
    if (n.type !== "INSTANCE") return false;
    const main = await (n as InstanceNode).getMainComponentAsync();
    if (main && main.key === FILTER_COMPONENT_KEY) return true;
    if (main && main.parent && main.parent.type === "COMPONENT_SET" && (main.parent as ComponentSetNode).key === FILTER_COMPONENT_KEY) return true;
    if (main && main.key === FILTER_ITEM_COMPONENT_KEY) return true;
    if (main && main.parent && main.parent.type === "COMPONENT_SET" && (main.parent as ComponentSetNode).key === FILTER_ITEM_COMPONENT_KEY) return true;
    return false;
  };

  if (await checkKey(node)) return true;
  if (p && await checkKey(p as SceneNode)) return true;
  if (p && p.parent && await checkKey(p.parent as SceneNode)) return true;

  return node.name === "Filter" || 
         node.name === "Top Bar Container" || 
         parentName === "Top Bar Container" ||
         parentName === "Filter" ||
         node.name.includes("Filter") ||
         parentName.includes("Filter");
}

function isSmartTableFrame(table: FrameNode): boolean {
  try {
    // console.log("Checking isSmartTableFrame:", table.name, table.type);
    const mark = table.getPluginData("smart_table");
    if (mark && mark.toLowerCase() === "true") return true;
    
    // Check name (case-insensitive and more flexible)
    const name = table.name.toLowerCase();
    // 增加对 "block" 的宽容度，以及常见的表格命名
    if (name.includes("smart table") || name.includes("table") || name.includes("表格")) return true;

    // Check children structure: if it's a horizontal frame and has children
    if (table.layoutMode === "HORIZONTAL" && table.children.length > 0) {
      // If it contains any child with column-like plugin data
      const hasColumnChild = table.children.some(c => {
        if (c.type !== "FRAME") return false;
        const role = c.getPluginData("role");
        const cellType = c.getPluginData("cellType");
        return role === "column" || cellType === "Header" || c.name.toLowerCase().includes("column") || c.name.includes("列");
      });
      if (hasColumnChild) return true;

      // Or if the majority of children are vertical frames (columns)
      const verticalFrames = table.children.filter(c => c.type === "FRAME" && c.layoutMode === "VERTICAL");
      if (verticalFrames.length >= table.children.length / 2 && verticalFrames.length > 0) {
        return true;
      }
    }
  } catch (e) {
    console.warn("Error in isSmartTableFrame:", e);
  }
  return false;
}

function findColumnFrame(node: SceneNode): FrameNode | null {
  let cur: BaseNode | null = node; // Start from node itself
  while (cur) {
    if (cur.type === "FRAME") {
      const f = cur as FrameNode;
      // Column is a vertical frame inside the table (horizontal frame)
      if (f.layoutMode === "VERTICAL" && f.parent && f.parent.type === "FRAME" && f.parent.layoutMode === "HORIZONTAL" && isSmartTableFrame(f.parent as FrameNode)) {
          return f;
      }
    }
    cur = cur.parent;
  }
  return null;
}

function findTableFrameFromNode(node: SceneNode | null): FrameNode | null {
  if (!node || node.removed) return null;
  let cur: BaseNode | null = node;
  while (cur && !cur.removed) {
    if (cur.type === "FRAME") {
      const f = cur as FrameNode;
      // 1. Is this the table itself?
      if (isSmartTableFrame(f)) return f; // 移除了 layoutMode === "HORIZONTAL" 的强制检查，因为 isSmartTableFrame 内部已经有判定了，或者有些表格可能是垂直的？通常表格行是水平的，列是垂直的，但容器可能是水平的（行模式）或垂直的（列模式）。我们的 isSmartTableFrame 假设它是水平容器包含垂直列。但如果用户选中的是一个容器，可能需要更灵活。
      // 不过 isSmartTableFrame 内部确实检查了 layoutMode === "HORIZONTAL" 作为条件之一。
      // 让我们放宽这里的检查，只依赖 isSmartTableFrame 的名字判定部分。
      
      // 2. Is this the container block?
      if (f.layoutMode === "VERTICAL") {
        const childTable = f.children.find(
          (n) =>
            !n.removed &&
            n.type === "FRAME" &&
            (n as FrameNode).layoutMode === "HORIZONTAL" &&
            isSmartTableFrame(n as FrameNode)
        ) as FrameNode | undefined;
        if (childTable) return childTable;
      }
    }
    cur = cur.parent;
  }
  return null;
}

async function getFirstTextValue(node: SceneNode): Promise<string | null> {
  const anyNode = node as any;
  const textNodes: TextNode[] =
    typeof anyNode.findAll === "function" ? (anyNode.findAll((n: SceneNode) => n.type === "TEXT") as TextNode[]) : [];
  const t = textNodes[0];
  if (!t) return null;
  return t.characters;
}

async function getTableContext(table: FrameNode): Promise<TableContext | null> {
  const columns = table.children.filter((n) => n.type === "FRAME") as FrameNode[];
  const cols = columns.length;
  if (cols === 0) return null;

  const firstCol = columns[0];
  if (firstCol.layoutMode !== "VERTICAL") return null;

  const firstChild = firstCol.children[0];
  const hasHeader = Boolean(firstChild && (firstChild.type === "INSTANCE" || firstChild.type === "FRAME") && isHeaderNode(firstChild));
  const rows = Math.max(0, firstCol.children.length - (hasHeader ? 1 : 0));
  const headers: string[] = [];
  for (let c = 0; c < cols; c++) {
    const col = columns[c];
    const headerNode = hasHeader ? col.children[0] : null;
    if (headerNode && (headerNode.type === "INSTANCE" || headerNode.type === "FRAME")) {
      const text = await getFirstTextValue(headerNode);
      headers.push(text ?? "");
    } else {
      headers.push("");
    }
  }

  const rowAction = await getRowAction(table) as any;
  const config = await getTableConfig(table);

  // Extract Data
  const data: string[][] = [];
  for (let r = 0; r < rows; r++) {
    const rowData: string[] = [];
    for (let c = 0; c < cols; c++) {
      const col = columns[c];
      const offset = hasHeader ? 1 : 0;
      const cellNode = col.children[offset + r];
      if (cellNode) {
        const text = await getFirstTextValue(cellNode);
        rowData.push(text ?? "");
      } else {
        rowData.push("");
      }
    }
    data.push(rowData);
  }

  return { rows, cols, headers, data, rowAction, config };
}

async function getTableConfig(table: FrameNode): Promise<TableAuxConfig | undefined> {
  const container = table.parent;
  if (!container || container.type !== "FRAME") return undefined;

  const topBar = container.children.find((c) => c.name === "Top Bar Container") as FrameNode | undefined;
  if (!topBar) return undefined;

  const config: TableAuxConfig = {};

  // Tabs
  const tabsInst = topBar.children.find((c) => c.name === "Tabs" && c.type === "INSTANCE" && c.visible) as InstanceNode | undefined;
  if (tabsInst) {
    const textNodes = tabsInst.findAll((n) => n.type === "TEXT") as TextNode[];
    if (textNodes.length > 0) {
      config.tabs = textNodes.map((t) => ({ label: t.characters }));
    }
  }

  // Filter
  const filterInst = topBar.children.find((c) => c.name === "Filter" && c.type === "INSTANCE" && c.visible) as InstanceNode | undefined;
  if (filterInst) {
    const items: { label: string; type: "select" | "input" | "search" }[] = [];
    const allInstances = filterInst.findAll(n => n.type === "INSTANCE") as InstanceNode[];
    const itemNodes: InstanceNode[] = [];
    for (const n of allInstances) {
      const main = await n.getMainComponentAsync();
      if (main?.key === FILTER_ITEM_COMPONENT_KEY) {
        itemNodes.push(n);
      }
    }
    for (const item of itemNodes) {
      const textNode = item.findOne((n) => n.type === "TEXT") as TextNode;
      if (textNode) {
        items.push({ label: textNode.characters, type: "select" });
      }
    }
    if (items.length > 0) config.filters = items;
  }

  // Buttons
  const buttonsInst = topBar.children.find((c) => c.name === "Actions" && c.type === "INSTANCE" && c.visible) as InstanceNode | undefined;
  if (buttonsInst) {
    const btns: { label: string; type: "primary" | "secondary" | "outline" | "text" }[] = [];
    // Only find text nodes that are actually part of buttons
    const textNodes = buttonsInst.findAll((n) => n.type === "TEXT") as TextNode[];
    for (const t of textNodes) {
      btns.push({ label: t.characters, type: "secondary" });
    }
    if (btns.length > 0) config.buttons = btns;
  }

  return Object.keys(config).length > 0 ? config : undefined;
}

function getBooleanPropValue(node: InstanceNode, keys: string[]): boolean {
  const componentProperties = node.componentProperties;
  for (const key of keys) {
    if (key in componentProperties) {
      const value = componentProperties[key].value;
      if (typeof value === "boolean") return value;
      if (typeof value === "string") {
        if (value.toLowerCase() === "true") return true;
        if (value.toLowerCase() === "false") return false;
      }
    }
  }
  // 如果没找到完全匹配，尝试部分匹配
  for (const propName in componentProperties) {
    if (keys.some((k) => propName.includes(k))) {
      const value = componentProperties[propName].value;
      if (typeof value === "boolean") return value;
      if (typeof value === "string") {
        if (value.toLowerCase() === "true") return true;
        if (value.toLowerCase() === "false") return false;
      }
    }
  }
  return false;
}

async function getTableSize(table: FrameNode): Promise<"mini" | "default" | "medium" | "large"> {
  const cols = getColumnFrames(table);
  if (cols.length === 0) return "default";
  const col = cols[0];
  const offset = await getHeaderOffset(col);
  const cell = col.children[offset];
  if (!cell) return "default";
  const h = cell.height;
  if (h < 36) return "mini";
  if (h < 44) return "default";
  if (h < 52) return "medium";
  return "large";
}

async function getRowAction(table: FrameNode): Promise<"none" | "multiple" | "single" | "drag" | "expand" | "switch"> {
  const cols = getColumnFrames(table);
  if (cols.length === 0) return "none";

  // Check the first column to see if it's really an action column
  const firstCol = cols[0];
  const isActionCol = firstCol.getPluginData("isRowActionColumn") === "true";
  
  // If it's marked as action column, trust the plugin data
  if (isActionCol) {
    const type = firstCol.getPluginData("rowActionType");
    if (type && type !== "none") return type as any;
  }

  // Fallback: 优先从 Table Plugin Data 读取，但要验证第一列是否可能包含操作
  try {
    const savedAction = table.getPluginData("rowActionType");
    if (savedAction && savedAction !== "none") {
      // 验证第一列是否有实例，防止误判
      const offset = await getHeaderOffset(firstCol);
      const cell = firstCol.children[offset];
      if (cell) return savedAction as any;
    }
  } catch {}

  const offset = await getHeaderOffset(firstCol);
  const cell = firstCol.children[offset];
  if (!cell) return "none";
  
  // 简单判定：检查单元格是否有特定的 Variant 或名称
  // 这里假设第一列如果是操作列，所有单元格都是一致的
  if (cell.type === "INSTANCE") {
    const props = getVariantProps(cell as InstanceNode);
    if (props) {
       // 检查 Checkbox
       if (props["Checkbox"] === "True" || props["checked"] !== undefined || props["Checked 已选"] !== undefined || cell.getPluginData("isRowActionColumn") === "true") {
           // 如果有 Plugin Data 标记，直接信任它
           const type = cell.getPluginData("rowActionType");
           if (type) return type as any;
           return "multiple";
       }
       if (props["Radio"] === "True" || props["selected"] !== undefined) return "single";
       if (props["Switch"] === "True" || props["on"] !== undefined) return "switch";
    }
    // 检查 Name
    const name = cell.name.toLowerCase();
    if (name.includes("checkbox")) return "multiple";
    if (name.includes("radio")) return "single";
    if (name.includes("switch")) return "switch";
    if (name.includes("drag")) return "drag";
    if (name.includes("expand") || name.includes("chevron") || name.includes("arrow")) return "expand";
  }
  return "none";
}

async function getTableSwitches(table: FrameNode): Promise<{ pagination: boolean; filter: boolean; actions: boolean; tabs: boolean }> {
  // 优先从 Plugin Data 读取
  try {
    const p = table.getPluginData("switch_pagination");
    const f = table.getPluginData("switch_filter");
    const a = table.getPluginData("switch_actions");
    const t = table.getPluginData("switch_tabs");
    
    // 如果有任一数据，说明该表格已保存配置，优先返回
    if (p || f || a || t) {
      return {
        pagination: p === "true",
        filter: f === "true",
        actions: a === "true",
        tabs: t === "true"
      };
    }
  } catch {}

  const container = table.parent;
  if (!container || container.type !== "FRAME") return { pagination: false, filter: false, actions: false, tabs: false };
  
  let pagination = false;
  let filter = false;
  let actions = false;
  let tabs = false;

  // 检查分页器
  let pager: SceneNode | undefined;
  for (const c of container.children) {
    if (c.name.includes("Pagination")) {
      pager = c;
      break;
    }
    if (c.type === "INSTANCE") {
      const main = await (c as InstanceNode).getMainComponentAsync();
      if (main?.key === PAGINATION_COMPONENT_KEY || (main?.parent?.type === "COMPONENT_SET" && (main.parent as ComponentSetNode).key === PAGINATION_COMPONENT_KEY)) {
        pager = c;
        break;
      }
    }
  }
  if (pager && pager.visible) pagination = true;

  // 检查 Top Bar (Filter, Actions, Tabs)
  const topBar = container.children.find(c => c.name === "Top Bar Container");
  
  if (topBar && topBar.type === "FRAME") {
     const findVisible = (name: string) => {
          const node = topBar.children.find(c => c.name === name);
          return node ? node.visible : false;
     };
     
     tabs = findVisible("Tabs");
     
     // Filter logic: Check visibility AND Quantity variant
     const filterNode = topBar.children.find(c => c.name === "Filter");
     if (filterNode && filterNode.visible) {
         if (filterNode.type === "INSTANCE") {
             const props = filterNode.componentProperties;
             const key = Object.keys(props).find(k => k.includes("数量"));
             if (key) {
                 const val = props[key].value;
                 // If Quantity is "0", treat as OFF
                 filter = val !== "0";
             } else {
                 filter = true;
             }
         } else {
             filter = true;
         }
     } else {
         filter = false;
     }

     actions = findVisible("Actions");
  }

  return { pagination, filter, actions, tabs };
}

function getColumnWidthMode(col: FrameNode): "FIXED" | "FILL" {
  return col.layoutSizingHorizontal === "FILL" ? "FILL" : "FIXED";
}

async function getCellType(cell: SceneNode): Promise<string | undefined> {
  // Check for Custom Frame types
  const customCellType = cell.getPluginData("cellType");
  if (cell.type === "FRAME" && customCellType) {
    return customCellType;
  }

  if (cell.type !== "INSTANCE") return undefined;

  const main = await (cell as InstanceNode).getMainComponentAsync();
  if (main) {
      const parentSet = main.parent && main.parent.type === "COMPONENT_SET" ? main.parent as ComponentSetNode : null;
      const key = main.key;
      const setKey = parentSet?.key;

      if (key === TAG_COMPONENT_KEY || setKey === TAG_COMPONENT_KEY) return "Tag";
      if (key === AVATAR_COMPONENT_KEY || setKey === AVATAR_COMPONENT_KEY) return "Avatar";
      if (key === INPUT_COMPONENT_KEY || setKey === INPUT_COMPONENT_KEY) return "Input";
      if (key === SELECT_COMPONENT_KEY || setKey === SELECT_COMPONENT_KEY) return "Select";
      if (key === MORE_ICON_COMPONENT_KEY || setKey === MORE_ICON_COMPONENT_KEY) return "ActionText";
  }

  const props = getVariantProps(cell as InstanceNode);
  if (!props) return undefined;

  for (const [type, label] of Object.entries(CELL_TYPE_VARIANT_KEYS)) {
    const key = Object.keys(props).find(k => label.includes(k) || k.includes(label) || k === label || k === type);
    if (key && (props[key] === "True" || props[key] === "true")) {
      return type;
    }
    
    // Check values (Dropdown Selector)
    const valMatch = Object.values(props).some(v => v === label || v === type || (typeof v === 'string' && (v.startsWith(label) || v.startsWith(type))));
    if (valMatch) {
       return type;
    }
  }
  
  // Also check toggles
  for (const [toggleKey, label] of Object.entries(CELL_TOGGLE_PROP_LABELS)) {
     // Map toggle key to type name if possible (e.g. text -> Text)
     const typeName = toggleKey.charAt(0).toUpperCase() + toggleKey.slice(1);
     const key = Object.keys(props).find(k => label.includes(k) || k.includes(label) || k === label);
     if (key && (props[key] === "True" || props[key] === "true")) {
        return typeName;
     }
  }

  return "Text"; // Default
}

function getCellAlignment(cell: SceneNode): "left" | "center" | "right" | undefined {
  if (cell.type === "FRAME") {
    // Check if it's a Text cell with Plugin Data for align
    const customCellType = cell.getPluginData("cellType");
    if (customCellType === "Text") {
        const align = cell.primaryAxisAlignItems;
        if (align === "MIN") return "left";
        if (align === "CENTER") return "center";
        if (align === "MAX") return "right";
    }

    const align = cell.primaryAxisAlignItems;
    if (align === "MIN") return "left";
    if (align === "CENTER") return "center";
    if (align === "MAX") return "right";
    return "left"; // Default for our tag frames
  }
  if (cell.type !== "INSTANCE") return undefined;
  const props = (cell as InstanceNode).componentProperties;
  const key = Object.keys(props).find((k) => k.toLowerCase().includes("align") || k.includes("排列方式"));
  if (!key) return undefined;
  
  const val = props[key].value;
  if (typeof val !== "string") return undefined;
  
  const v = val.toLowerCase();
  if (v.includes("left") || v.includes("左")) return "left";
  if (v.includes("center") || v.includes("中")) return "center";
  if (v.includes("right") || v.includes("右")) return "right";
  
  return undefined;
}

/**
 * Syncs table-level metadata (rowCount, UI component visibility) to plugin data
 */
async function syncTableMetadata(table: FrameNode) {
  const columns = getColumnFrames(table);
  if (columns.length === 0) return;

  // 1. Update row count
  const offset = await getHeaderOffset(columns[0]);
  const rowCount = Math.max(0, columns[0].children.length - offset);
  table.setPluginData("rowCount", rowCount.toString());

  // 2. Update UI components status
  const container = table.parent;
  if (container && container.type === "FRAME") {
    const topBar = container.children.find(c => c.name === "Top Bar Container") as FrameNode | undefined;
    if (topBar) {
      const hasTabs = topBar.children.some(c => c.name === "Tabs" && c.visible);
      const hasFilter = topBar.children.some(c => c.name === "Filter" && c.visible);
      const hasActions = topBar.children.some(c => c.name === "Actions" && c.visible);
      
      table.setPluginData("hasTabs", hasTabs ? "true" : "false");
      table.setPluginData("hasFilter", hasFilter ? "true" : "false");
      table.setPluginData("hasActions", hasActions ? "true" : "false");
    }

    const hasPagination = container.children.some(c => (c.name.includes("Pagination") || c.name === "Pagination") && c.visible);
    table.setPluginData("hasPagination", hasPagination ? "true" : "false");
  }
}

async function postSelection() {
  try {
    if (typeof figma.ui === "undefined" || !figma.ui) return;
    const selection = figma.currentPage.selection;
  console.log("[Debug] Selection updated:", selection.length, selection.map(n => ({ type: n.type, name: n.name })));
  
  let componentKey: string | undefined;
  let headerProps: { filter: boolean; sort: boolean; search: boolean; info: boolean } | null = { filter: false, sort: false, search: false, info: false };
  let tableContext: TableContext | null = null;
  let selectionKind: "table" | "column" | "cell" | "filter" | "button_group" | "tabs" | "pagination" | undefined;
  let selectionLabel: string | undefined;
  let selectionCell: { row: number; col: number } | undefined;
  let selectionColumn: number | undefined;
  let activeTableFrame: FrameNode | null = null;
  let pluginData: Record<string, string> = {};

  if (selection.length === 1) {
    const node = selection[0];
    
    // Extract all plugin data keys we care about
    const dataKeys = [
      "cellType", "cellValue", "columnId", "tableId", "role", "textDisplayMode",
      "headerType", "headerValue", "textAlign", "rowCount", 
      "hasTabs", "hasFilter", "hasActions", "hasPagination"
    ]; 
    for (const key of dataKeys) {
      const val = node.getPluginData(key);
      if (val) pluginData[key] = val;
    }

    if (node.type === "COMPONENT" || node.type === "COMPONENT_SET") {
      componentKey = node.key;
    } else if (node.type === "INSTANCE") {
      const main = await (node as InstanceNode).getMainComponentAsync();
      if (main) {
        componentKey = main.key;
      }
    }

    if (await isFilter(node)) {
      selectionLabel = "当前选中：筛选器";
      selectionKind = "filter";
    }

    // Identify other components by key
    if (componentKey === BUTTON_GROUP_COMPONENT_KEY) {
      selectionLabel = "当前选中：按钮组";
      selectionKind = "button_group";
    } else if (componentKey === TABS_COMPONENT_KEY) {
      selectionLabel = "当前选中：页签";
      selectionKind = "tabs";
    } else if (componentKey === PAGINATION_COMPONENT_KEY) {
      selectionLabel = "当前选中：分页器";
      selectionKind = "pagination";
    }

    // 尝试识别表头
    // 逻辑：如果选中了表格中的某个东西（Cell 或 Column），找到其所在的 Column，
    // 然后看 Column 的第一个子节点是否是表头实例。
    let columnFrame: FrameNode | null = null;
    
    // 情况1: 选中了 Column 本身
    if (
      node.type === "FRAME" &&
      node.layoutMode === "VERTICAL" &&
      node.parent?.type === "FRAME" &&
      node.parent.layoutMode === "HORIZONTAL" &&
      isSmartTableFrame(node.parent as FrameNode)
    ) {
      columnFrame = node as FrameNode;
    }
    // 情况2: 选中了 Cell (Instance)
    else if (
      node.parent?.type === "FRAME" &&
      node.parent.layoutMode === "VERTICAL" &&
      node.parent.parent?.type === "FRAME" &&
      node.parent.parent.layoutMode === "HORIZONTAL" &&
      isSmartTableFrame(node.parent.parent as FrameNode)
    ) {
      columnFrame = node.parent as FrameNode;
    }

    const tableFrame = findTableFrameFromNode(node as any);
    
    // 如果没有找到 tableFrame，尝试更激进的查找：
    // 检查当前节点是否就是表格，或者其父级是表格（不依赖 findTableFrameFromNode 的递归）
    if (!tableFrame) {
      if (node.type === "FRAME" && isSmartTableFrame(node as FrameNode)) {
        // 这里不能直接赋值给 tableFrame 因为它是 const，
        // 但我们可以重新调用 findTableFrameFromNode 或者修改逻辑。
        // 为了简单，我们在这里手动设置 activeTableFrame 并继续流程，
        // 或者我们修改 findTableFrameFromNode 让它更强大。
        // 既然用户说读不到 result，说明 tableFrame 是 null。
      }
    }

    if (tableFrame) {
      activeTableFrame = tableFrame;
      await syncTableMetadata(tableFrame); // Sync metadata on selection
      
      // Pull table-level metadata into pluginData
      const tableKeys = ["rowCount", "hasTabs", "hasFilter", "hasActions", "hasPagination"];
      for (const key of tableKeys) {
        const val = tableFrame.getPluginData(key);
        if (val) pluginData[key] = val;
      }

      const columns = getColumnFrames(tableFrame);
      const ctx = await getTableContext(tableFrame);
      tableContext = ctx;
      const pos = await computeTableSelectionPosition(tableFrame, node as SceneNode);
      
      // Special handling for Row Action Column (Checkbox/Radio etc.)
      // User request: When selecting this column, show table-level info instead of column/cell info
      if (pos.kind === "column" || pos.kind === "cell") {
          const columns = getColumnFrames(tableFrame);
          if (typeof pos.columnIndex === "number" && columns[pos.columnIndex]) {
             const col = columns[pos.columnIndex];
             if (col.getPluginData("isRowActionColumn") === "true") {
                 selectionKind = "table";
                 selectionLabel = "当前选中：操作列"; 
             }
          }
      }
      
      // Only set selectionKind/Label if not already set by isFilter or above override
      if (!selectionKind) {
        selectionKind = pos.kind;
      }
      
      let colWidthMode: "FIXED" | "FILL" | undefined;
      let cellType: string | undefined;
      let cellAlign: "left" | "center" | "right" | undefined;

      if (!selectionKind) {
        // 如果我们找到了 tableFrame，但 computeTableSelectionPosition 没返回 kind，
        // 说明选中的可能是表格内的其他装饰元素，或者表格本身。
        // 这里做一个兜底：如果是表格本身或其直接子元素（非列），也视为选中表格
        selectionKind = "table";
        if (!selectionLabel) selectionLabel = "当前选中：表格";
      } else if (selectionKind === "table") {
        if (!selectionLabel) selectionLabel = "当前选中：表格";
      } else if (selectionKind === "column" && typeof pos.columnIndex === "number") {
        selectionColumn = pos.columnIndex;
        const headerTitle = tableContext?.headers?.[pos.columnIndex] ?? "";
        const colLabel = headerTitle && headerTitle.trim().length > 0 ? headerTitle.trim() : `第 ${pos.columnIndex + 1} 列`;
        selectionLabel = `当前选中：列 - ${colLabel}`;
        const colFrame = columns[pos.columnIndex];
        if (colFrame) {
          colFrame.name = colLabel;
          
          // Prefer plugin data for colWidthMode, fallback to layout detection
          const savedColWidthMode = colFrame.getPluginData("colWidthMode");
          if (savedColWidthMode === "FIXED" || savedColWidthMode === "FILL" || savedColWidthMode === "HUG") {
            colWidthMode = savedColWidthMode as any;
          } else {
            colWidthMode = getColumnWidthMode(colFrame);
          }

          // Collect column-level metadata
          const colKeys = ["headerType", "headerValue", "textAlign", "cellType", "colWidthMode"];
          for (const key of colKeys) {
            const val = colFrame.getPluginData(key);
            if (val) pluginData[key] = val;
          }

          // If headerType/headerValue missing on column, check the header cell
          const offset = await getHeaderOffset(colFrame);
          if (offset > 0) {
            const headerCell = colFrame.children[0];
            if (!pluginData["headerType"]) {
              const hType = headerCell.getPluginData("headerType");
              if (hType) pluginData["headerType"] = hType;
            }
            if (!pluginData["headerValue"]) {
              const hValue = headerCell.getPluginData("headerValue");
              if (hValue) pluginData["headerValue"] = hValue;
            }
          }

          // Get first cell to guess type/align? Or average?
          // Usually check first body cell
          if (colFrame.children.length > offset) {
              const cell = colFrame.children[offset];
              cellType = await getCellType(cell);
              cellAlign = getCellAlignment(cell);

              // Proactively sync cellValue to Column for Dev Mode visibility
              let currentText = extractTextFromNode(cell, true);
              if (cellType === "ActionIcon" && (!currentText || currentText.trim() === "")) {
                currentText = "编辑 删除 …";
              }

              if (currentText) {
                colFrame.setPluginData("cellValue", currentText);
                pluginData["cellValue"] = currentText;
              }

              if (cellType === "Tag" && !componentKey) {
                  componentKey = TAG_COMPONENT_KEY;
              } else if (cellType === "Avatar" && !componentKey) {
                  componentKey = AVATAR_COMPONENT_KEY;
              } else if ((cellType === "ActionText" || cellType === "ActionIcon") && !componentKey) {
                  componentKey = ACTION_MORE_ICON_COMPONENT_KEY;
              }
          }
        }
      } else if (
        pos.kind === "cell" &&
        typeof pos.columnIndex === "number" &&
        typeof pos.rowIndex === "number"
      ) {
        selectionCell = { row: pos.rowIndex, col: pos.columnIndex };
        const headerTitle = tableContext?.headers?.[pos.columnIndex] ?? "";
        const colLabel = headerTitle && headerTitle.trim().length > 0 ? headerTitle.trim() : `第 ${pos.columnIndex + 1} 列`;
        const indexDisplay = pos.rowIndex + 1;
        selectionLabel = `当前选中：单元格 - ${colLabel}-${indexDisplay}`;
        const colFrame = columns[pos.columnIndex];
        if (colFrame) {
          const offset = await getHeaderOffset(colFrame);
          
          // Prefer plugin data for colWidthMode, fallback to layout detection
          const savedColWidthMode = colFrame.getPluginData("colWidthMode");
          if (savedColWidthMode === "FIXED" || savedColWidthMode === "FILL" || savedColWidthMode === "HUG") {
            colWidthMode = savedColWidthMode as any;
          } else {
            colWidthMode = getColumnWidthMode(colFrame);
          }

          // Collect column-level metadata for context
          const colKeys = ["headerType", "headerValue", "textAlign", "colWidthMode"];
          for (const key of colKeys) {
            const val = colFrame.getPluginData(key);
            if (val && !pluginData[key]) pluginData[key] = val;
          }
          
          if (offset > 0) {
            const headerCell = colFrame.children[0];
            if (!pluginData["headerType"]) pluginData["headerType"] = headerCell.getPluginData("headerType");
            if (!pluginData["headerValue"]) pluginData["headerValue"] = headerCell.getPluginData("headerValue");
          }

          const cellNode = colFrame.children[offset + pos.rowIndex];
          if (cellNode) {
            cellNode.name = `${colLabel}-${indexDisplay}`;
            cellType = await getCellType(cellNode);
            cellAlign = getCellAlignment(cellNode);

            const textDisplayMode = cellNode.getPluginData("textDisplayMode");
            if (textDisplayMode) pluginData["textDisplayMode"] = textDisplayMode;

            // Proactively sync cellValue to Plugin Data for Dev Mode visibility
            let currentText = extractTextFromNode(cellNode, true);
            if (cellType === "ActionIcon" && (!currentText || currentText.trim() === "")) {
                currentText = "编辑 删除 …";
            }

            if (currentText) {
                cellNode.setPluginData("cellValue", currentText);
                pluginData["cellValue"] = currentText;
            }
            
            // Also set on the actually selected node (which might be a child) for direct visibility in Dev Mode
            const finalValue = pluginData["cellValue"] || currentText;
            if (node !== cellNode && "setPluginData" in node && finalValue) {
              (node as any).setPluginData("cellValue", finalValue);
            }
            
            if (finalValue) pluginData["cellValue"] = finalValue;

            // If it's a tag/avatar cell (Frame), we might want to pretend it has the correct component key
            if (cellType === "Tag" && !componentKey) {
              componentKey = TAG_COMPONENT_KEY;
            } else if (cellType === "Avatar" && !componentKey) {
              componentKey = AVATAR_COMPONENT_KEY;
            } else if ((cellType === "ActionText" || cellType === "ActionIcon") && !componentKey) {
              componentKey = MORE_ICON_COMPONENT_KEY;
            }
          }
        }
      }
      figma.ui.postMessage({
        type: "selection",
        count: selection.length,
        componentKey,
        headerMode: toHeaderMode(headerProps),
        tableContext: tableContext ?? undefined,
        isSmartTable: isSmartTableFrame(tableFrame),
        selectionKind,
        selectionLabel,
        selectionCell,
        selectionColumn,
        tableSize: activeTableFrame ? await getTableSize(activeTableFrame) : undefined,
        rowAction: activeTableFrame ? await getRowAction(activeTableFrame) : undefined,
        tableSwitches: activeTableFrame ? await getTableSwitches(activeTableFrame) : undefined,
        colWidthMode,
        cellType,
        cellAlign,
        pluginData
      });
      return;
    }

    if (columnFrame && columnFrame.children.length > 0) {
      const firstChild = columnFrame.children[0];
      if (firstChild.type === "INSTANCE") {
          const main = await (firstChild as InstanceNode).getMainComponentAsync();
          // 这里我们可以校验 Key，也可以宽松点，只要有对应的属性就认为是表头
          // main.parent 可能是 ComponentSetNode，它也有 key
          let isHeader = false;
          if (main) {
            if (main.key === HEADER_COMPONENT_KEY) {
              isHeader = true;
            } else if (main.parent && main.parent.type === "COMPONENT_SET") {
               // 如果 HEADER_COMPONENT_KEY 是 Set 的 Key
               if ((main.parent as ComponentSetNode).key === HEADER_COMPONENT_KEY) {
                 isHeader = true;
               } else {
                 // 如果 HEADER_COMPONENT_KEY 是某个 Variant 的 Key，
                 // 那么我们检查这个 Set 下是否包含该 Key 的 Variant
                 if ((main.parent as ComponentSetNode).children.some(child => (child.type === "COMPONENT" || child.type === "COMPONENT_SET") && child.key === HEADER_COMPONENT_KEY)) {
                   isHeader = true;
                 }
               }
            }
          }

          if (isHeader) {
            headerProps = {
              filter: getBooleanPropValue(firstChild as InstanceNode, PROP_KEYS.filter),
              sort: getBooleanPropValue(firstChild as InstanceNode, PROP_KEYS.sort),
              search: getBooleanPropValue(firstChild as InstanceNode, PROP_KEYS.search),
              info: getBooleanPropValue(firstChild as InstanceNode, PROP_KEYS.info)
            };
          }
        }
    }
  }

  figma.ui.postMessage({
    type: "selection",
    count: selection.length,
    componentKey,
    headerMode: toHeaderMode(headerProps),
    tableContext: tableContext ?? undefined,
    selectionKind,
    selectionLabel,
    selectionCell,
    selectionColumn,
    tableSize: activeTableFrame ? await getTableSize(activeTableFrame) : undefined,
    rowAction: activeTableFrame ? await getRowAction(activeTableFrame) : undefined,
    tableSwitches: activeTableFrame ? await getTableSwitches(activeTableFrame) : undefined,
    pluginData
  });
  } catch (e) {
    console.warn("postSelection error ignored:", e);
  }
}

function postError(message: string) {
  if (figma.ui) figma.ui.postMessage({ type: "error", message });
}

function postStatus(message: string) {
  if (figma.ui) figma.ui.postMessage({ type: "status", message });
}

async function loadTextNodeFonts(node: TextNode, style: string = "Regular") {
  const family = TOKENS.typography.fontFamily;
  const primaryFont: FontName = { family, style };
  const altFamily = "PingFangSC"; // Alternative name for some environments
  const altFont: FontName = { family: altFamily, style };
  const fallbackFont: FontName = { family: "Inter", style: style === "Medium" || style === "Bold" ? "Medium" : "Regular" };

  try {
    // 1. Try PingFang SC
    await figma.loadFontAsync(primaryFont);
    node.fontName = primaryFont;
  } catch (e) {
    try {
      // 2. Try alternative PingFangSC
      await figma.loadFontAsync(altFont);
      node.fontName = altFont;
    } catch (e2) {
      // 3. Final Fallback to Inter
      console.warn(`Failed to load PingFang SC (${style}), falling back to Inter:`, e2);
      await figma.loadFontAsync(fallbackFont);
      node.fontName = fallbackFont;
    }
  }

  // Always apply standard typography after loading font
  applyStandardTypography(node);
}

/**
 * Applies standard typography (line height, letter spacing) to a text node
 */
function applyStandardTypography(node: TextNode) {
  node.lineHeight = { value: TOKENS.typography.lineHeight, unit: "PIXELS" };
  node.letterSpacing = { value: TOKENS.typography.letterSpacing, unit: "PERCENT" };
}

async function setFirstText(node: SceneNode, value: string) {
  const anyNode = node as any;
  
  let t: TextNode | null = null;
  
  // If it's a frame (like our custom Avatar/Tag cells), try to find a direct child text node first
  // This is more reliable than findAll which might find text nodes inside nested instances (like avatar initials)
  if (node.type === "FRAME") {
    t = node.children.find(c => c.type === "TEXT") as TextNode;
  }
  
  if (!t) {
    const textNodes: TextNode[] =
      typeof anyNode.findAll === "function" ? (anyNode.findAll((n: SceneNode) => n.type === "TEXT") as TextNode[]) : [];
    t = textNodes[0];
  }

  if (!t) return false;
  await loadTextNodeFonts(t);
  try {
    t.characters = value;
    return true;
  } catch {
    return false;
  }
}



function headerPropsFromMode(mode: HeaderMode): { filter: boolean; sort: boolean; search: boolean; info: boolean } {
  if (mode === "filter") return { filter: true, sort: false, search: false, info: false };
  if (mode === "sort") return { filter: false, sort: true, search: false, info: false };
  if (mode === "search") return { filter: false, sort: false, search: true, info: false };
  if (mode === "info") return { filter: false, sort: false, search: false, info: true };
  return { filter: false, sort: false, search: false, info: false };
}

async function applyHeaderModeToInstance(instance: InstanceNode, mode: HeaderMode) {
  const { filter, sort, search, info } = headerPropsFromMode(mode);
  const currentProps = instance.componentProperties;
  const newProps: any = {};

  const setProp = (uiKey: string, val: boolean) => {
    const key = Object.keys(currentProps).find((k) => k.toLowerCase().includes(uiKey));
    if (!key) return;
    const currentVal = currentProps[key].value;
    if (typeof currentVal === "boolean") {
      newProps[key] = val;
    } else if (typeof currentVal === "string") {
      newProps[key] = val ? "True" : "False";
    }
  };

  setProp("filter", filter);
  setProp("sort", sort);
  setProp("search", search);
  setProp("info", info);
  
  // Always ensure header is left aligned as per user request
  const alignKey = Object.keys(currentProps).find(k => k.toLowerCase().includes("align") || k.includes("排列方式"));
  if (alignKey) {
    const alignVal = currentProps[alignKey].value;
    if (alignVal !== "Left 左") {
      newProps[alignKey] = "Left 左";
    }
  }

  if (Object.keys(newProps).length > 0) {
    instance.setProperties(newProps);
  }
  
  // Requirement: Save header type in instance plugin data
  instance.setPluginData("headerType", mode);

  // Requirement: Preserve headerValue text
  let headerValue = instance.getPluginData("headerValue");
  if (!headerValue) {
    // If no headerValue in plugin data, extract from current text
    headerValue = extractTextFromNode(instance);
    if (headerValue) {
      instance.setPluginData("headerValue", headerValue);
    }
  }

  if (headerValue) {
    const textNode = instance.findOne(c => c.type === "TEXT") as TextNode;
    if (textNode) {
      await loadTextNodeFonts(textNode);
      textNode.characters = headerValue;
    }
  }
}

function getColumnFrames(table: FrameNode): FrameNode[] {
  try {
    if (!table || table.removed) return [];
    return table.children.filter((n) => !n.removed && n.type === "FRAME") as FrameNode[];
  } catch (e) {
    return [];
  }
}

async function getHeaderOffset(col: FrameNode): Promise<number> {
  try {
    if (!col || col.removed) return 0;
    const first = col.children[0];
    if (first && !first.removed && (first.type === "INSTANCE" || first.type === "FRAME") && isHeaderNode(first)) return 1;
  } catch (e) {
    return 0;
  }
  return 0;
}

async function computeTableSelectionPosition(
  table: FrameNode,
  node: SceneNode
): Promise<{ kind?: "table" | "column" | "cell"; columnIndex?: number; rowIndex?: number }> {
  if (node === table) {
    return { kind: "table" };
  }
  const columns = getColumnFrames(table);
  let columnFrame: FrameNode | null = null;
  let cur: BaseNode | null = node;
  while (cur && cur !== table) {
    if (cur.parent === table && cur.type === "FRAME" && (cur as FrameNode).layoutMode === "VERTICAL") {
      columnFrame = cur as FrameNode;
      break;
    }
    cur = cur.parent;
  }
  if (!columnFrame) return {};
  const columnIndex = columns.indexOf(columnFrame);
  if (columnIndex < 0) return {};
  if (node === columnFrame) {
    return { kind: "column", columnIndex };
  }
  let cellNode: SceneNode | null = null;
  cur = node;
  while (cur && cur !== columnFrame) {
    if (cur.parent === columnFrame && cur.type !== "GROUP") {
      cellNode = cur as SceneNode;
      break;
    }
    cur = cur.parent;
  }
  if (!cellNode) {
    return { kind: "column", columnIndex };
  }
  const offset = await getHeaderOffset(columnFrame);
  const indexInCol = columnFrame.children.indexOf(cellNode);
  if (indexInCol < 0) {
    return { kind: "column", columnIndex };
  }
  if (indexInCol < offset) {
    return { kind: "column", columnIndex };
  }
  const rowIndex = indexInCol - offset;
  return { kind: "cell", columnIndex, rowIndex };
}

async function applyHeaderModeToColumn(table: FrameNode, colIndex: number, mode: HeaderMode) {
  const cols = getColumnFrames(table);
  const col = cols[colIndex];
  if (!col) return;
  const first = col.children[0];
  if (!first) return;

  if (first.type === "INSTANCE" && await isHeaderInstance(first as InstanceNode)) {
    await applyHeaderModeToInstance(first as InstanceNode, mode);
    // Save header type and value in column plugin data
    col.setPluginData("headerType", mode);
    const headerValue = (first as InstanceNode).getPluginData("headerValue");
    if (headerValue) {
      col.setPluginData("headerValue", headerValue);
    }
  } else if (first.type === "FRAME" && first.getPluginData("cellType") === "Header") {
    const headerFrame = first as FrameNode;
    // Prefer headerValue from plugin data, fallback to extraction
    const headerText = headerFrame.getPluginData("headerValue") || extractTextFromNode(headerFrame);
    const { component: iconComponent } = await resolveCellFactory(HEADER_ICON_COMPONENT_KEY);
    
    const { filter, sort, search, info } = headerPropsFromMode(mode);
    
    let iconType: "Filter" | "Sort" | "Search" | "Info" | undefined;
    if (filter) iconType = "Filter";
    else if (sort) iconType = "Sort";
    else if (search) iconType = "Search";
    else if (info) iconType = "Info";
    
    await renderHeaderCell(headerFrame, headerText, { iconType, iconComponent });
    
    // Requirement: Save header type in cell and column plugin data
    headerFrame.setPluginData("headerType", mode);
    col.setPluginData("headerType", mode);
    headerFrame.setPluginData("headerValue", headerText);
    col.setPluginData("headerValue", headerText);
  }
}

async function applyHeaderModeToTable(table: FrameNode, mode: HeaderMode) {
  const cols = getColumnFrames(table);
  for (let i = 0; i < cols.length; i++) {
    await applyHeaderModeToColumn(table, i, mode);
  }
}

function createVariantCriteria(componentSet: ComponentSetNode, targetType: string): Record<string, string> {
  const definitions = componentSet.componentPropertyDefinitions;
  const knownTypes = ["Text", "Avatar", "Tag", "State", "Icon", "Input", "Select", "Check", "ActionIcon", "ActionText", "Description"];
  
  // 1. Try to find a single "Type" property (Dropdown)
  let typePropName: string | undefined;
  let maxMatches = 0;

  for (const [propName, def] of Object.entries(definitions)) {
    if (def.type === "VARIANT" && def.variantOptions) {
      let matches = 0;
      for (const opt of def.variantOptions) {
        if (knownTypes.some(t => opt.includes(t) || t.includes(opt))) {
          matches++;
        }
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        typePropName = propName;
      }
    }
  }

  // If we found a property that matches at least 3 known types, assume it's the Type selector
  if (typePropName && maxMatches >= 3) {
    const def = definitions[typePropName];
    // Find the option for targetType
    const targetOption = def.variantOptions?.find(opt => opt.includes(targetType) || targetType.includes(opt));
    if (targetOption) {
      return { [typePropName]: targetOption };
    }
  }

  // 2. Fallback to Boolean Toggles (Old Logic)
  const keyMap: Record<string, string> = {};
  for (const defKey of Object.keys(definitions)) {
      for (const known of knownTypes) {
          if (defKey.includes(known) || known.includes(defKey)) {
                keyMap[known] = defKey;
          }
      }
      // Also check for Chinese translations
      const chineseMap: Record<string, string> = {
          "Text": "文字", "Avatar": "头像", "Tag": "标签", "State": "状态", 
          "Icon": "图标", "Input": "输入", "Select": "选择", "Check": "多选",
          "ActionIcon": "操作图标", "ActionText": "操作文字", "Description": "描述"
      };
      for (const [en, cn] of Object.entries(chineseMap)) {
          if (defKey.includes(cn) || cn.includes(defKey)) {
                keyMap[en] = defKey;
          }
      }
  }
  
  const criteria: Record<string, string> = {};
  
  // Set all known toggles to False if they exist in the component
  for (const known of knownTypes) {
      const actualKey = keyMap[known];
      if (actualKey && definitions[actualKey]) {
          criteria[actualKey] = "False";
      }
  }

  const targetKeyRaw = CELL_TYPE_VARIANT_KEYS[targetType] ?? targetType;
  const targetKey = keyMap[targetKeyRaw] ?? targetKeyRaw;
  
  // Only set True if the property exists
  if (definitions[targetKey]) {
     criteria[targetKey] = "True";
  } else {
      // Try fuzzy match one more time
      const fuzzyKey = Object.keys(definitions).find(k => k.includes(targetKeyRaw) || targetKeyRaw.includes(k));
      if (fuzzyKey) {
          criteria[fuzzyKey] = "True";
      }
  }

  // If criteria is empty (no known keys found), return a best-effort guess
  if (Object.keys(criteria).length === 0) {
      return { [targetKeyRaw]: "True" };
  }

  return criteria;
}

/**
 * Extracts text content from a node, whether it's an instance or a Custom Frame.
 */
function extractTextFromNode(n: SceneNode, skipCache: boolean = false): string {
  // Priority 1: Check Plugin Data for cached value (for custom cells)
  if (!skipCache && "getPluginData" in n) {
    const cached = n.getPluginData("cellValue");
    if (cached) return cached;
  }

  if (n.type === "INSTANCE") {
    const textNodes = n.findAll(child => child.type === "TEXT") as TextNode[];
    if (textNodes.length > 0) {
      return textNodes.map(t => t.characters).join(" ");
    }
  } else if (n.type === "FRAME") {
    const cellType = n.getPluginData("cellType");
    if (cellType === "Tag") {
      const texts: string[] = [];
      n.children.forEach(c => {
        // Each child of a Tag Frame is expected to be a Tag Instance
        if ("findAll" in c) {
          const t = (c as any).findAll((x: SceneNode) => x.type === "TEXT") as TextNode[];
          if (t.length > 0) texts.push(t[0].characters);
        }
      });
      return texts.join(" ");
    } else if (cellType === "Avatar") {
        // Find the text node that is a direct child of the frame (the name), 
        // ignoring text nodes inside the avatar instance (the initials).
        const t = n.children.find(x => x.type === "TEXT") as TextNode;
        return t ? t.characters : "";
      } else if (cellType === "ActionText" || cellType === "ActionIcon") {
        const texts: string[] = [];
        n.children.forEach(c => {
          if (c.type === "TEXT") {
            texts.push(c.characters);
          }
        });
        if (texts.length > 0) return texts.join("，");
        
        // Fallback for ActionIcon if no text nodes found
        return n.getPluginData("cellValue") || (cellType === "ActionIcon" ? "编辑 删除 …" : "");
      } else if (cellType === "Input" || cellType === "Select" || cellType === "Text" || cellType === "Header") {
        // Find all text nodes inside the instance or frame
        const textNodes = n.findAll(child => child.type === "TEXT") as TextNode[];
        if (textNodes.length > 0) {
          return textNodes.map(t => t.characters).join(" ");
        }
      }
  }
  return "";
}

// --- Cell Factory System ---

type CustomCellRenderer = (
  cellFrame: FrameNode,
  value: string,
  context: {
    tagComponent?: ComponentNode | ComponentSetNode;
    counterComponent?: ComponentNode | ComponentSetNode;
    avatarComponent?: ComponentNode | ComponentSetNode;
  moreIconComponent?: ComponentNode | ComponentSetNode;
  editIconComponent?: ComponentNode | ComponentSetNode;
  deleteIconComponent?: ComponentNode | ComponentSetNode;
  actionMoreIconComponent?: ComponentNode | ComponentSetNode;
  inputComponent?: ComponentNode | ComponentSetNode;
  selectComponent?: ComponentNode | ComponentSetNode;
  stateComponent?: ComponentNode | ComponentSetNode;
  [key: string]: any;
  }
) => Promise<void>;

/**
 * Applies common styling to a cell frame (padding, border, layout)
 */
function applyCellCommonStyling(cellFrame: FrameNode) {
  cellFrame.layoutMode = "HORIZONTAL";
  cellFrame.counterAxisSizingMode = "FIXED";
  // Standard cell height from state
  cellFrame.resize(cellFrame.width, tableSwitchesState.rowHeight); 
  cellFrame.counterAxisAlignItems = "CENTER";
  cellFrame.primaryAxisAlignItems = "MIN";
  
  // Use Tokens for padding and styling
  cellFrame.paddingLeft = TOKENS.sizes.base * 4; // 16px
  cellFrame.paddingRight = TOKENS.sizes.base * 4; // 16px
  cellFrame.itemSpacing = TOKENS.sizes.xs; // 8px
  
  // Background and Border
  cellFrame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  // #EAEDF1 -> r: 0.9176, g: 0.9294, b: 0.9451
  cellFrame.strokes = [{ type: "SOLID", color: { r: 0.9176, g: 0.9294, b: 0.9451 } }];
  cellFrame.strokeAlign = "INSIDE";
  cellFrame.strokeWeight = 0;
  cellWeightFix(cellFrame);
}

function cellWeightFix(cellFrame: FrameNode) {
  if ("strokeBottomWeight" in cellFrame) {
    (cellFrame as any).strokeBottomWeight = 1;
  } else {
    (cellFrame as any).strokeWeight = 1;
  }
}

/**
 * Creates a standard custom cell frame with 16px horizontal padding
 */
function createCustomCellFrame(name: string, type: string): FrameNode {
  const cellFrame = figma.createFrame();
  cellFrame.name = name;
  cellFrame.setPluginData("cellType", type);
  // Initialize cellValue with an empty string or the name
  cellFrame.setPluginData("cellValue", ""); 
  applyCellCommonStyling(cellFrame);
  return cellFrame;
}

async function renderActionIconCell(
  cellFrame: FrameNode,
  text: string,
  context: {
    editIconComponent?: ComponentNode | ComponentSetNode,
    deleteIconComponent?: ComponentNode | ComponentSetNode,
    actionMoreIconComponent?: ComponentNode | ComponentSetNode
  }
) {
  const { editIconComponent, deleteIconComponent, actionMoreIconComponent } = context;

  // Store original text in Plugin Data
  cellFrame.setPluginData("cellValue", text || "编辑 删除 …");

  // Clear existing children
  for (const child of cellFrame.children) {
    child.remove();
  }

  // Helper to create icon instance
  const createIcon = (comp?: ComponentNode | ComponentSetNode) => {
    if (!comp) return null;
    let inst: InstanceNode;
    if (comp.type === "COMPONENT_SET") {
      const def = comp.defaultVariant as ComponentNode;
      inst = (def ?? comp.children[0]).createInstance();
    } else {
      inst = (comp as ComponentNode).createInstance();
    }
    return inst;
  };

  // Render 3 specific icons
  const editInst = createIcon(editIconComponent);
  const deleteInst = createIcon(deleteIconComponent);
  const moreInst = createIcon(actionMoreIconComponent);

  const icons = [editInst, deleteInst, moreInst];
  const fillColor = hexToRgb(TOKENS.colors["color-fill-3"]);

  for (const inst of icons) {
    if (inst) {
      inst.resize(16, 16);
      // Recursively apply color to all vector children
      const applyColor = (node: SceneNode) => {
        // Only apply color to vector-like nodes that are part of the icon
        // Avoid applying color to the root instance or frames that might be backgrounds
        const isVectorPart = node.type === "VECTOR" || 
                           node.type === "BOOLEAN_OPERATION" || 
                           node.type === "STAR" || 
                           node.type === "LINE" || 
                           node.type === "ELLIPSE" || 
                           node.type === "POLYGON";
        
        if (isVectorPart && "fills" in node) {
          node.fills = [{ type: "SOLID", color: fillColor }];
        }
        
        if ("children" in node) {
          for (const child of node.children) {
            applyColor(child);
          }
        }
      };
      applyColor(inst);
      cellFrame.appendChild(inst);
    }
  }

  // Layout styling
  cellFrame.itemSpacing = 24; // User requested 24px spacing
  cellFrame.layoutMode = "HORIZONTAL";
  (cellFrame as any).layoutSizingHorizontal = "FILL";
  cellFrame.counterAxisSizingMode = "FIXED";
  cellFrame.counterAxisAlignItems = "CENTER";
}

async function renderActionCell(
  cellFrame: FrameNode,
  text: string,
  context: { moreIconComponent?: ComponentNode | ComponentSetNode }
) {
  const { moreIconComponent } = context;
  
  // Store original text in Plugin Data
  cellFrame.setPluginData("cellValue", text);

  // Clear existing children
  for (const child of cellFrame.children) {
    child.remove();
  }

  const parts = text.split(/[\s,，、]+/).filter(s => s.trim().length > 0);
  if (parts.length === 0) return;

  const ellipsisIndex = parts.findIndex(p => p === "…" || p === "..." || p === "更多");
  const showMore = ellipsisIndex !== -1 || parts.length > 3;
  
  let visibleParts = parts;
  if (showMore) {
    if (ellipsisIndex !== -1) {
       visibleParts = parts.slice(0, ellipsisIndex);
    } else {
       visibleParts = parts.slice(0, 2);
    }
  }

  const visibleCount = visibleParts.length;

  for (let i = 0; i < visibleCount; i++) {
    const part = visibleParts[i];
    const textNode = figma.createText();
    await loadTextNodeFonts(textNode);
    textNode.characters = part;
    textNode.fontSize = TOKENS.fontSizes["body-2"];
    
    // Color logic: "删除" -> danger-6, else link-6
    const isDelete = part.includes("删除");
    const colorHex = isDelete ? TOKENS.colors["danger-6"] : TOKENS.colors["link-6"];
    const color = hexToRgb(colorHex);
    textNode.fills = [{ type: "SOLID", color }];
    
    cellFrame.appendChild(textNode);
  }

  if (showMore && moreIconComponent) {
    let iconInst: InstanceNode;
    if (moreIconComponent.type === "COMPONENT_SET") {
      const def = moreIconComponent.defaultVariant as ComponentNode;
      iconInst = (def ?? moreIconComponent.children[0]).createInstance();
    } else {
      iconInst = (moreIconComponent as ComponentNode).createInstance();
    }
    
    // Apply size and color to more icon
    iconInst.resize(16, 16);
    // Force color to link-6 (blue) for the more icon, instead of fill-2 (grey)
    const fillColor = hexToRgb(TOKENS.colors["link-6"]);
    const applyColor = (node: SceneNode) => {
      const isVectorPart = node.type === "VECTOR" || 
                         node.type === "BOOLEAN_OPERATION" || 
                         node.type === "STAR" || 
                         node.type === "LINE" || 
                         node.type === "ELLIPSE" || 
                         node.type === "POLYGON";
      
      if (isVectorPart && "fills" in node) {
        node.fills = [{ type: "SOLID", color: fillColor }];
      }
      
      if ("children" in node) {
        for (const child of node.children) {
          applyColor(child);
        }
      }
    };
    applyColor(iconInst);
    
    cellFrame.appendChild(iconInst);
  }

  // Layout styling
  cellFrame.itemSpacing = 16;
  cellFrame.layoutMode = "HORIZONTAL";
  (cellFrame as any).layoutSizingHorizontal = "FILL";
  cellFrame.counterAxisSizingMode = "FIXED";
  cellFrame.counterAxisAlignItems = "CENTER";
}

async function renderStateCell(
  cellFrame: FrameNode,
  text: string,
  context: { stateComponent?: ComponentNode | ComponentSetNode }
) {
  const { stateComponent } = context;

  // Store original text in Plugin Data
  cellFrame.setPluginData("cellValue", text);

  // Clear existing children
  for (const child of cellFrame.children) {
    child.remove();
  }

  if (stateComponent) {
    let inst: InstanceNode;
    if (stateComponent.type === "COMPONENT_SET") {
      // Create instance from default variant
      const def = stateComponent.defaultVariant as ComponentNode;
      inst = (def ?? stateComponent.children[0]).createInstance();
    } else {
      inst = (stateComponent as ComponentNode).createInstance();
    }
    
    // Set properties
    // Default: { "Type 类型": "L2 二级标签", "Theme 主题": "Success 成功", "Size 尺寸": "Default 20", "Icon 图标": "True", "Dropdown 下拉选择": "False", "State 状态": "Default 默认", "Disabled 禁用": "False" }
    // If text is provided, try to map it to "State 状态" or just set as text override?
    // For now, we just stick to default as requested, maybe mapping text later if needed.
    // The user said: "稍后我们再讨论如何完善状态的显示", so we just use default props.
    
    // Explicitly set default props to ensure consistency
    try {
        inst.setProperties({
            "Type 类型": "L2 二级标签",
            "Theme 主题": "Success 成功",
            "Size 尺寸": "Default 20",
            "Icon 图标": "True",
            "Dropdown 下拉选择": "False",
            "State 状态": "Default 默认",
            "Disabled 禁用": "False"
        });
    } catch (e) {
        console.warn("Failed to set properties on State component", e);
    }
    
    cellFrame.appendChild(inst);
  }

  // Layout styling
  cellFrame.layoutMode = "HORIZONTAL";
  cellFrame.layoutSizingHorizontal = "FILL";
  cellFrame.layoutSizingVertical = "FIXED";
  cellFrame.paddingLeft = 8;
  cellFrame.paddingRight = 8;
  cellFrame.counterAxisSizingMode = "FIXED";
  cellFrame.counterAxisAlignItems = "CENTER";
  cellFrame.primaryAxisAlignItems = "MIN";
}

const CUSTOM_CELL_REGISTRY: Record<string, CustomCellRenderer> = {
  "Tag": renderTagCell,
  "Avatar": renderAvatarCell,
  "ActionText": renderActionCell,
  "ActionIcon": renderActionIconCell,
  "Input": renderInputCell,
  "Select": renderSelectCell,
  "State": renderStateCell,
  "Text": renderTextCell,
};

// Ensure all column types use custom frame-based rendering
const ALL_COLUMN_TYPES = [
  "Icon", "Button", "Link", "Badge", "Checkbox", "Radio", 
  "Switch", "Progress", "Rating", "Slider", "Stepper", "Textarea", 
  "TimePicker", "DatePicker", "Upload"
];
ALL_COLUMN_TYPES.forEach(type => {
  if (!CUSTOM_CELL_REGISTRY[type]) {
    (CUSTOM_CELL_REGISTRY as any)[type] = renderTextCell;
  }
});

async function renderHeaderCell(
  cellFrame: FrameNode,
  text: string,
  context: { 
    iconType?: "Filter" | "Sort" | "Search" | "Info";
    align?: "left" | "right";
    iconComponent?: ComponentNode | ComponentSetNode;
  }
) {
  const { iconType, align: alignProp, iconComponent } = context;
  
  // Get alignment from prop or plugin data, default to left
  const savedAlign = cellFrame.getPluginData("textAlign") as "left" | "right";
  const align = alignProp || savedAlign || "left";

  // 1. Styling
  cellFrame.fills = [{ type: "SOLID", color: hexToRgb(TOKENS.colors["color-bg-4"]) }];
  cellFrame.layoutMode = "HORIZONTAL";
  cellFrame.primaryAxisAlignItems = align === "left" ? "MIN" : "MAX";
  cellFrame.counterAxisAlignItems = "CENTER";
  cellFrame.paddingLeft = 16;
  cellFrame.paddingRight = 16;
  cellFrame.itemSpacing = 4;
  
  // Ensure align is saved to plugin data if not already there
  if (align) cellFrame.setPluginData("textAlign", align);
  if (iconType) cellFrame.setPluginData("headerType", iconType.toLowerCase());
  if (text) cellFrame.setPluginData("headerValue", text);

  // Bottom border simulation
  cellFrame.strokeWeight = 0;
  cellFrame.dashPattern = [];
  cellFrame.strokes = [{ type: "SOLID", color: hexToRgb("E5E6EB") }];
  if ("strokeBottomWeight" in cellFrame) {
    (cellFrame as any).strokeBottomWeight = 1;
  } else {
    // Fallback if individual stroke weights are not supported
    (cellFrame as any).strokeWeight = 1;
  }

  // 2. Clear children
  for (const child of cellFrame.children) {
    child.remove();
  }

  // 3. Create Text
  const textNode = figma.createText();
  await loadTextNodeFonts(textNode, "Regular");
  textNode.characters = text || "Header";
  textNode.fontSize = TOKENS.fontSizes["body-2"];
  textNode.textAlignHorizontal = align === "right" ? "RIGHT" : "LEFT";
  textNode.fills = [{ type: "SOLID", color: hexToRgb(TOKENS.colors["text-2"]) }];
  
  cellFrame.appendChild(textNode);

  // 4. Handle Icon (Only if explicitly requested by user or AI)
  // Default to NO icon unless iconType is present and meaningful
  if (iconType && iconComponent) {
    let iconInst: InstanceNode;
    if (iconComponent.type === "COMPONENT_SET") {
      // Variants mapping
      const variantMap: Record<string, string> = {
        "Info": "info-circle 提示",
        "Search": "Search 搜索",
        "Sort": "S\bort 排序",
        "Filter": "Filter 筛选"
      };
      
      const variantName = variantMap[iconType];
      try {
        // Try finding variant by exact name match first
        const variant = iconComponent.findOne(c => 
          c.type === "COMPONENT" && 
          (c.name === variantName || c.name.includes(variantName)) && 
          (c.name.includes("Default 默认") || c.name.includes("Default"))
        ) as ComponentNode;
        
        if (!variant) {
           iconInst = iconComponent.defaultVariant.createInstance();
           if ("setProperties" in iconInst) {
             const props = (iconInst as any).componentProperties;
             const typeKey = Object.keys(props).find(k => k.includes("Type") || k.includes("类型"));
             const stateKey = Object.keys(props).find(k => k.includes("State") || k.includes("状态"));
             
             const finalProps: any = {};
             if (typeKey) finalProps[typeKey] = variantName;
             if (stateKey) finalProps[stateKey] = "Default 默认";
             
             (iconInst as any).setProperties(finalProps);
           }
        } else {
           iconInst = variant.createInstance();
        }
      } catch (e) {
        console.warn("Failed to create icon instance via variant search, using default", e);
        iconInst = (iconComponent.defaultVariant || iconComponent.children[0] as ComponentNode).createInstance();
      }
    } else {
      iconInst = (iconComponent as ComponentNode).createInstance();
    }
    
    cellFrame.appendChild(iconInst);
  }

  textNode.layoutSizingHorizontal = "HUG";
}

async function renderTextCell(
  cellFrame: FrameNode,
  text: string,
  context: {}
) {
  // Store original text in Plugin Data
  cellFrame.setPluginData("cellValue", text);

  // Clear existing children
  for (const child of cellFrame.children) {
    child.remove();
  }

  const textNode = figma.createText();
  await loadTextNodeFonts(textNode);
  textNode.characters = text || "";
  textNode.fontSize = TOKENS.fontSizes["body-2"];
  textNode.fills = [{ type: "SOLID", color: hexToRgb(TOKENS.colors["text-1"]) }];

  cellFrame.appendChild(textNode);
  
  // Preserve alignment if already set
  const oldAlign = cellFrame.primaryAxisAlignItems;
  
  applyCellCommonStyling(cellFrame);
  
  // Restore alignment from plugin data if available, otherwise use oldAlign logic
  const savedAlign = cellFrame.getPluginData("textAlign") as "left" | "center" | "right";
  
  if (savedAlign) {
    cellFrame.primaryAxisAlignItems = savedAlign === "right" ? "MAX" : (savedAlign === "center" ? "CENTER" : "MIN");
    textNode.textAlignHorizontal = savedAlign === "right" ? "RIGHT" : (savedAlign === "center" ? "CENTER" : "LEFT");
  } else if (oldAlign === "MAX") {
    cellFrame.primaryAxisAlignItems = "MAX";
    textNode.textAlignHorizontal = "RIGHT";
    cellFrame.setPluginData("textAlign", "right");
  } else if (oldAlign === "CENTER") {
    cellFrame.primaryAxisAlignItems = "CENTER";
    textNode.textAlignHorizontal = "CENTER";
    cellFrame.setPluginData("textAlign", "center");
  } else {
    cellFrame.primaryAxisAlignItems = "MIN";
    textNode.textAlignHorizontal = "LEFT";
    cellFrame.setPluginData("textAlign", "left");
  }

  // Handle Display Mode: single-line ellipsis or line break
  const displayMode = cellFrame.getPluginData("textDisplayMode") || "ellipsis";
  
  if (displayMode === "ellipsis") {
    textNode.textTruncation = "ENDING";
    // For single line, we want fixed height and fill width
    cellFrame.counterAxisSizingMode = "FIXED"; 
    if (cellFrame.layoutMode !== "NONE") {
      textNode.layoutSizingHorizontal = "FILL";
    }
    textNode.layoutSizingVertical = "FIXED";
    
    // Restore saved table height if available, otherwise default to state
    let targetHeight = tableSwitchesState.rowHeight;
    const table = findTableFrameFromNode(cellFrame);
    if (table) {
      const savedHeight = table.getPluginData("tableRowHeight");
      if (savedHeight) {
        targetHeight = parseInt(savedHeight, 10) || tableSwitchesState.rowHeight;
      }
    }
    cellFrame.resize(cellFrame.width, targetHeight);
    // Reset padding to default if needed (usually handled by applyCellCommonStyling)
  } else {
    textNode.textTruncation = "DISABLED";
    // For multi line, we want auto height
    cellFrame.counterAxisSizingMode = "AUTO";
    if (cellFrame.layoutMode !== "NONE") {
      textNode.layoutSizingHorizontal = "FILL";
    }
    textNode.layoutSizingVertical = "HUG";
    // Set vertical padding to 8px for line break mode
    cellFrame.paddingTop = 8;
    cellFrame.paddingBottom = 8;
  }
}

async function renderInputCell(
  cellFrame: FrameNode,
  text: string,
  context: { inputComponent?: ComponentNode | ComponentSetNode }
) {
  const { inputComponent } = context;
  if (!inputComponent) return;

  // Store original text in Plugin Data
  cellFrame.setPluginData("cellValue", text);

  // Clear existing children
  for (const child of cellFrame.children) {
    child.remove();
  }

  // Create Input Instance
  let inst: InstanceNode;
  if (inputComponent.type === "COMPONENT_SET") {
    const def = inputComponent.defaultVariant as ComponentNode;
    inst = (def ?? inputComponent.children[0]).createInstance();
  } else {
    inst = (inputComponent as ComponentNode).createInstance();
  }
  
  cellFrame.appendChild(inst);

  // Set properties for Input component
  if ("setProperties" in inst) {
    const props = inst.componentProperties;
    const findKey = (name: string) => Object.keys(props).find(k => k.split("#")[0] === name || k.includes(name));
    
    const sizeKey = findKey("Size 尺寸") || findKey("Size") || findKey("尺寸");
    const stateKey = findKey("State 状态") || findKey("State") || findKey("状态");
    const filledKey = findKey("Filled 已填") || findKey("Filled") || findKey("已填");
    const errorKey = findKey("Error 错误") || findKey("Error") || findKey("错误");
    const disableKey = findKey("Disable 禁用") || findKey("Disable") || findKey("禁用");
    const prefixKey = findKey("Prefix 前缀") || findKey("Prefix") || findKey("前缀");
    const suffixKey = findKey("Suffix 后缀") || findKey("Suffix") || findKey("后缀");

    const finalProps: any = {};
    if (sizeKey) finalProps[sizeKey] = "Mini 24";
    if (stateKey) finalProps[stateKey] = "Default 默认";
    if (filledKey) finalProps[filledKey] = "False";
    if (errorKey) finalProps[errorKey] = "False";
    if (disableKey) finalProps[disableKey] = "False";
    if (prefixKey) finalProps[prefixKey] = "False";
    if (suffixKey) finalProps[suffixKey] = "False";

    try {
      inst.setProperties(finalProps);
    } catch (e) {
      console.warn("Failed to set Input properties", e);
    }
  }

  // Set to FILL width - MUST be done AFTER appendChild to ensure parent is an auto-layout frame
  if (cellFrame.layoutMode !== "NONE") {
    (inst as any).layoutSizingHorizontal = "FILL";
  }
}

async function renderSelectCell(
  cellFrame: FrameNode,
  text: string,
  context: { selectComponent?: ComponentNode | ComponentSetNode }
) {
  const { selectComponent } = context;
  if (!selectComponent) return;

  // Store original text in Plugin Data
  cellFrame.setPluginData("cellValue", text);

  // Clear existing children
  for (const child of cellFrame.children) {
    child.remove();
  }

  // Create Select Instance
  let inst: InstanceNode;
  if (selectComponent.type === "COMPONENT_SET") {
    const def = selectComponent.defaultVariant as ComponentNode;
    inst = (def ?? selectComponent.children[0]).createInstance();
  } else {
    inst = (selectComponent as ComponentNode).createInstance();
  }
  
  cellFrame.appendChild(inst);

  // Set properties for Select component
  if ("setProperties" in inst) {
    const props = inst.componentProperties;
    const findKey = (name: string) => Object.keys(props).find(k => k.split("#")[0] === name || k.includes(name));
    
    const valueKey = findKey("Value") || findKey("数值");
    const placeholderKey = findKey("Placeholder 占位符") || findKey("Placeholder") || findKey("占位符");
    const typeKey = findKey("Type 类型") || findKey("Type") || findKey("类型");
    const sizeKey = findKey("Size 尺寸") || findKey("Size") || findKey("尺寸");
    const stateKey = findKey("State 状态") || findKey("State") || findKey("状态");
    const filledKey = findKey("Filled 填写") || findKey("Filled") || findKey("填写");
    const multipleKey = findKey("Multiple 多选") || findKey("Multiple") || findKey("多选");
    const disabledKey = findKey("Disabled 禁用") || findKey("Disabled") || findKey("禁用");

    const finalProps: any = {};
    if (valueKey) finalProps[valueKey] = text || "北京";
    if (placeholderKey) finalProps[placeholderKey] = "请选择";
    if (typeKey) finalProps[typeKey] = "Default 默认";
    if (sizeKey) finalProps[sizeKey] = "Mini 24";
    if (stateKey) finalProps[stateKey] = "Default 默认";
    if (filledKey) finalProps[filledKey] = "False";
    if (multipleKey) finalProps[multipleKey] = "False";
    if (disabledKey) finalProps[disabledKey] = "False";

    try {
      inst.setProperties(finalProps);
    } catch (e) {
      console.warn("Failed to set Select properties", e);
    }
  }

  // Set to FILL width - MUST be done AFTER appendChild to ensure parent is an auto-layout frame
  if (cellFrame.layoutMode !== "NONE") {
    (inst as any).layoutSizingHorizontal = "FILL";
  }
}

async function renderAvatarCell(
  cellFrame: FrameNode,
  text: string,
  context: { avatarComponent?: ComponentNode | ComponentSetNode; overrideDisplayValue?: string; isAI?: boolean }
) {
  const { avatarComponent, overrideDisplayValue, isAI } = context;
  console.log("[renderAvatarCell] Starting render", { 
    text, 
    overrideDisplayValue, 
    isAI,
    cellValue: cellFrame.getPluginData("cellValue")
  });

  if (!avatarComponent) {
    console.warn("[renderAvatarCell] avatarComponent is missing!");
    return;
  }

  // Logic update based on user request:
  // 1. If overrideDisplayValue is provided (manual type switch), use it (usually "宋明杰" or "Sally").
  // 2. If it's AI generated/modified (isAI is true), use the provided text (from JSON/Coze).
  // 3. Fallback to text or default name.
  let finalName = getDefaultAvatarName(text);
  if (overrideDisplayValue) {
    finalName = overrideDisplayValue;
    console.log("[renderAvatarCell] Using overrideDisplayValue:", finalName);
  } else if (text && text.trim() !== "") {
    finalName = text;
    console.log("[renderAvatarCell] Using provided text:", finalName);
  }
  
  console.log("[renderAvatarCell] finalName determined:", finalName);
  
  // Requirement 2: Switch to Avatar column uses default name in UI, 
  // but we don't modify cellValue. We keep whatever was there.
  if (overrideDisplayValue) {
    const existingValue = cellFrame.getPluginData("cellValue");
    // If switching from another type, text is the original content. 
    // We save it to cellValue if it's not already set to something meaningful.
    if (text && (!existingValue || existingValue === finalName)) {
       if (text !== finalName) {
         cellFrame.setPluginData("cellValue", text);
       }
    }
    // Note: finalName is the default (UI only), cellValue is preserved.
  } else {
    // For AI generation or normal usage, we sync cellValue with finalName
    cellFrame.setPluginData("cellValue", finalName);
  }

  // Clear existing children
  for (const child of cellFrame.children) {
    child.remove();
  }

  // Create Avatar Instance
  let avatarInst: InstanceNode;
  if (avatarComponent.type === "COMPONENT_SET") {
    const def = avatarComponent.defaultVariant as ComponentNode;
    avatarInst = (def ?? avatarComponent.children[0]).createInstance();
  } else {
    avatarInst = (avatarComponent as ComponentNode).createInstance();
  }
  
  // Set Avatar properties if needed (e.g., size)
  try {
    avatarInst.setProperties({
      "Size 尺寸": "24", // Assuming 24 based on typical avatar cell design
    });
  } catch (e) {}
  
  // Create Name Text
  const nameText = figma.createText();
  await loadTextNodeFonts(nameText);
  nameText.characters = finalName;
  nameText.fontSize = TOKENS.fontSizes["body-2"];
  nameText.fills = [{ type: "SOLID", color: hexToRgb(TOKENS.colors["text-1"]) }];
  
  // Layout in cellFrame
  cellFrame.itemSpacing = 4; // Head-to-text spacing
  cellFrame.appendChild(avatarInst);
  cellFrame.appendChild(nameText);
  
  // Text should fill remaining space
  nameText.layoutSizingHorizontal = "FILL";
}

async function renderTagCell(
  cellFrame: FrameNode, 
  text: string, 
  context: { tagComponent?: ComponentNode | ComponentSetNode, counterComponent?: ComponentNode | ComponentSetNode }
) {
    const { tagComponent, counterComponent } = context;
    if (!tagComponent) return;

    // Store initial text immediately
    cellFrame.setPluginData("cellValue", text);

    // Clear existing children
    for (const child of cellFrame.children) {
        child.remove();
    }
    
    // Parse tags with +n support
    const parts: string[] = [];
    const rawParts = text.split(/[\s,，、]+/).filter(s => s.trim().length > 0);
    
    for (const p of rawParts) {
        const match = p.match(/^(.*?)(\+\d+)$/);
        if (match) {
            if (match[1] && match[1].trim().length > 0) {
                parts.push(match[1]);
            }
            parts.push(match[2]);
        } else {
            parts.push(p);
        }
    }

    const MAX_TAGS = 3;
    const hasExplicitCounter = parts.some(p => /^\+\d+$/.test(p));
    const showComputedCounter = !hasExplicitCounter && parts.length > MAX_TAGS;
    const displayCount = hasExplicitCounter ? parts.length : (showComputedCounter ? MAX_TAGS : parts.length);
    
    for (let i = 0; i < displayCount; i++) {
        const part = parts[i];
        const isCounter = /^\+\d+$/.test(part);

        if (isCounter && counterComponent) {
            let counterInst: InstanceNode;
            if (counterComponent.type === "COMPONENT_SET") {
                const def = counterComponent.defaultVariant as ComponentNode;
                counterInst = (def ?? counterComponent.children[0]).createInstance();
            } else {
                counterInst = (counterComponent as ComponentNode).createInstance();
            }
            const t = counterInst.findOne(x => x.type === "TEXT") as TextNode;
            if (t) {
                await loadTextNodeFonts(t);
                t.characters = part;
            }
            cellFrame.appendChild(counterInst);
        } else {
            let tagInst: InstanceNode;
            if (tagComponent.type === "COMPONENT_SET") {
                const def = tagComponent.defaultVariant as ComponentNode;
                tagInst = (def ?? tagComponent.children[0]).createInstance();
            } else {
                tagInst = (tagComponent as ComponentNode).createInstance();
            }
            
            // Set Variant Properties
            try {
                tagInst.setProperties({
                    "Type 类型": "Solid 面型标签",
                    "Size 尺寸": "Default 20",
                    "Icon 图标": "False",
                    "Dot 点": "False",
                    "Dropdown 下拉": "False",
                    "State 状态": "Default 默认",
                    "Close 关闭": "False",
                    "Disabled 禁用": "Off"
                });
            } catch (e) {}
            
            const t = tagInst.findOne(x => x.type === "TEXT") as TextNode;
            if (t) {
                await loadTextNodeFonts(t);
                t.characters = part;
                t.textTruncation = "ENDING";
                if ("layoutSizingHorizontal" in t) {
                    (t as any).layoutSizingHorizontal = "FILL";
                }
            }
            cellFrame.appendChild(tagInst);
            
            // Tags should always hug content, never fill width even if single
            tagInst.layoutSizingHorizontal = "HUG";
            
            // If the text is very long, we might want to limit the tag's max width 
            if (cellFrame.width > 32) {
                tagInst.maxWidth = cellFrame.width - cellFrame.paddingLeft - cellFrame.paddingRight;
            }
        }
    }
    
    if (showComputedCounter && counterComponent) {
        let counterInst: InstanceNode;
        if (counterComponent.type === "COMPONENT_SET") {
            const def = counterComponent.defaultVariant as ComponentNode;
            counterInst = (def ?? counterComponent.children[0]).createInstance();
        } else {
            counterInst = (counterComponent as ComponentNode).createInstance();
        }
        
        const t = counterInst.findOne(x => x.type === "TEXT") as TextNode;
        if (t) {
            await loadTextNodeFonts(t);
            const remaining = parts.length - MAX_TAGS;
            t.characters = `+${remaining}`;
        }
        cellFrame.appendChild(counterInst);
    }

    // Store comma-separated tags in Plugin Data for reliable retrieval
    // For tags like "Tag 1, Tag 2, +3"
    const displayParts: string[] = [];
    for (const child of cellFrame.children) {
        if (child.type === "INSTANCE") {
            const t = child.findOne(x => x.type === "TEXT") as TextNode;
            if (t) displayParts.push(t.characters);
        }
    }
    cellFrame.setPluginData("cellValue", displayParts.join("，"));
}

async function applyColumnTypeToColumn(table: FrameNode, colIndex: number, type: ColumnType) {
  const cols = getColumnFrames(table);
  const col = cols[colIndex];
  if (!col) return;
  const offset = await getHeaderOffset(col);

  // Set column-level metadata for better identification in Dev Mode
  col.setPluginData("cellType", type);
  if (type === "ActionIcon" || type === "ActionText") {
    col.setPluginData("cellValue", "编辑 删除 …");
  }

  // --- NEW: Convert Header to Custom Frame if needed ---
  if (offset > 0) {
    const headerNode = col.children[0];
    
    // Check if headerNode is valid before accessing properties
    if (!headerNode || headerNode.removed) {
        console.warn("Skipping header conversion: headerNode is missing or removed");
    } else {
        const headerText = extractTextFromNode(headerNode);
        const { component: iconComponent } = await resolveCellFactory(HEADER_ICON_COMPONENT_KEY);
        
        let headerFrame: FrameNode;
        if (headerNode.type === "FRAME" && headerNode.getPluginData("cellType") === "Header") {
          headerFrame = headerNode as FrameNode;
        } else {
          headerFrame = createCustomCellFrame(headerNode.name, "Header");
          col.insertChild(0, headerFrame);
          headerNode.remove();
        }
        
        const savedHeaderType = headerFrame.getPluginData("headerType") || col.getPluginData("headerType") || "none";
        const { filter, sort, search, info } = headerPropsFromMode(savedHeaderType as HeaderMode);
        
        let iconType: "Filter" | "Sort" | "Search" | "Info" | undefined;
        if (filter) iconType = "Filter";
        else if (sort) iconType = "Sort";
        else if (search) iconType = "Search";
        else if (info) iconType = "Info";

        await renderHeaderCell(headerFrame, headerText, { iconType, iconComponent });
        
        // Ensure Plugin Data is preserved
        headerFrame.setPluginData("headerType", savedHeaderType);
        col.setPluginData("headerType", savedHeaderType);
        headerFrame.layoutSizingHorizontal = "FILL";
        if ("layoutAlign" in headerFrame) {
          (headerFrame as any).layoutAlign = "STRETCH";
        }
    }
  }

  // Special handling for Custom Cells (Tag, Avatar, etc.)
  const customRenderer = CUSTOM_CELL_REGISTRY[type];
  if (customRenderer) {
    try {
      let context: any = {};
      
      if (type === "Tag") {
        const { component: tagComponent } = await resolveCellFactory(TAG_COMPONENT_KEY);
        const { component: counterComponent } = await resolveCellFactory(TAG_COUNTER_COMPONENT_KEY);
        context = { tagComponent, counterComponent: counterComponent || tagComponent };
      } else if (type === "Avatar") {
        const { component: avatarComponent } = await resolveCellFactory(AVATAR_COMPONENT_KEY);
        // Get first cell text to determine language for default name
        let firstCellText = "";
        if (col.children.length > offset) {
          firstCellText = extractTextFromNode(col.children[offset]);
        }
        context = { 
          avatarComponent,
          overrideDisplayValue: getDefaultAvatarName(firstCellText) // Requirement 2: Manual switch uses default name
        };
      } else if (type === "ActionText") {
        const { component: moreIconComponent } = await resolveCellFactory(ACTION_MORE_ICON_COMPONENT_KEY);
        context = { moreIconComponent };
      } else if (type === "ActionIcon") {
        const { component: editIconComponent } = await resolveCellFactory(EDIT_ICON_COMPONENT_KEY);
        const { component: deleteIconComponent } = await resolveCellFactory(DELETE_ICON_COMPONENT_KEY);
        const { component: actionMoreIconComponent } = await resolveCellFactory(ACTION_MORE_ICON_COMPONENT_KEY);
        context = { editIconComponent, deleteIconComponent, actionMoreIconComponent };
      } else if (type === "Input") {
        const { component: inputComponent } = await resolveCellFactory(INPUT_COMPONENT_KEY);
        context = { inputComponent };
      } else if (type === "Select") {
        const { component: selectComponent } = await resolveCellFactory(SELECT_COMPONENT_KEY);
        context = { selectComponent };
      } else if (type === "State") {
        const { component: stateComponent } = await resolveCellFactory(STATE_COMPONENT_KEY);
        context = { stateComponent };
      } else if (type === "Text") {
        context = {};
      }

      // Always use the custom renderer if it exists in our registry
      // This ensures we use the new frame-based custom cells instead of old instance-swapping
      if (customRenderer) {
        // Set column layout props
        const isHug = (type === "ActionText" || type === "ActionIcon");
        col.layoutSizingHorizontal = isHug ? "HUG" : "FILL";
        if (!isHug) {
          col.counterAxisSizingMode = "FIXED";
        }
        
        // Also ensure all cells within the column have consistent sizing
        for (const child of col.children) {
          if (child.type === "FRAME" || child.type === "INSTANCE") {
            if (isHeaderNode(child)) {
              (child as any).layoutSizingHorizontal = "FILL";
              if ("layoutAlign" in child) {
                (child as any).layoutAlign = "STRETCH";
              }
            } else {
              (child as any).layoutSizingHorizontal = isHug ? "HUG" : "FILL";
              if (isHug && "layoutAlign" in child) {
                (child as any).layoutAlign = "INHERIT";
              } else if (!isHug && "layoutAlign" in child) {
                (child as any).layoutAlign = "STRETCH";
              }
            }
          }
        }

        // Snapshot children to avoid mutation issues during iteration
        const childrenSnapshot = Array.from(col.children);

        for (let i = offset; i < childrenSnapshot.length; i++) {
          const n = childrenSnapshot[i];
          if (n.parent !== col) continue;
          
          // Extract original text BEFORE node replacement or removal
          let originalText = extractTextFromNode(n);
          let currentContext = Object.assign({}, context);
          
          if (type === "ActionIcon" || type === "ActionText") {
            originalText = "编辑 删除 …";
          }

          let cellFrame: FrameNode;
          let parent = n.parent;
          let index = parent ? parent.children.indexOf(n) : -1;

          if (n.type === "FRAME" && n.getPluginData("cellType") === type) {
            cellFrame = n as FrameNode;
          } else {
            cellFrame = createCustomCellFrame(n.name, type);
            if (parent) {
              parent.insertChild(index, cellFrame);
              n.remove();
            }
          }

          applyCellCommonStyling(cellFrame);

          cellFrame.layoutSizingHorizontal = "FILL";
          cellFrame.layoutSizingVertical = "FIXED";
          
          let targetHeight = tableSwitchesState.rowHeight;
          if (table) {
              const savedHeight = table.getPluginData("tableRowHeight");
              if (savedHeight) {
                  targetHeight = parseInt(savedHeight, 10) || tableSwitchesState.rowHeight;
              }
          }
          cellFrame.resize(cellFrame.width, targetHeight);

          cellFrame.layoutAlign = "STRETCH"; 
          
          // Force layout mode and sizing again after renderer to ensure it sticks
          if (type === "ActionText" || type === "ActionIcon") {
            cellFrame.layoutMode = "HORIZONTAL";
            cellFrame.primaryAxisSizingMode = "FIXED"; 
            cellFrame.counterAxisSizingMode = "FIXED";
          }
          
          await customRenderer(cellFrame, originalText, currentContext);
        }
        return;
      }
    } catch (e) {
      console.warn(`Failed to apply ${type} component`, e);
    }
  }

  // Note: We can't pre-calculate criteria efficiently if instances belong to different component sets (rare but possible)
  // Also we want to use the robust property detection from createVariantCriteria.

  for (let i = offset; i < col.children.length; i++) {
    const n = col.children[i];
    if (n.type !== "INSTANCE") continue;
    const inst = n as InstanceNode;
    const main = await inst.getMainComponentAsync();
    if (!main || !main.parent || main.parent.type !== "COMPONENT_SET") continue;
    const componentSet = main.parent;
    
    // Use the robust criteria creation that checks component definitions
    const criteria = createVariantCriteria(componentSet, type);
    
    const targetVariant = findVariant(componentSet, criteria);
    if (targetVariant) {
      inst.swapComponent(targetVariant);
      
      if (type === "ActionIcon") {
        inst.setPluginData("cellValue", "编辑 删除 …");
      }

      // Ensure action cells are FILL if type is Action
      if (type === "ActionText" || type === "ActionIcon") {
        if ("layoutSizingHorizontal" in inst) {
          (inst as any).layoutSizingHorizontal = "FILL";
        }
      }
    }
  }

  // Final check: if the column is now an action column, ensure it's HUG
  if (type === "ActionText" || type === "ActionIcon" || col.name.toLowerCase().includes("操作") || col.name.toLowerCase().includes("action")) {
    // We don't set HUG immediately here because it might cause uneven widths if content varies.
    // Instead, we rely on the user or the table creation/modification process to trigger applyColumnWidthToColumn(..., "HUG")
    // which handles the measurement and normalization correctly.
    // However, for immediate feedback if this is a single column update, we might want to trigger it.
    // Given the architecture, applyColumnTypeToColumn is usually called by a user action or during creation.
    // If it's a user action, we should ideally trigger the width adjustment.
    
    // Let's trigger a width adjustment if we can find the table context
    // But applyColumnTypeToColumn doesn't have easy access to table index or full table structure in a way that guarantees
    // we can call applyColumnWidthToColumn safely without potential recursion or context issues.
    // For now, we leave the column as is (likely FIXED or FILL from previous state) and rely on the explicit width setting logic.
    // If we force HUG here on the column, we get the "jagged" look.
    // So we REMOVE the forced HUG on the column here.
  }
}

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  if (n < min) return min;
  if (n > max) return max;
  return Math.floor(n);
}

async function cloneOrCreateBodyCell(col: FrameNode, rowIndex?: number): Promise<SceneNode> {
  const offset = await getHeaderOffset(col);
  const bodyRows = col.children.length - offset;
  let templateIndex = offset;
  
  if (rowIndex !== undefined && bodyRows > 0) {
    templateIndex = offset + (rowIndex % bodyRows);
  }
  
  const template = col.children[templateIndex];
  if (template) return (template as SceneNode).clone();
  const { createCell } = await resolveCellFactory(COMPONENT_KEY);
  return createCell();
}

async function applyColumnWidthToColumn(table: FrameNode, colIndex: number, mode: "FIXED" | "FILL" | "HUG") {
  console.log(`[applyColumnWidthToColumn] colIndex: ${colIndex}, mode: ${mode}`);
  const cols = getColumnFrames(table);
  const col = cols[colIndex];
  if (!col) {
    console.error(`[applyColumnWidthToColumn] Column at index ${colIndex} not found`);
    return;
  }

  if (mode === "FILL") {
    col.layoutSizingHorizontal = "FILL";
  } else if (mode === "HUG") {
    // 特殊处理 HUG 模式，特别是针对操作列
    console.log(`[applyColumnWidthToColumn] Starting HUG measurement for column ${colIndex}`);
    
    // 1. 测量阶段：将列和所有子元素设为 HUG
    col.layoutSizingHorizontal = "HUG";
    for (const child of col.children) {
      if ("layoutSizingHorizontal" in child) {
        (child as any).layoutSizingHorizontal = "HUG";
        if (child.type === "FRAME") {
          (child as FrameNode).primaryAxisSizingMode = "AUTO";
        }
      }
    }
    
    // 获取自然宽度
    const naturalWidth = col.width;
    console.log(`[applyColumnWidthToColumn] Natural width measured: ${naturalWidth}`);
    
    // 2. 冻结阶段：转为固定宽度，防止后续填充失效
    col.layoutSizingHorizontal = "FIXED";
    col.resize(naturalWidth, col.height);
    
    // 3. 填充阶段：让所有子元素填充这个固定宽度
    for (const child of col.children) {
      if ("layoutSizingHorizontal" in child) {
        (child as any).layoutSizingHorizontal = "FILL";
        if ("layoutAlign" in child) (child as any).layoutAlign = "STRETCH";
        
        // 如果是框架，确保它内部不再 HUG 而是固定，以便 FILL 生效
        if (child.type === "FRAME") {
          (child as FrameNode).primaryAxisSizingMode = "FIXED";
        }
      }
    }
    console.log(`[applyColumnWidthToColumn] HUG measurement and adjustment completed`);
    return; // HUG 模式处理完毕，提前返回
  } else {
    col.layoutSizingHorizontal = "FIXED";
  }

  for (const child of col.children) {
    if ("layoutSizingHorizontal" in child) {
      if (isHeaderNode(child as SceneNode)) {
        (child as any).layoutSizingHorizontal = "FILL";
        if ("layoutAlign" in child) {
          (child as any).layoutAlign = "STRETCH";
        }
      } else {
        const cellType = child.getPluginData("cellType");
        const isAction = cellType === "ActionText" || cellType === "ActionIcon";
        
        if (isAction) {
           (child as any).layoutSizingHorizontal = "FILL";
           if ("layoutAlign" in child) {
               (child as any).layoutAlign = "STRETCH";
           }
           if (child.type === "FRAME") {
               const frame = child as FrameNode;
               frame.layoutMode = "HORIZONTAL";
               frame.primaryAxisSizingMode = "FIXED";
               frame.counterAxisSizingMode = "FIXED";
           }
        } else {
            (child as any).layoutSizingHorizontal = "FILL";
            if ("layoutAlign" in child) {
              (child as any).layoutAlign = "STRETCH";
            }
        }
      }
    }
  }
}

async function applyColumnAlignToColumn(table: FrameNode, colIndex: number, align: "left" | "center" | "right") {
  const cols = getColumnFrames(table);
  const col = cols[colIndex];
  if (!col) return;

  // Save alignment in column plugin data
  col.setPluginData("textAlign", align);

  for (const child of col.children) {
    if (child.type === "INSTANCE") {
      const inst = child as InstanceNode;
      if (await isHeaderInstance(inst)) {
        // Legacy instance headers - user previously asked for left, but now wants support for left/right
        await setInstanceAlign(inst, align === "center" ? "left" : align);
      } else {
        await setInstanceAlign(inst, align);
      }
    } else if (child.type === "FRAME" && child.getPluginData("cellType")) {
      const cellFrame = child as FrameNode;
      const type = cellFrame.getPluginData("cellType");
      
      if (type === "Header") {
        // Custom Header - support left/right
        cellFrame.primaryAxisAlignItems = align === "right" ? "MAX" : "MIN";
        cellFrame.setPluginData("textAlign", align === "right" ? "right" : "left");
        const textNode = cellFrame.findOne(n => n.type === "TEXT") as TextNode;
        if (textNode) {
          textNode.textAlignHorizontal = align === "right" ? "RIGHT" : "LEFT";
        }
      } else {
        // Custom body cells
        cellFrame.primaryAxisAlignItems = align === "right" ? "MAX" : (align === "center" ? "CENTER" : "MIN");
        cellFrame.setPluginData("textAlign", align);
        const textNode = cellFrame.findOne(n => n.type === "TEXT") as TextNode;
        if (textNode) {
          textNode.textAlignHorizontal = align === "right" ? "RIGHT" : (align === "center" ? "CENTER" : "LEFT");
        }
      }
    }
  }
}

async function applyTableSize(table: FrameNode, size: "mini" | "default" | "medium" | "large") {
  const sizeMap = {
    mini: 32,
    default: 40,
    medium: 48,
    large: 56
  };
  const h = sizeMap[size];
  
  // Update global state for future creations
  tableSwitchesState.rowHeight = h;
  
  // Save current row height to table plugin data
  table.setPluginData("tableRowHeight", h.toString());
  
  const cols = getColumnFrames(table);
  for (const col of cols) {
     for (let i = 0; i < col.children.length; i++) {
        const cell = col.children[i] as FrameNode;
        if (cell.type === "FRAME" && cell.getPluginData("cellType") === "Text") {
           const displayMode = cell.getPluginData("textDisplayMode") || "ellipsis";
           if (displayMode === "lineBreak") {
              cell.counterAxisSizingMode = "AUTO";
              cell.layoutSizingVertical = "HUG";
              continue;
           }
        }

        if ("layoutSizingVertical" in cell) {
           cell.layoutSizingVertical = "FIXED";
           cell.resize(cell.width, h);
        }
     }
  }
}

async function applyRowAction(table: FrameNode, action: "none" | "multiple" | "single" | "drag" | "expand" | "switch") {
   table.setPluginData("rowActionType", action);
   const cols = getColumnFrames(table);
   if (cols.length === 0) return;

   const firstCol = cols[0];
   const isActionCol = firstCol.getPluginData("isRowActionColumn") === "true";

   if (action === "none") {
       if (isActionCol) {
           firstCol.remove();
       }
       return;
   }

   let type: "Checkbox" | "Radio" | "Drag" | "Expand" | "Switch" = "Checkbox";
   if (action === "multiple") type = "Checkbox";
   else if (action === "single") type = "Radio";
   else if (action === "drag") type = "Drag";
   else if (action === "expand") type = "Expand";
   else if (action === "switch") type = "Switch";

   if (isActionCol && firstCol.getPluginData("rowActionType") === type) {
       return;
   }

  if (isActionCol) {
      const index = table.children.indexOf(firstCol);
      firstCol.remove();
      const otherCol = getColumnFrames(table)[0];
      if (otherCol) {
          const offset = await getHeaderOffset(otherCol);
          const rowCount = otherCol.children.length - offset;
          const newCol = await createRowActionColumn(table, rowCount, type);
          table.insertChild(index, newCol);
      }
  } else {
      const otherCol = getColumnFrames(table)[0];
      if (otherCol) {
          const offset = await getHeaderOffset(otherCol);
          const rowCount = otherCol.children.length - offset;
          await createRowActionColumn(table, rowCount, type);
      }
  }
}

async function applyTableSwitch(table: FrameNode, key: "pagination" | "filter" | "actions" | "tabs", enabled: boolean) {
   if (key in tableSwitchesState) {
     (tableSwitchesState as any)[key] = enabled;
   }

   const mapping: Record<string, string> = {
       "tabs": "hasTabs",
       "filter": "hasFilter",
       "actions": "hasActions",
       "pagination": "hasPagination"
   };
   const standardKey = mapping[key] || `switch_${key}`;
   table.setPluginData(standardKey, enabled ? "true" : "false");
   
   const container = table.parent;
   if (!container || container.type !== "FRAME") return;

   if (key === "pagination") {
       let pager: SceneNode | undefined;
       for (const c of container.children) {
           if (c.name.includes("Pagination")) {
               pager = c;
               break;
           }
           if (c.type === "INSTANCE") {
               const main = await (c as InstanceNode).getMainComponentAsync();
               if (main?.key === PAGINATION_COMPONENT_KEY || (main?.parent?.type === "COMPONENT_SET" && (main.parent as ComponentSetNode).key === PAGINATION_COMPONENT_KEY)) {
                   pager = c;
                   break;
               }
           }
       }
       
       if (!pager && enabled) {
              try {
                  const comp = await loadComponent(PAGINATION_COMPONENT_KEY, "Pagination");
                  let inst: SceneNode | null = null;
                  if (comp.type === "COMPONENT_SET") {
                   const defaultVar = comp.defaultVariant as ComponentNode | undefined;
                   const target = defaultVar ?? (comp.children.find((c) => c.type === "COMPONENT") as ComponentNode | undefined);
                   if (target) inst = target.createInstance();
               } else {
                   inst = (comp as ComponentNode).createInstance();
               }
               if (inst) {
                          inst.name = "Pagination";
                          container.insertChild(container.children.length, inst);
                          if ("layoutSizingHorizontal" in inst) {
                              (inst as any).layoutSizingHorizontal = "FILL";
                          }
                          pager = inst;
                      }
           } catch (e) {
               console.warn("Failed to load Pagination", e);
           }
       }
       
       if (pager) {
           pager.visible = enabled;
       }
   } else {
       let topBar = container.children.find(c => c.name === "Top Bar Container") as FrameNode | undefined;
       if (!topBar && enabled) {
           topBar = figma.createFrame();
           topBar.name = "Top Bar Container";
           topBar.layoutMode = "HORIZONTAL";
           topBar.counterAxisSizingMode = "AUTO";
           topBar.primaryAxisSizingMode = "FIXED";
           topBar.itemSpacing = 20;
           topBar.paddingBottom = 20;
           topBar.fills = [];
           topBar.clipsContent = false;
           container.insertChild(0, topBar); 
           topBar.layoutSizingHorizontal = "FILL";
       }

       if (topBar && topBar.type === "FRAME") {
           const nameMap: Record<string, string> = {
               filter: "Filter",
               actions: "Actions",
               tabs: "Tabs",
               pagination: "" 
           };
           const keyMap: Record<string, string> = {
               filter: FILTER_COMPONENT_KEY,
               actions: BUTTON_GROUP_COMPONENT_KEY,
               tabs: TABS_COMPONENT_KEY
           };
           const layoutMap: Record<string, "FILL" | "HUG"> = {
               filter: "FILL",
               actions: "HUG",
               tabs: "HUG"
           };

           const targetName = nameMap[key];
           const targetKey = keyMap[key];
           
           if (targetName && targetKey) {
               let target = topBar.children.find(c => c.name === targetName);
               
               if (!target && enabled) {
                  try {
                      const comp = await loadComponent(targetKey, targetName);
                      let inst: SceneNode | null = null;
                      if (comp.type === "COMPONENT_SET") {
                           const defaultVar = comp.defaultVariant as ComponentNode | undefined;
                           const targetNode = defaultVar ?? (comp.children.find((c) => c.type === "COMPONENT") as ComponentNode | undefined);
                           if (targetNode) inst = targetNode.createInstance();
                       } else {
                           inst = (comp as ComponentNode).createInstance();
                       }
                       
                       if (inst) {
                           inst.name = targetName;
                           const order = ["Tabs", "Filter", "Actions"];
                           const idx = order.indexOf(targetName);
                           
                           let insertIndex = topBar.children.length;
                           for(let i=0; i<topBar.children.length; i++) {
                               const cName = topBar.children[i].name;
                               const cIdx = order.indexOf(cName);
                               if (cIdx > idx) {
                                   insertIndex = i;
                                   break;
                               }
                           }
                           topBar.insertChild(insertIndex, inst);

                           if ("layoutSizingHorizontal" in inst) {
                               (inst as any).layoutSizingHorizontal = layoutMap[key] === "FILL" ? "FILL" : "HUG";
                           }
                           target = inst;
                       }
                   } catch (e) {
                       console.warn(`Failed to load ${targetName}`, e);
                   }
               }

               if (target) {
                   if (key === "filter" && target.type === "INSTANCE") {
                       target.visible = true;
                       const props = target.componentProperties;
                       const qtyKey = Object.keys(props).find(k => k.includes("数量"));
                       if (qtyKey) {
                           const val = enabled ? "3" : "0";
                           try {
                               target.setProperties({ [qtyKey]: val });
                           } catch (e) {}
                       } else {
                           target.visible = enabled;
                       }
                   } else {
                       target.visible = enabled;
                   }
               }
               
               const tabs = topBar.children.find(c => c.name === "Tabs");
               const filter = topBar.children.find(c => c.name === "Filter");
               const actions = topBar.children.find(c => c.name === "Actions");
               
               const isFilterActive = () => {
                   if (!filter || !filter.visible) return false;
                   if (filter.type === "INSTANCE") {
                       const props = filter.componentProperties;
                       const k = Object.keys(props).find(key => key.includes("数量"));
                       if (k && props[k].value === "0") return false;
                   }
                   return true;
               };

               topBar.visible = (tabs && tabs.visible) || isFilterActive() || (actions && actions.visible) || false;
           }
       }
   }
}

async function applyOperationToTable(table: FrameNode, op: TableOperation) {
  const cols = getColumnFrames(table);

  if (op.op === "add_rows") {
    for (const col of cols) {
      const offset = await getHeaderOffset(col);
      const currentRows = Math.max(0, col.children.length - offset);
      const pos =
        op.position === "start"
          ? 0
          : op.position === "end" || op.position === undefined
              ? currentRows
              : clampInt(op.position, 0, currentRows);
      const insertIndex = offset + pos;

      for (let i = 0; i < op.count; i++) {
        const newCell = await cloneOrCreateBodyCell(col, pos + i);
        col.insertChild(insertIndex + i, newCell);
        if ("layoutSizingHorizontal" in newCell) {
          (newCell as any).layoutSizingHorizontal = "FILL";
        }
      }
    }
    // Update row count metadata
    const newRowCount = (Math.max(0, cols[0].children.length - (await getHeaderOffset(cols[0])))).toString();
    table.setPluginData("rowCount", newRowCount);
    return;
  }

  if (op.op === "remove_rows" || op.op === "delete_row") {
    const indexes = op.op === "delete_row" ? [op.index] : op.indexes;
    const sorted = Array.from(indexes).sort((a, b) => b - a);
    for (const col of cols) {
      const offset = await getHeaderOffset(col);
      const currentRows = Math.max(0, col.children.length - offset);
      for (const idx of sorted) {
        if (idx < 0 || idx >= currentRows) continue;
        const node = col.children[offset + idx];
        if (node) node.remove();
      }
    }
    // Update row count metadata
    const firstCol = cols[0];
    if (firstCol) {
      const newRowCount = (Math.max(0, firstCol.children.length - (await getHeaderOffset(firstCol)))).toString();
      table.setPluginData("rowCount", newRowCount);
    }
    return;
  }

  if (op.op === "add_cols") {
    const template = cols[0];
    if (!template) throw new Error("未找到可用列作为模板");
    const hasHeader = (await getHeaderOffset(template)) === 1;
    const currentCols = cols.length;
    const pos =
      op.position === "start"
        ? 0
        : op.position === "end" || op.position === undefined
            ? currentCols
            : clampInt(op.position, 0, currentCols);

    for (let i = 0; i < op.count; i++) {
      const newCol = (template as SceneNode).clone() as FrameNode;
      table.insertChild(pos + i, newCol);
      
      const spec = op.columns?.[i] ?? {};
      const title = typeof spec.title === "string" ? spec.title : "";
      const titleLower = title.toLowerCase();
      const type = (spec as any).type as ColumnType | undefined;
      const header = (spec as any).header as HeaderMode | undefined;

      if (titleLower.includes("操作") || titleLower.includes("action") || type === "ActionText" || type === "ActionIcon") {
        newCol.layoutSizingHorizontal = "HUG";
      } else {
        newCol.layoutSizingHorizontal = "FILL";
      }

      if (hasHeader && newCol.children[0]) {
        const first = newCol.children[0];
        if (first.type === "INSTANCE") {
          await setFirstText(first as any, title);
          if (header) await applyHeaderModeToInstance(first as InstanceNode, header);
        } else if (first.type === "FRAME" && first.getPluginData("cellType") === "Header") {
          const headerFrame = first as FrameNode;
          const textNode = headerFrame.findOne(n => n.type === "TEXT") as TextNode;
          if (textNode && title) {
            await loadTextNodeFonts(textNode);
            textNode.characters = title;
          }
          if (header) {
            const colIndex = getColumnFrames(table).indexOf(newCol);
            if (colIndex !== -1) {
              await applyHeaderModeToColumn(table, colIndex, header);
            }
          }
        }
      }
      if (type) {
        const idx = table.children.indexOf(newCol);
        await applyColumnTypeToColumn(table, idx, type);
      }
    }
    return;
  }

  if (op.op === "remove_cols" || op.op === "delete_col") {
    const indexes = op.op === "delete_col" ? [op.index] : op.indexes;
    const sorted = Array.from(indexes).sort((a, b) => b - a);
    for (const idx of sorted) {
      const col = cols[idx];
      if (col) col.remove();
    }
    return;
  }

  if (op.op === "rename_column") {
    const col = cols[op.index];
    if (!col) return;
    const first = col.children[0];
    if (first) {
      if (first.type === "INSTANCE" && await isHeaderInstance(first as InstanceNode)) {
        await setFirstText(first as any, op.title);
      } else if (first.type === "FRAME" && first.getPluginData("cellType") === "Header") {
        const textNode = first.findOne(n => n.type === "TEXT") as TextNode;
        if (textNode) {
          await loadTextNodeFonts(textNode);
          textNode.characters = op.title;
        }
      }
    }
    const title = op.title?.trim();
    if (title && title.length > 0) {
      col.name = title;
      const offset = await getHeaderOffset(col);
      for (let r = 0; r < col.children.length - offset; r++) {
        const cellNode = col.children[offset + r];
        if (cellNode) {
          cellNode.name = `${title}-${r + 1}`;
        }
      }
    }
    return;
  }

  if (op.op === "set_column_type") {
    await applyColumnTypeToColumn(table, op.index, op.type);
    return;
  }

  if (op.op === "set_header") {
    await applyHeaderModeToColumn(table, op.index, op.header);
    return;
  }

  if (op.op === "set_column_width") {
    await applyColumnWidthToColumn(table, op.index, op.width);
    return;
  }

  if (op.op === "set_column_align") {
    await applyColumnAlignToColumn(table, op.index, op.align);
    return;
  }

  if (op.op === "update_filters") {
    // 1. Find Top Bar Container
    const container = table.parent;
    if (!container || container.type !== "FRAME") return;
    
    const topBar = container.children.find(c => c.name === "Top Bar Container") as FrameNode;
    if (!topBar) return;

    // 2. Find Filter Instance
    let filterInst = topBar.children.find(c => c.name === "Filter") as InstanceNode;
    
    if (filterInst && filterInst.type === "INSTANCE") {
        filterInst.visible = true; // Ensure visible
        table.setPluginData("hasFilter", "true");
        const items = op.items;
        const count = items.length;

        // 3. Update Quantity Variant
        const props = filterInst.componentProperties;
        const qtyKey = Object.keys(props).find(k => k === "Quantity" || k === "数量" || k === "Number");
        if (qtyKey) {
            try {
                filterInst.setProperties({ [qtyKey]: String(count) });
            } catch (e) {
                console.warn("Failed to set filter quantity", e);
            }
        }

        // 4. Update Filter Items
        const selectInstances = filterInst.children.filter(c => c.type === "INSTANCE" || (c.type === "FRAME" && c.name.includes("Select")));
        
        for (let i = 0; i < Math.min(items.length, selectInstances.length); i++) {
            const item = items[i];
            const selectInst = selectInstances[i] as FrameNode | InstanceNode;
            
            const allTexts = (selectInst as any).findAll ? (selectInst as any).findAll((n: SceneNode) => n.type === "TEXT" && n.visible) : [];
            allTexts.sort((a: SceneNode, b: SceneNode) => a.absoluteBoundingBox!.x - b.absoluteBoundingBox!.x);

            if (allTexts.length >= 2) {
                const tLabel = allTexts[0] as TextNode;
                const tPlaceholder = allTexts[1] as TextNode;
                
                await loadTextNodeFonts(tLabel);
                tLabel.characters = item.label;
                
                await loadTextNodeFonts(tPlaceholder);
                let prefix = "请选择";
                if (item.type === "input") prefix = "请输入";
                else if (item.type === "search") prefix = "请搜索";
                tPlaceholder.characters = `${prefix}${item.label}`;
            } else if (allTexts.length === 1) {
                const t = allTexts[0] as TextNode;
                await loadTextNodeFonts(t);
                t.characters = item.label;
            }

            let icon: SceneNode | null = null;
            if ((selectInst as any).findAll) {
                const candidates = (selectInst as any).findAll((n: SceneNode) => 
                   (n.name === "icon-w" || n.name === "down" || n.name.includes("Icon") || n.type === "VECTOR") && n.type !== "TEXT" && n.visible
                );
                if (candidates.length > 0) {
                    candidates.sort((a: SceneNode, b: SceneNode) => b.absoluteBoundingBox!.x - a.absoluteBoundingBox!.x);
                    icon = candidates[0];
                }
            }
            if (icon) icon.visible = item.type === "select";
        }
    }
    return;
  }

  if (op.op === "update_tabs") {
    const container = table.parent;
    if (!container || container.type !== "FRAME") return;
    const topBar = container.children.find(c => c.name === "Top Bar Container") as FrameNode;
    if (!topBar) return;

    let tabsInst = topBar.children.find(c => c.name === "Tabs") as InstanceNode;
    if (tabsInst && tabsInst.type === "INSTANCE") {
      tabsInst.visible = true;
      table.setPluginData("hasTabs", "true");
      const items = op.items;

      // Update Quantity variant if exists
      const props = tabsInst.componentProperties;
      const qtyKey = Object.keys(props).find(k => k === "Quantity" || k === "数量" || k === "Number");
      if (qtyKey) {
        try {
          tabsInst.setProperties({ [qtyKey]: String(items.length) });
        } catch {}
      }

      // Tabs usually have child items or are a single instance with variant
      // For simplicity, find all text nodes and update them
      const textNodes = tabsInst.findAll(n => n.type === "TEXT") as TextNode[];
      // Sort text nodes by x position to match logical order
      textNodes.sort((a, b) => {
          const ax = a.absoluteBoundingBox ? a.absoluteBoundingBox.x : 0;
          const bx = b.absoluteBoundingBox ? b.absoluteBoundingBox.x : 0;
          return ax - bx;
      });

      for (let i = 0; i < Math.min(items.length, textNodes.length); i++) {
        await loadTextNodeFonts(textNodes[i]);
        textNodes[i].characters = items[i].label;
      }
      // If items > textNodes, maybe we need more children? For now just fill what we have.
    }
    return;
  }

  if (op.op === "update_buttons") {
    const container = table.parent;
    if (!container || container.type !== "FRAME") return;
    const topBar = container.children.find(c => c.name === "Top Bar Container") as FrameNode;
    if (!topBar) return;

    let actionsInst = topBar.children.find(c => c.name === "Actions") as InstanceNode;
    if (actionsInst && actionsInst.type === "INSTANCE") {
      actionsInst.visible = true;
      table.setPluginData("hasActions", "true");
      const items = op.items;
      
      // Update quantity if supported
      const props = actionsInst.componentProperties;
      const qtyKey = Object.keys(props).find(k => k === "Quantity" || k === "数量" || k === "Number");
      if (qtyKey) {
        try {
          actionsInst.setProperties({ [qtyKey]: String(items.length) });
        } catch {}
      }

      // Buttons are usually children of the group
      const buttons = actionsInst.children.filter(c => c.type === "INSTANCE") as InstanceNode[];
      // User says primary always on right. LLM should output primary as the last one if it follows our rules.
      // We will fill from left to right for now, but ensure text is updated.
      for (let i = 0; i < Math.min(items.length, buttons.length); i++) {
        const item = items[i];
        const btn = buttons[i];
        const textNode = btn.findOne(n => n.type === "TEXT") as TextNode;
        if (textNode) {
          await loadTextNodeFonts(textNode);
          textNode.characters = item.label;
        }
        
        // Update type (variant)
        const btnProps = btn.componentProperties;
        const typeKey = Object.keys(btnProps).find(k => k.toLowerCase().includes("type") || k.includes("类型"));
        if (typeKey) {
          const typeMap: Record<string, string> = {
            primary: "Primary",
            secondary: "Secondary",
            outline: "Outline",
            text: "Text"
          };
          const targetType = typeMap[item.type] || "Secondary";
          // We need to find the exact variant name in the component set
          const main = await btn.getMainComponentAsync();
          if (main && main.parent && main.parent.type === "COMPONENT_SET") {
            const compSet = main.parent;
            const targetVariant = findVariant(compSet, (v) => {
              const p = v.variantProperties || {};
              return Object.values(p).some(val => String(val).toLowerCase() === targetType.toLowerCase());
            });
            if (targetVariant) btn.swapComponent(targetVariant);
          }
        }
      }
    }
    return;
  }

  if (op.op === "update_cell") {
    const col = cols[op.col];
    if (!col) return;
    const offset = await getHeaderOffset(col);
    const cell = col.children[offset + op.row];
    if (!cell) return;
    
    // AI Update: Use render functions for complex cell types
    const cellType = col.getPluginData("cellType") || (cell.type === "FRAME" ? cell.getPluginData("cellType") : undefined);
    
    if (cellType === "Avatar") {
       const { component: avatarComponent } = await resolveCellFactory(AVATAR_COMPONENT_KEY);
       if (avatarComponent && cell.type === "FRAME") {
          await renderAvatarCell(cell as FrameNode, op.value, { avatarComponent, isAI: true });
          return;
       }
    } else if (cellType === "Tag") {
       const { component: tagComponent } = await resolveCellFactory(TAG_COMPONENT_KEY);
       const { component: counterComponent } = await resolveCellFactory(TAG_COUNTER_COMPONENT_KEY);
       if (tagComponent && cell.type === "FRAME") {
          await renderTagCell(cell as FrameNode, op.value, { tagComponent, counterComponent: counterComponent || tagComponent });
          return;
       }
    }

    await setFirstText(cell as any, op.value);
    if (cell.type === "FRAME") {
      cell.setPluginData("cellValue", op.value);
    }
    return;
  }

  if (op.op === "fill_column") {
    const col = cols[op.col];
    if (!col) return;
    const offset = await getHeaderOffset(col);
    const cellType = col.getPluginData("cellType");
    
    let avatarComponent: ComponentNode | ComponentSetNode | undefined;
    if (cellType === "Avatar") {
       const res = await resolveCellFactory(AVATAR_COMPONENT_KEY);
       avatarComponent = res.component;
    }

    for (let r = 0; r < op.values.length; r++) {
      const cell = col.children[offset + r];
      if (!cell) break;
      const val = String(op.values[r]);

      if (cellType === "Avatar" && avatarComponent && cell.type === "FRAME") {
         await renderAvatarCell(cell as FrameNode, val, { avatarComponent, isAI: true });
      } else {
         await setFirstText(cell as any, val);
         if (cell.type === "FRAME") {
           cell.setPluginData("cellValue", val);
         }
      }
    }
    return;
  }

  if (op.op === "translate") {
    figma.notify("正在应用翻译...");
    const { items } = op;
    if (!items || items.length === 0) return;

    for (const item of items) {
      const col = cols[item.col];
      if (!col) continue;
      const offset = await getHeaderOffset(col);
      
      // Translate Header
      if (item.headerTitle !== undefined && offset > 0) {
        const headerNode = col.children[0];
        if (headerNode) {
          await setFirstText(headerNode as any, item.headerTitle);
          col.name = item.headerTitle;
        }
      }

      // Translate Body Cells
      if (item.values && item.values.length > 0) {
        const cellType = col.getPluginData("cellType");
        
        let avatarComponent: ComponentNode | ComponentSetNode | undefined;
        let tagComponent: ComponentNode | ComponentSetNode | undefined;
        let counterComponent: ComponentNode | ComponentSetNode | undefined;

        if (cellType === "Avatar") {
          const res = await resolveCellFactory(AVATAR_COMPONENT_KEY);
          avatarComponent = res.component;
        } else if (cellType === "Tag") {
          const resTag = await resolveCellFactory(TAG_COMPONENT_KEY);
          const resCounter = await resolveCellFactory(TAG_COUNTER_COMPONENT_KEY);
          tagComponent = resTag.component;
          counterComponent = resCounter.component || tagComponent;
        }

        for (let r = 0; r < item.values.length; r++) {
          const cell = col.children[offset + r];
          if (!cell) break;
          const val = String(item.values[r]);

          if (cellType === "Avatar" && avatarComponent && cell.type === "FRAME") {
            await renderAvatarCell(cell as FrameNode, val, { avatarComponent, isAI: true });
          } else if (cellType === "Tag" && tagComponent && cell.type === "FRAME") {
            await renderTagCell(cell as FrameNode, val, { tagComponent, counterComponent });
          } else {
            await setFirstText(cell as any, val);
            if (cell.type === "FRAME") {
              cell.setPluginData("cellValue", val);
            }
          }
        }
      }
    }
    return;
  }

  if (op.op === "move_column") {
    const { fromIndex, toIndex } = op;
    const col = cols[fromIndex];
    if (col && toIndex >= 0 && toIndex < cols.length) {
      table.insertChild(toIndex, col);
    }
    return;
  }

  if (op.op === "replace_column_text") {
    const { col: colIndex, find, replace } = op;
    const col = cols[colIndex];
    if (!col) return;
    const offset = await getHeaderOffset(col);
    for (let i = offset; i < col.children.length; i++) {
      const cell = col.children[i];
      const textNode = cell.type === "INSTANCE" || cell.type === "FRAME" ? cell.findOne(n => n.type === "TEXT") as TextNode : null;
      if (textNode) {
        await loadTextNodeFonts(textNode);
        if (find === "*" || textNode.characters.includes(find)) {
          textNode.characters = find === "*" ? replace : textNode.characters.replace(new RegExp(find, 'g'), replace);
          if (cell.type === "FRAME") {
            cell.setPluginData("cellValue", textNode.characters);
          }
        }
      }
    }
    return;
  }

  if (op.op === "set_table_config") {
    if (op.size) {
      await applyTableSize(table, op.size);
    }
    if (op.rowAction) {
      await applyRowAction(table, op.rowAction);
    }
    if (op.switches) {
      for (const [key, enabled] of Object.entries(op.switches)) {
        await applyTableSwitch(table, key as any, !!enabled);
      }
    }
    return;
  }

  if (op.op === "move_row") {
    const { fromIndex, toIndex } = op;
    for (const col of cols) {
      const offset = await getHeaderOffset(col);
      const rowCount = col.children.length - offset;
      if (fromIndex >= 0 && fromIndex < rowCount && toIndex >= 0 && toIndex < rowCount) {
        const rowNode = col.children[offset + fromIndex];
        col.insertChild(offset + toIndex, rowNode);
      }
    }
    return;
  }

  if (op.op === "sort_rows") {
    const { col: colIndex, order } = op;
    const sortCol = cols[colIndex];
    if (!sortCol) return;
    
    const offset = await getHeaderOffset(sortCol);
    const rowCount = sortCol.children.length - offset;
    if (rowCount <= 1) return;

    // 1. Collect values and original indices
    const rowData: { index: number; value: string }[] = [];
    for (let i = 0; i < rowCount; i++) {
      const cell = sortCol.children[offset + i];
      const val = await getFirstTextValue(cell) || "";
      rowData.push({ index: i, value: val });
    }

    // 2. Sort
    rowData.sort((a, b) => {
      const res = a.value.localeCompare(b.value, undefined, { numeric: true, sensitivity: 'base' });
      return order === "asc" ? res : -res;
    });

    // 3. Reorder all columns
    for (const col of cols) {
      const colOffset = await getHeaderOffset(col);
      // We need to move nodes one by one to their new sorted positions
      // A simple way is to re-append them in the new order
      const nodes = rowData.map(d => col.children[colOffset + d.index]);
      for (let i = 0; i < nodes.length; i++) {
        col.insertChild(colOffset + i, nodes[i]);
      }
    }
    return;
  }
}

function toPositiveInt(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  const n = Math.floor(value);
  if (n <= 0) return fallback;
  return n;
}

/**
 * 通用组件加载函数：优先在本地查找，找不到再尝试从库加载
 */
async function loadComponent(key: string, fallbackName?: string): Promise<ComponentNode | ComponentSetNode> {
  // 0. Check Cache
  if (componentCache.has(key)) {
    const cached = componentCache.get(key)!;
    try {
      // Accessing a property to check if node is valid/alive
      if (cached.removed) {
        console.warn(`Cached component ${key} is removed, reloading...`);
        componentCache.delete(key);
      } else {
        return cached;
      }
    } catch (e) {
      console.warn(`Cached component ${key} is invalid (${e}), reloading...`);
      componentCache.delete(key);
    }
  }

  // 1. Try importComponentByKeyAsync directly
  try {
    console.log(`尝试加载组件: ${key}`);
    const component = await figma.importComponentByKeyAsync(key);
    
    if (component.type === "COMPONENT" && component.parent?.type === "COMPONENT_SET") {
       componentCache.set(key, component.parent);
       return component.parent;
    }

    componentCache.set(key, component);
    return component;
  } catch (e) {
    console.warn("Import failed, trying local search...", e);
    
    // 2. Fallback: Search by Key in currentPage
    let localComponent = figma.currentPage.findOne(
      (n) => (n.type === "COMPONENT" || n.type === "COMPONENT_SET") && n.key === key
    );

    // 3. Fallback: Search by Name in document (if provided)
    if (!localComponent && fallbackName) {
        console.warn(`Key search failed, trying fallback name in document: ${fallbackName}`);
        const searchName = fallbackName.toLowerCase();
        
        // Use a consistent search predicate
         const isTarget = (n: SceneNode | PageNode | DocumentNode) => 
             (n.type === "COMPONENT" || n.type === "COMPONENT_SET") && 
             (n.name.toLowerCase() === searchName || 
              n.name.toLowerCase().includes(searchName) ||
              (searchName === "checkbox" && (n.name.includes("复选框") || n.name.toLowerCase().includes("checkbox") || n.name.includes("多选"))) ||
              (searchName === "radio" && (n.name.includes("单选") || n.name.toLowerCase().includes("radio") || n.name.includes("单选框"))) ||
              (searchName === "switch" && (n.name.includes("开关") || n.name.toLowerCase().includes("switch"))) ||
              (searchName === "drag" && (n.name.includes("拖拽") || n.name.toLowerCase().includes("drag") || n.name.includes("排序"))) ||
              (searchName === "expand" && (n.name.includes("展开") || n.name.toLowerCase().includes("expand") || n.name.includes("详情")))
             );

        // First try current page (faster)
        localComponent = figma.currentPage.findOne(isTarget) as ComponentNode | ComponentSetNode;

        // If still not found, search the entire document (slower but thorough)
        if (!localComponent) {
            localComponent = figma.root.findOne(isTarget) as ComponentNode | ComponentSetNode;
        }
    }

    if (localComponent) {
      componentCache.set(key, localComponent as ComponentNode | ComponentSetNode);
      return localComponent as ComponentNode | ComponentSetNode;
    }

    // 4. Ultimate Fallback: Try searching for any component that might be a checkbox
    if (key === ACTION_CHECKBOX_KEY) {
        const checkboxFallback = figma.root.findOne(n => 
            (n.type === "COMPONENT" || n.type === "COMPONENT_SET") && 
            (n.name.toLowerCase().includes("checkbox") || n.name.includes("复选框"))
        ) as ComponentNode | ComponentSetNode;
        if (checkboxFallback) {
            console.log("Found a generic checkbox fallback by name search");
            componentCache.set(key, checkboxFallback);
            return checkboxFallback;
        }
    }

    // 5. If still not found, notify and throw
    const msg = `无法找到组件 (Key: ${key}${fallbackName ? `, Name: ${fallbackName}` : ""})。请确保该组件在当前文件中存在或已发布。`;
    figma.notify(msg, { error: true });
    throw new Error(msg);
  }
}

interface CreateTableOptions {
  rows: number;
  cols: number;
  rowGap: number;
  colGap: number;
  rowActionType?: "Checkbox" | "Radio" | "Drag" | "Expand" | "Switch";
  envelopeSchema?: TableSchema; // New optional parameter for AI generation
}

function findVariant(
  component: ComponentNode | ComponentSetNode,
  criteria: { [key: string]: string | boolean } | ((variant: ComponentNode) => boolean)
): ComponentNode {
  if (component.type === "COMPONENT") {
    return component;
  }

  const variants = component.children.filter((child) => child.type === "COMPONENT") as ComponentNode[];

  let match: ComponentNode | undefined;

  if (typeof criteria === "function") {
    match = variants.find(criteria);
  } else {
    match = variants.find((variant) => {
      const props = variant.variantProperties;
      if (!props) return false;
      
      for (const [key, value] of Object.entries(criteria)) {
        const propName =
          Object.keys(props).find((k) => k.trim() === key.trim()) ||
          Object.keys(props).find((k) => k.includes(key));
        
        // If the property doesn't exist on this variant, skip this criterion
        if (!propName) continue;
        
        const propVal = props[propName];
        const normalizedVal = typeof value === "boolean" ? (value ? "True" : "False") : value;
        
        if (propVal !== normalizedVal) return false;
      }
      return true;
    });
  }

  if (match) return match;
  if (component.defaultVariant) return component.defaultVariant as ComponentNode;
  return variants[0];
}

async function resolveCellFactory(
  componentKey?: string
): Promise<{ createCell: () => SceneNode; component?: ComponentNode | ComponentSetNode }> {
  if (componentKey) {
    try {
      console.log(`准备加载组件: ${componentKey}`);
      const component = await loadComponent(componentKey);

      if (component.type === "COMPONENT_SET") {
        const defaultVariant = component.defaultVariant as ComponentNode | undefined;
        const target = defaultVariant ?? component.children.find((c) => c.type === "COMPONENT");
        if (!target) throw new Error("Component Set 中未找到可用 Component");
        return { createCell: () => target.createInstance(), component };
      }
      return { createCell: () => component.createInstance(), component };
    } catch (e: any) {
      throw new Error(e.message);
    }
  }
  
  const selected = figma.currentPage.selection[0];
  if (!selected) {
    throw new Error("请先在画布选中一个单元格组件/实例，或者在输入框填写 Component Key。");
  }

  if (selected.type === "INSTANCE") {
    return { createCell: () => selected.clone() }; 
  }

  if (selected.type === "COMPONENT") {
    return { createCell: () => selected.createInstance(), component: selected };
  }

  if (selected.type === "COMPONENT_SET") {
    const anySet = selected as any;
    const defaultVariant = anySet.defaultVariant as ComponentNode | undefined;
    const component =
      defaultVariant ??
      (selected.children.find((c) => c.type === "COMPONENT") as ComponentNode | undefined);
    if (!component) {
      throw new Error("选中的 Component Set 里没有找到可用的 Component。");
    }
    return { createCell: () => component.createInstance(), component: selected };
  }

  throw new Error("选中对象不是 Component/Component Set/Instance，请选中单元格组件。");
}

async function createRowActionColumn(tableFrame: FrameNode, rows: number, type: "Checkbox" | "Radio" | "Drag" | "Expand" | "Switch"): Promise<FrameNode> {
    // Row Action Instances
    let actionKey = "";
    let actionWidth = 50; // Default width for action column

    if (type === "Checkbox") {
        actionKey = ACTION_CHECKBOX_KEY;
        actionWidth = 38;
    } else if (type === "Radio") {
        actionKey = ACTION_RADIO_KEY;
        actionWidth = 38;
    } else if (type === "Drag") {
        actionKey = ACTION_DRAG_KEY;
        actionWidth = 38;
    } else if (type === "Expand") {
        actionKey = ACTION_EXPAND_KEY;
        actionWidth = 38;
    } else if (type === "Switch") {
        actionKey = ACTION_SWITCH_KEY;
        actionWidth = 60;
    }

    const colFrame = figma.createFrame();
    colFrame.name = "Row Action Column";
    colFrame.setPluginData("isRowActionColumn", "true");
    colFrame.setPluginData("rowActionType", type);
    colFrame.layoutMode = "VERTICAL";
    colFrame.primaryAxisSizingMode = "AUTO";
    
    // Always set a default width and FIXED sizing first as a baseline
    (colFrame as any).counterAxisSizingMode = "FIXED";
    colFrame.resize(actionWidth, 100);

    colFrame.itemSpacing = 0;
    colFrame.paddingLeft = 0;
    colFrame.paddingRight = 0;
    colFrame.paddingTop = 0;
    colFrame.paddingBottom = 0;
    colFrame.fills = [];
    colFrame.clipsContent = false;

    // Leftmost placement
    tableFrame.insertChild(0, colFrame);

    // After insertion, we can set FILL if it's a Switch
    if (type === "Switch") {
        // User wants fixed width for the column, but header to fill (inside the fixed column)
        // Wait, if column is fixed 60px, header filling it means header is 60px.
        // If user said "Switch column 60px fixed width, header fill", that means:
        // Column width = 60px (FIXED)
        // Header width = FILL (so it takes 60px)
        // Previous code was setting column to FILL, which made it huge.
        
        // So we should NOT set column to FILL. It should stay FIXED 60px.
        // But we need to ensure Header fills that 60px.
        
        // Remove the FILL setting for the column itself
        /*
        if ("layoutSizingHorizontal" in colFrame) {
            (colFrame as any).layoutSizingHorizontal = "FILL";
        }
        */
        
        // Ensure it has a valid width immediately
        if (colFrame.width < 1) {
            colFrame.resize(actionWidth, colFrame.height > 0 ? colFrame.height : 100);
        }
    }

    // Header
    try {
        const headerComp = await loadComponent(ACTION_HEADER_KEY, "Row Action Header");
        let headerInst: InstanceNode | null = null;
        if (headerComp.type === "COMPONENT_SET") {
            const sizeVariantMap: Record<number, string> = {
                32: "Mini 32",
                40: "Default 40",
                48: "Medium 48",
                56: "Large 56"
            };
            const sizeVariant = sizeVariantMap[tableSwitchesState.rowHeight] || "Default 40";

            const criteria: Record<string, string> = {
                "Check 多选": type === "Checkbox" ? "True" : "False",
                "Expand 展开": type === "Expand" ? "True" : "False",
                "Size 尺寸": sizeVariant,
                "Fixdrow 固定表头": "False",
                "Align 排列方式": "Left 左"
            };
            
            // 再次确保对于 Switch，这些都是 False
            if (type === "Switch") {
                criteria["Check 多选"] = "False";
                criteria["Expand 展开"] = "False";
                // Switch 表头不需要充满，而是居中或者靠左，但 headerInst 本身需要 FILL
                // 这里我们不需要特别改属性，因为 "Size 尺寸" 和 "Align 排列方式" 已经设置了
            }
            
            const variant = findVariant(headerComp, criteria);
            if (variant) {
                headerInst = variant.createInstance();
                // 确保属性正确应用
                try {
                    headerInst.setProperties(criteria);
                } catch (e) {
                    console.warn("Failed to set header properties", e);
                }
            }
        } else {
            headerInst = (headerComp as ComponentNode).createInstance();
        }

        if (headerInst) {
             colFrame.appendChild(headerInst);
             
             // Ensure the header spans the column width
             headerInst.layoutAlign = "STRETCH";
             
             // 恢复为 FILL 模式，它会自动填充父容器 (colFrame) 的宽度
             if ("layoutSizingHorizontal" in headerInst) {
                 // 对于 Switch 开关列，表头应该充满
                 if (type === "Switch") {
                    (headerInst as any).layoutSizingHorizontal = "FILL";
                 } else {
                    (headerInst as any).layoutSizingHorizontal = "FILL"; 
                 }
             }
             
             // 再次强制应用变体属性，确保 Check/Expand 都是 False
             try {
                const sizeVariantMap: Record<number, string> = {
                    32: "Mini 32",
                    40: "Default 40",
                    48: "Medium 48",
                    56: "Large 56"
                };
                const sizeVariant = sizeVariantMap[tableSwitchesState.rowHeight] || "Default 40";

                const finalProps: any = {
                    "Check 多选": "False",
                    "Expand 展开": "False",
                    "Size 尺寸": sizeVariant,
                    "Fixdrow 固定表头": "False"
                };
                
                // 如果是 Switch，确保 Align 是 Left，但因为宽度是 Fill，它会占满
                if (type === "Switch") {
                    // 如果组件支持宽度调整，这里可能不需要额外操作，
                    // 因为 layoutSizingHorizontal = "FILL" 已经让它充满了。
                }

                headerInst.setProperties(finalProps);
             } catch (e) {}

             if ("primaryAxisSizingMode" in headerInst) {
                 if (type === "Switch") {
                     // 对于 Switch，我们希望它充满，所以如果是水平布局，主轴不能是 AUTO (HUG)
                     // 而是应该由 layoutSizingHorizontal = "FILL" 控制
                     (headerInst as any).primaryAxisSizingMode = "FIXED"; 
                 } else {
                     (headerInst as any).primaryAxisSizingMode = "AUTO";
                 }
             }
             if ("counterAxisSizingMode" in headerInst) {
                 (headerInst as any).counterAxisSizingMode = "AUTO";
             }
         }
    } catch (e) {
        console.warn("Failed to load row action header", e);
    }

    if (type !== "Switch") {
        colFrame.resize(actionWidth, colFrame.height);
    } else {
        // For Switch, ensure it's also fixed width
        colFrame.resize(actionWidth, colFrame.height);
    }

    if (actionKey) {
        try {
            const comp = await loadComponent(actionKey, type);
            
            // Detect existing row height from other columns if possible
            let rowHeights: number[] = [];
            const otherCols = getColumnFrames(tableFrame).filter(c => c !== colFrame);
            if (otherCols.length > 0) {
                const sampleCol = otherCols[0];
                const offset = await getHeaderOffset(sampleCol);
                for (let i = 0; i < rows; i++) {
                    const cell = sampleCol.children[i + offset];
                    if (cell) rowHeights.push(cell.height);
                }
            }

            for (let i = 0; i < rows; i++) {
                const container = figma.createFrame();
                container.name = `Action Container ${i + 1}`;
                applyCellCommonStyling(container); // Apply common styling: 40px height, white bg, gray bottom border
                
                // Set specific width for action column
                container.resize(actionWidth, container.height);
                
                // If we detected a different height, apply it
                if (rowHeights[i] !== undefined && Math.abs(rowHeights[i] - tableSwitchesState.rowHeight) > 0.1) {
                    container.resize(container.width, rowHeights[i]);
                }
                
                let inst: InstanceNode | null = null;
                if (comp.type === "COMPONENT_SET") {
                    const criteria: Record<string, any> = {};
                    if (type === "Radio") {
                        criteria["Label 标签#76783:0"] = false;
                        criteria["Checked 已选"] = "False";
                        criteria["Hover 悬浮"] = "False";
                        criteria["Disabled 禁用"] = "False";
                        criteria["Language"] = "CN";
                    } else if (type === "Checkbox") {
                        criteria["label 标签#109762:15"] = false;
                        criteria["Checked 已选"] = "False";
                        criteria["Indeterminate 半选"] = "False";
                        criteria["Hover 悬浮"] = "False";
                        criteria["Disabled 禁用"] = "False";
                    } else if (type === "Switch") {
                        criteria["Label 标签"] = false;
                        criteria["Status 状态"] = "False";
                        criteria["Disabled 禁用"] = "False";
                    }
                    
                    const variant = findVariant(comp, criteria);
                    inst = variant ? variant.createInstance() : (comp.defaultVariant as ComponentNode || comp.children[0] as ComponentNode).createInstance();
                    
                    // Set properties explicitly to be sure
                    if (inst && Object.keys(criteria).length > 0) {
                        try {
                            const actualProps: Record<string, any> = {};
                            const instProps = inst.componentProperties;
                            for (const [key, val] of Object.entries(criteria)) {
                                const actualKey = Object.keys(instProps).find(k => k.split("#")[0] === key.split("#")[0]) || key;
                                actualProps[actualKey] = val;
                            }
                            inst.setProperties(actualProps);
                        } catch (e) {
                            console.warn(`Failed to set properties for ${type}`, e);
                        }
                    }
                } else {
                    inst = (comp as ComponentNode).createInstance();
                }
                
                if (inst) {
                    if (type === "Drag") {
                        inst.resize(14, 14);
                        // Find all vector nodes and apply color-fill-2
                        const vectors = inst.findAll(n => n.type === "VECTOR") as VectorNode[];
                        for (const v of vectors) {
                            v.fills = [{ type: "SOLID", color: hexToRgb(TOKENS.colors["color-fill-2"]) }];
                        }
                    }
                    container.appendChild(inst);
                }
                colFrame.appendChild(container);
            }
        } catch (e) {
            console.warn(`Failed to load row action ${type}`, e);
            // If we failed to load the component or populate the column, remove the entire column
            // to avoid showing a broken column with only a header.
            colFrame.remove();
            return colFrame;
        }
    }
    
    return colFrame;
}

async function createTable(params: CreateTableOptions) {
  const { rows, cols, rowGap, colGap, rowActionType, envelopeSchema } = params;

  // 1. Load basic components (Cell)
  const cellComponent = await loadComponent(CELL_COMPONENT_KEY, "Cell");
  const actionTextComponent = await loadComponent(ROW_ACTION_COMPONENT_KEY, "ActionText").catch(() => null);

  // Cell factory helper
  const getCellFactory = (type: ColumnType = "Text") => {
    if (type === "ActionText" && actionTextComponent) {
      if (actionTextComponent.type === "COMPONENT_SET") {
        const target = actionTextComponent.defaultVariant as ComponentNode || actionTextComponent.children[0] as ComponentNode;
        return target ? () => target.createInstance() : null;
      }
      return () => (actionTextComponent as ComponentNode).createInstance();
    }

    if (!cellComponent) return null;
    if (type === "Tag" || type === "Avatar" || type === "ActionText" || type === "Input" || type === "Select") return null; // These use special custom rendering

    const criteria = getCellVariantCriteria(type);

    if (cellComponent.type === "COMPONENT_SET") {
      const target = findVariant(cellComponent, criteria);
      return target ? () => {
        const inst = target.createInstance();
        try {
          const currentProps = inst.componentProperties;
          const finalProps: any = {};
          for (const [ckey, cval] of Object.entries(criteria)) {
            const actualKey = Object.keys(currentProps).find(k => k.trim() === ckey.trim()) || 
                             Object.keys(currentProps).find(k => k.includes(ckey));
            if (actualKey) {
                const normalizedVal = typeof cval === "boolean" ? (cval ? "True" : "False") : cval;
                finalProps[actualKey] = normalizedVal;
            }
          }
          inst.setProperties(finalProps);
        } catch (e) {
          console.warn(`Failed to set cell properties for ${type} during creation`, e);
        }
        return inst;
      } : null;
    }
    return () => (cellComponent as ComponentNode).createInstance();
  };

  // Create Table Frame
  const totalWidth = 1176;
  const container = figma.createFrame();
  figma.currentPage.appendChild(container); // Add to page early to ensure valid coordinates

  // Initial positioning to avoid appearing at origin during creation
  const initialCenter = figma.viewport.center;
  container.x = Math.round(initialCenter.x - totalWidth / 2);
  container.y = Math.round(initialCenter.y - 300); // Rough estimate for height
  
  container.name = "Smart Table Block";
  container.layoutMode = "VERTICAL";
  container.itemSpacing = 0;
  container.primaryAxisSizingMode = "AUTO";
  container.counterAxisSizingMode = "FIXED";
  container.resize(totalWidth, 100);
  container.fills = [];
  container.clipsContent = false;
  
  // Lock container during creation to prevent user interference
  container.locked = true;

  // Top Bar Container
  const topBarContainer = figma.createFrame();
  topBarContainer.name = "Top Bar Container";
  topBarContainer.layoutMode = "HORIZONTAL";
  topBarContainer.counterAxisSizingMode = "AUTO";
  topBarContainer.primaryAxisSizingMode = "FIXED";
  topBarContainer.itemSpacing = 20;
  topBarContainer.paddingBottom = 20;
  topBarContainer.fills = [];
  topBarContainer.clipsContent = false;
  container.appendChild(topBarContainer);
  topBarContainer.layoutSizingHorizontal = "FILL";

  const addTopComponent = async (key: string, name: string, layout: "FILL" | "HUG", visible: boolean) => {
    try {
      const comp = await loadComponent(key, name);
      let inst: SceneNode | null = null;
      if (comp.type === "COMPONENT_SET") {
        const target = comp.defaultVariant as ComponentNode || comp.children[0] as ComponentNode;
        if (target) inst = target.createInstance();
      } else {
        inst = (comp as ComponentNode).createInstance();
      }
      if (inst) {
        inst.name = name;
        inst.visible = visible;
        topBarContainer.appendChild(inst);
        if ("layoutSizingHorizontal" in inst) {
          (inst as any).layoutSizingHorizontal = layout === "FILL" ? "FILL" : "HUG";
        }
      }
    } catch (e) { console.warn(`Failed to load ${name}`, e); }
  };

  await addTopComponent(TABS_COMPONENT_KEY, "Tabs", "HUG", envelopeSchema?.config?.tabs !== undefined || tableSwitchesState.tabs);
  await addTopComponent(FILTER_COMPONENT_KEY, "Filter", "FILL", envelopeSchema?.config?.filters !== undefined || tableSwitchesState.filter);
  await addTopComponent(BUTTON_GROUP_COMPONENT_KEY, "Actions", "HUG", envelopeSchema?.config?.buttons !== undefined || tableSwitchesState.actions);

  const tableFrame = figma.createFrame();
  tableFrame.name = `Smart Table ${rows}x${cols}`;
  tableFrame.layoutMode = "HORIZONTAL";
  tableFrame.resize(totalWidth, 100);
  tableFrame.primaryAxisSizingMode = "FIXED";
  tableFrame.counterAxisSizingMode = "AUTO";
  tableFrame.itemSpacing = colGap;
  tableFrame.fills = [];
  tableFrame.clipsContent = false;
  try { 
    tableFrame.setPluginData("smart_table", "true"); 
    tableFrame.setPluginData("rowActionType", rowActionType || "none");
    tableFrame.setPluginData("rowCount", rows.toString());
    tableFrame.setPluginData("tableRowHeight", tableSwitchesState.rowHeight.toString());
    tableFrame.setPluginData("hasTabs", (envelopeSchema?.config?.tabs !== undefined || tableSwitchesState.tabs) ? "true" : "false");
    tableFrame.setPluginData("hasFilter", (envelopeSchema?.config?.filters !== undefined || tableSwitchesState.filter) ? "true" : "false");
    tableFrame.setPluginData("hasActions", (envelopeSchema?.config?.buttons !== undefined || tableSwitchesState.actions) ? "true" : "false");
    tableFrame.setPluginData("hasPagination", (envelopeSchema?.config?.pagination !== false && tableSwitchesState.pagination) ? "true" : "false");
  } catch {}
  container.appendChild(tableFrame);
  tableFrame.layoutSizingHorizontal = "FILL";

  // Row Action Column
  if (rowActionType) {
    await createRowActionColumn(tableFrame, rows, rowActionType as any);
  }

      // Create Columns and Fill Content simultaneously
      for (let c = 0; c < cols; c++) {
          const colSpec = envelopeSchema?.columns?.[c];
          const colTitle = colSpec?.title || `Column ${c + 1}`;
          let colType = colSpec?.type || "Text";
          
          // Auto-detect column types if not explicitly provided or if it's default "Text"
          const titleLower = colTitle.toLowerCase();
          if (titleLower.includes("操作") || titleLower.includes("action")) {
            colType = "ActionText";
          } else if (titleLower.includes("头像") || titleLower.includes("avatar")) {
            colType = "Avatar";
          }
          
          // const headerMode = colSpec?.header || "none"; // REMOVED: Defined later

      const colFrame = figma.createFrame();
      colFrame.name = colTitle;
      colFrame.layoutMode = "VERTICAL";
      colFrame.primaryAxisSizingMode = "AUTO";
      colFrame.counterAxisSizingMode = "FIXED";
      colFrame.itemSpacing = rowGap;
      colFrame.fills = [];
      colFrame.clipsContent = false;
      tableFrame.appendChild(colFrame);
      if (titleLower.includes("操作") || titleLower.includes("action") || colType === "ActionText") {
        colFrame.layoutSizingHorizontal = "HUG";
      } else {
        colFrame.layoutSizingHorizontal = "FILL";
      }

      // Create Header
      const headerFrame = createCustomCellFrame(colTitle, "Header");
      colFrame.appendChild(headerFrame);
      headerFrame.layoutAlign = "STRETCH";
      if ("layoutSizingHorizontal" in headerFrame) {
        (headerFrame as any).layoutSizingHorizontal = "FILL";
      }
      
      const { component: iconComponent } = await resolveCellFactory(HEADER_ICON_COMPONENT_KEY);
      
      // Default behavior: DO NOT add any icons unless explicitly requested by user in the envelope
      // If envelopeSchema.columns[c].header is missing, default to "none" (no icon)
      // Only if the user/AI explicitly set headerMode to something else, we show it.
      const headerMode = colSpec?.header || "none";
      const { filter, sort, search, info } = headerPropsFromMode(headerMode);
      
      let iconType: "Filter" | "Sort" | "Search" | "Info" | undefined;
      if (filter) iconType = "Filter";
      else if (sort) iconType = "Sort";
      else if (search) iconType = "Search";
      else if (info) iconType = "Info";
      
      await renderHeaderCell(headerFrame, colTitle, { iconType, iconComponent });
      
      // Requirement: Save header type in cell and column plugin data
      headerFrame.setPluginData("headerType", headerMode);
      colFrame.setPluginData("headerType", headerMode);
      headerFrame.setPluginData("headerValue", colTitle);
      colFrame.setPluginData("headerValue", colTitle);
      
      const colAlign = colSpec?.align || "left";
      colFrame.setPluginData("textAlign", colAlign);
      headerFrame.setPluginData("textAlign", colAlign);
      
      // Apply column metadata
      colFrame.setPluginData("cellType", colType);

    // 2. Add Cells and Fill Data
    const cFactory = getCellFactory(colType);
    const customRenderer = CUSTOM_CELL_REGISTRY[colType];
    
    // Resolve components for custom rendering if needed
    let tagComponent: ComponentNode | ComponentSetNode | undefined;
    let counterComponent: ComponentNode | ComponentSetNode | undefined;
    let avatarComponent: ComponentNode | ComponentSetNode | undefined;
    let moreIconComponent: ComponentNode | ComponentSetNode | undefined;
    let inputComponent: ComponentNode | ComponentSetNode | undefined;
    let selectComponent: ComponentNode | ComponentSetNode | undefined;
    let stateComponent: ComponentNode | ComponentSetNode | undefined;
    let editIconComponent: ComponentNode | ComponentSetNode | undefined;
    let deleteIconComponent: ComponentNode | ComponentSetNode | undefined;
    let actionMoreIconComponent: ComponentNode | ComponentSetNode | undefined;

    const hasCustomRenderer = !!customRenderer;
    if (hasCustomRenderer) {
        if (colType === "Tag") {
            const res = await resolveCellFactory(TAG_COMPONENT_KEY);
            tagComponent = res.component;
            const res2 = await resolveCellFactory(TAG_COUNTER_COMPONENT_KEY);
            counterComponent = res2.component;
        } else if (colType === "Avatar") {
            const res = await resolveCellFactory(AVATAR_COMPONENT_KEY);
            avatarComponent = res.component;
        } else if (colType === "ActionText") {
            const res = await resolveCellFactory(ACTION_MORE_ICON_COMPONENT_KEY);
            moreIconComponent = res.component;
        } else if (colType === "ActionIcon") {
            const res1 = await resolveCellFactory(EDIT_ICON_COMPONENT_KEY);
            editIconComponent = res1.component;
            const res2 = await resolveCellFactory(DELETE_ICON_COMPONENT_KEY);
            deleteIconComponent = res2.component;
            const res3 = await resolveCellFactory(ACTION_MORE_ICON_COMPONENT_KEY);
            actionMoreIconComponent = res3.component;
        } else if (colType === "Input") {
            const res = await resolveCellFactory(INPUT_COMPONENT_KEY);
            inputComponent = res.component;
        } else if (colType === "Select") {
            const res = await resolveCellFactory(SELECT_COMPONENT_KEY);
            selectComponent = res.component;
        } else if (colType === "State") {
            const res = await resolveCellFactory(STATE_COMPONENT_KEY);
            stateComponent = res.component;
        }
    }

    for (let r = 0; r < rows; r++) {
      const val = envelopeSchema?.data?.[r]?.[c] ?? "";
      
      if (customRenderer) {
        const cellFrame = createCustomCellFrame(`${colType} Cell ${c + 1}-${r + 1}`, colType);
        colFrame.appendChild(cellFrame);
        // Operation columns should also be FILL horizontally to ensure background/borders cover the column width
        cellFrame.layoutSizingHorizontal = "FILL";
        cellFrame.layoutSizingVertical = "FIXED";
        
        const context = {
            tagComponent,
            counterComponent: counterComponent || tagComponent,
            avatarComponent,
            moreIconComponent,
            editIconComponent,
            deleteIconComponent,
            actionMoreIconComponent,
            inputComponent,
            selectComponent,
            stateComponent,
            isAI: !!envelopeSchema
        };
        
        await customRenderer(cellFrame, val, context);
      } else if (cFactory) {
        const cell = cFactory();
        colFrame.appendChild(cell);
        // Always FILL to ensure consistency in column width
        cell.layoutSizingHorizontal = "FILL";
        cell.name = `${colTitle}-${r + 1}`;
        
        // Ensure row height follows configuration
        if ("layoutSizingVertical" in cell) {
           (cell as any).layoutSizingVertical = "FIXED";
           cell.resize(cell.width, tableSwitchesState.rowHeight);
        }

        if (cell.type === "INSTANCE") {
           // Ensure properties are applied for non-Text types
           if (colType !== "Text") {
              try {
                const criteria = getCellVariantCriteria(colType);
                const currentProps = cell.componentProperties;
                const finalProps: any = {};
                for (const [ckey, cval] of Object.entries(criteria)) {
                  const actualKey = Object.keys(currentProps).find(k => k.trim() === ckey.trim()) || 
                                   Object.keys(currentProps).find(k => k.includes(ckey));
                  if (actualKey) {
                      const normalizedVal = typeof cval === "boolean" ? (cval ? "True" : "False") : cval;
                      finalProps[actualKey] = normalizedVal;
                  }
                }
                
                // Also handle content property if it exists
                const contentKey = Object.keys(currentProps).find(k => k.includes("Content") || k.includes("内容"));
                if (contentKey && val) {
                    finalProps[contentKey] = val;
                }

                cell.setProperties(finalProps);
              } catch (e) {
                console.warn(`Failed to set properties for cell instance ${colType}`, e);
              }
           }

           await setFirstText(cell, val);
        }
      }
    }
    
    // Yield to main thread every few columns
    if (c > 0 && c % 3 === 0) {
      await yieldToMain();
      postStatus(`正在生成第 ${c + 1} 列...`);
    }
  }

  // Pagination
  try {
    const pagerComp = await loadComponent(PAGINATION_COMPONENT_KEY, "Pagination");
    let pagerInst: SceneNode | null = null;
    if (pagerComp.type === "COMPONENT_SET") {
      const target = pagerComp.defaultVariant as ComponentNode || pagerComp.children[0] as ComponentNode;
      if (target) pagerInst = target.createInstance();
    } else {
      pagerInst = (pagerComp as ComponentNode).createInstance();
    }
    if (pagerInst) {
      container.insertChild(container.children.length, pagerInst);
      if ("layoutSizingHorizontal" in pagerInst) {
        (pagerInst as any).layoutSizingHorizontal = "FILL";
      }
      pagerInst.visible = envelopeSchema?.config?.pagination !== false && tableSwitchesState.pagination;
    }
  } catch (e) { console.warn("无法加载分页组件:", e); }

  // Apply Config (Tabs, Filters, Buttons)
  if (envelopeSchema?.config) {
    await applyOperationToTable(tableFrame, { op: "update_tabs", items: envelopeSchema.config.tabs || [] });
    await applyOperationToTable(tableFrame, { op: "update_filters", items: envelopeSchema.config.filters || [] });
    await applyOperationToTable(tableFrame, { op: "update_buttons", items: envelopeSchema.config.buttons || [] });
  }

  // Final Layout Pass for HUG columns (especially Action columns)
  // This ensures all cells in a HUG column have consistent width based on the widest content
  const finalCols = getColumnFrames(tableFrame);
  for (let i = 0; i < finalCols.length; i++) {
    const col = finalCols[i];
    try {
      if (col.removed) continue;
      const cellType = col.getPluginData("cellType");
      const isAction = cellType === "ActionText" || cellType === "ActionIcon";
      if (isAction || col.layoutSizingHorizontal === "HUG") {
        await applyColumnWidthToColumn(tableFrame, i, "HUG");
      }
    } catch (e) {
      console.warn("Skipping invalidated column in final layout pass", e);
    }
  }

  // Position at center
  // Give Figma a moment to finalize layout
  await yieldToMain();
  
  if (container.removed) {
     throw new Error("表格容器已被删除");
  }
  
  const center = figma.viewport.center;
  // Use absolute dimensions or fallback to totalWidth
  // Reading width/height here forces a layout pass in some Figma versions
  const currentWidth = container.width > 10 ? container.width : totalWidth;
  const currentHeight = container.height > 10 ? container.height : (rows * tableSwitchesState.rowHeight + 200);
  
  const targetX = Math.round(center.x - currentWidth / 2);
  const targetY = Math.round(center.y - currentHeight / 2);
  
  container.x = targetX;
  container.y = targetY;
  
  // Final check to ensure it's not at origin if center is available
  if (container.x === 0 && container.y === 0 && (center.x !== 0 || center.y !== 0)) {
    container.x = targetX;
    container.y = targetY;
  }
  
  // Unlock container after creation is finished
  container.locked = false;
  
  // Also scroll to it to be sure
  figma.viewport.scrollAndZoomIntoView([container]);
  figma.currentPage.selection = [container];

  return tableFrame;
}

function setColumnLayout(mode: "FIXED" | "FILL" | "HUG") {
  const selection = figma.currentPage.selection;
  for (const node of selection) {
    const table = findTableFrameFromNode(node as any);
    if (!table) continue;

    const columnFrame = findColumnFrame(node as any);
    if (!columnFrame) continue;

    const cols = getColumnFrames(table);
    const colIndex = cols.indexOf(columnFrame);

    if (colIndex !== -1) {
      applyColumnWidthToColumn(table, colIndex, mode);
      
      // Sync to plugin data for selection readout and persistence
      columnFrame.setPluginData("colWidthMode", mode);
    } else {
       throw new Error("选中节点不像是表格的列内单元格(无法确定列索引)");
    }
  }
}

async function setInstanceAlign(instance: InstanceNode, align: "left" | "center" | "right"): Promise<boolean> {
  // Only allow alignment for Text cells
  const type = await getCellType(instance);
  if (type !== "Text") return false;

  const props = instance.componentProperties;
  const keys = Object.keys(props);
  const key =
    keys.find((k) => k.toLowerCase().includes("align")) ||
    keys.find((k) => k.includes("排列方式"));
  if (!key) return false;
  const current = props[key].value;
  const map: Record<string, string> = {
    left: "Left 左",
    right: "Right 右"
  };
  const target = map[align];
  if (!target) return false; // Block if align is not supported (e.g. center if we removed it from map)

  if (typeof current === "string" && current === target) {
    // Still save metadata even if visual didn't change (might be missing in data)
    instance.setPluginData("textAlign", align);
    return false;
  }
  try {
    instance.setProperties({ [key]: target });
    instance.setPluginData("textAlign", align);
    return true;
  } catch {
    return false;
  }
}

// Helper function to align rows
async function alignTableRows(table: FrameNode, rowIndex: number, sourceNodes: SceneNode[] = []) {
    const cols = getColumnFrames(table);
    
    // Get default row height for this table
    let defaultRowHeight = tableSwitchesState.rowHeight;
    try {
        const savedHeight = table.getPluginData("tableRowHeight");
        if (savedHeight) {
            defaultRowHeight = parseInt(savedHeight, 10) || tableSwitchesState.rowHeight;
        }
    } catch (e) {
        return;
    }

    let maxHeight = defaultRowHeight;
    
    // First pass: find max height among changed nodes and natural heights of other line-break nodes
    for (const col of cols) {
        if (col.removed) continue;
        if (rowIndex < col.children.length) {
            const cell = col.children[rowIndex] as FrameNode | InstanceNode;
            if (!cell || cell.removed) continue;
            
            // If this cell was specifically changed, respect its new height
            if (sourceNodes.includes(cell)) {
                if (cell.height > maxHeight) maxHeight = cell.height;
            } else {
                // If it's a line-break cell that wasn't changed, we should still respect its natural height
                const isLineBreak = cell.getPluginData("textDisplayMode") === "lineBreak";
                if (isLineBreak) {
                    if ("layoutSizingVertical" in (cell as any)) {
                        const oldSizing = (cell as any).layoutSizingVertical;
                        // Temporarily set to HUG to measure natural height
                        // Only if not explicitly FIXED by user (how to track? heuristics)
                        // If it is currently FIXED, we assume it's intentional unless it's smaller than content?
                        // Let's force HUG to check content height, then decide.
                        
                        (cell as any).layoutSizingVertical = "HUG";
                        if (cell.height > maxHeight) maxHeight = cell.height;
                        (cell as any).layoutSizingVertical = oldSizing;
                    } else {
                        if (cell.height > maxHeight) maxHeight = cell.height;
                    }
                }
            }
        }
    }
    
    if (maxHeight <= 0) maxHeight = defaultRowHeight;

    // Second pass: apply max height
    for (const col of cols) {
        if (col.removed) continue;
        if (rowIndex < col.children.length) {
            const cell = col.children[rowIndex] as FrameNode | InstanceNode;
            if (!cell || cell.removed) continue;
            const isLineBreak = cell.getPluginData("textDisplayMode") === "lineBreak";
            
            if (isLineBreak) {
                // If it's the tallest cell (or close to it)
                if (Math.abs(cell.height - maxHeight) <= 0.1) {
                   // If it is HUG, keep it HUG.
                   // If it is FIXED (manual resize), keep it FIXED.
                   // Ensure we don't force HUG if it was manually resized to be tall.
                   
                   // One case: It was HUG, but now it's the tallest. 
                   // If we leave it HUG, it stays tall. Correct.
                   
                   // Another case: It was FIXED (tall), and it's the tallest.
                   // If we leave it FIXED, it stays tall. Correct.
                } else {
                    // If it's shorter than maxHeight, set to FIXED to align with row
                    if ("layoutSizingVertical" in cell) (cell as any).layoutSizingVertical = "FIXED";
                    try { cell.resize(cell.width, maxHeight); } catch (e) {}
                }
            } else {
                // Normal cells: always FIXED
                if ("layoutSizingVertical" in cell) (cell as any).layoutSizingVertical = "FIXED";
                if (Math.abs(cell.height - maxHeight) > 0.1) {
                    try { cell.resize(cell.width, maxHeight); } catch (e) {}
                }
            }
        }
    }
}

// Initialize listeners
async function init() {
  console.log("Smart Table: Initializing...");
  
  // Required for documentchange event when documentAccess is "dynamic-page"
  if (typeof figma.loadAllPagesAsync === "function") {
    console.log("Smart Table: Loading all pages...");
    await figma.loadAllPagesAsync();
  }

  if (typeof __html__ === "undefined" || !__html__) {
    figma.notify("Error: Plugin UI (__html__) is missing. Please check build process.");
    console.error("Smart Table Error: __html__ is undefined");
    return;
  }

  figma.showUI(__html__, { width: 398, height: 507, themeColors: true });
  console.log("Smart Table: UI shown");

  // Log plugin launch
  const userId = figma.currentUser?.id || "anonymous";
  figma.ui.postMessage({ 
    type: "log", 
    action: "PLUGIN_LAUNCH", 
    userId 
  });
  
  // Also pass userId to UI for subsequent logs
  figma.ui.postMessage({
    type: "selection",
    count: figma.currentPage.selection.length,
    pluginData: { userId }
  } as any);

  postSelection();

   figma.on("selectionchange", () => {
    postSelection();
  });

  figma.on("documentchange", async (event) => {
    const changes = event.documentChanges;
    const cellsToSync = new Map<string, { table: FrameNode; index: number; sourceNodes: SceneNode[] }>();
    const tablesToSyncMetadata = new Set<FrameNode>();

    for (const change of changes) {
      if (change.type !== "PROPERTY_CHANGE") continue;
      
      const node = change.node;
      if (node.removed) continue;
      
      const props = (change.properties || []) as string[];
      
      // If children changed, it might be a row/column addition or deletion
      if (props.includes("children")) {
          const table = findTableFrameFromNode(node as any);
          if (table && !table.removed) {
              tablesToSyncMetadata.add(table);
          }
      }

      const isHeightProp = props.includes("height") || props.includes("resize");
      const isTextProp = props.includes("characters");
      
      if (isHeightProp || isTextProp) {
        let sceneNode: FrameNode | InstanceNode | null = null;
        
        if (isTextProp && node.type === "TEXT") {
            // Find the parent cell frame
            let cur = node.parent;
            while (cur && cur.type !== "PAGE" && !cur.removed) {
                if (cur.type === "FRAME" || cur.type === "INSTANCE") {
                    const cellType = cur.getPluginData("cellType");
                    if (cellType === "Text" || cellType === "Header") {
                        sceneNode = cur as FrameNode | InstanceNode;
                        if (cellType === "Header") {
                            // Update headerValue metadata
                            const headerText = (node as TextNode).characters;
                            sceneNode.setPluginData("headerValue", headerText);
                            // Also update parent column
                            if (sceneNode.parent?.type === "FRAME" && !sceneNode.parent.removed) {
                                sceneNode.parent.setPluginData("headerValue", headerText);
                            }
                        }
                        break;
                    }
                }
                cur = cur.parent;
            }
        } else if (node.type === "INSTANCE" || node.type === "FRAME") {
            sceneNode = node as FrameNode | InstanceNode;
        }

        if (sceneNode && !sceneNode.removed) {
            const column = sceneNode.parent;
            if (column && !column.removed && column.type === "FRAME" && column.layoutMode === "VERTICAL") {
                const table = column.parent;
                if (table && !table.removed && table.type === "FRAME" && table.layoutMode === "HORIZONTAL" && isSmartTableFrame(table)) {
                    // For lineBreak cells, we MUST temporarily force HUG to let Figma recalculate the text height.
                    // Otherwise, if it was previously FIXED, the height won't update when text wraps to a new line.
                    // We only do this if it's a text change and the cell is in lineBreak mode.
                    if (isTextProp) {
                        const textDisplayMode = sceneNode.getPluginData("textDisplayMode");
                        if (textDisplayMode === "lineBreak") {
                            // Force HUG to update height based on new text content
                            if ("layoutSizingVertical" in sceneNode && sceneNode.layoutSizingVertical !== "HUG") {
                                sceneNode.layoutSizingVertical = "HUG";
                            }
                        }
                    }

                    const index = column.children.indexOf(sceneNode);
                    if (index !== -1) {
                        const key = `${table.id}-${index}`;
                        const existing = cellsToSync.get(key);
                        const sourceNodes = existing ? existing.sourceNodes : [];
                        if (!sourceNodes.includes(sceneNode)) {
                            sourceNodes.push(sceneNode);
                        }
                        cellsToSync.set(key, { table, index, sourceNodes });
                    }
                }
            }
        }
      }
    }

    // Sync metadata for tables that had children changes
    if (tablesToSyncMetadata.size > 0) {
        for (const table of tablesToSyncMetadata) {
            if (!table.removed) {
                await syncTableMetadata(table);
            }
        }
    }
    
    if (cellsToSync.size > 0) {
        for (const { table, index, sourceNodes } of cellsToSync.values()) {
            if (table.removed) continue;
            await alignTableRows(table, index, sourceNodes);
        }
    }
  });
}

init();



figma.ui.onmessage = async (message: UiToPluginMessage) => {
  if (isProcessing) {
    console.warn("Plugin is busy, ignoring message:", message.type);
    return;
  }

  if (message.type === "ai_apply_envelope") {
    setProcessing(true);
    const env = message.envelope;
    const startTime = Date.now();
    try {
      if (env.intent === "create") {
        const { rows, cols, rowAction } = env.schema;
        
        // --- ADDED: Check if we are in "Edit Mode" context (implied by selection or UI state passed in future) ---
        // However, `env` doesn't strictly tell us if the user *intended* edit. 
        // But if the user was editing, they likely have a selection.
        // If the AI decided to "Create" instead of "Edit", we should probably REPLACE the selected table if it exists.
        
        const selection = figma.currentPage.selection;
        let tableToReplace: FrameNode | null = null;
        if (selection.length > 0) {
           tableToReplace = findTableFrameFromNode(selection[0] as any);
        }

        const table = await createTable({
          rows,
          cols,
          rowGap: 0,
          colGap: 0,
          rowActionType: rowAction,
          envelopeSchema: env.schema
        });

        if (table) {
          // If we found a table in selection, and AI returned a FULL create (likely due to complex edit),
          // we should remove the old table to simulate "Edit/Replace".
          // To be safe, let's only do this if we can confirm the new table was successfully created.
          if (tableToReplace && !tableToReplace.removed) {
             // Position the new table near the old one? Or just same place?
             table.x = tableToReplace.x;
             table.y = tableToReplace.y;
             tableToReplace.remove();
             figma.notify("由于修改内容较多，已自动执行全量替换");
          }

          const duration = Date.now() - startTime;
          figma.ui.postMessage({ 
            type: "log", 
            action: "CREATE_TABLE", 
            duration, 
            userId: figma.currentUser?.id || "anonymous",
            metadata: { 
              rows, 
              cols, 
              rowAction
            }
          });
          postStatus("表格已生成成功");
          figma.ui.postMessage({ type: "ai_apply_envelope_done" });
        }
      } else if (env.intent === "edit") {
        if (!env.patch || !Array.isArray(env.patch.operations)) {
          throw new Error("Envelope(edit) 缺少有效的 patch.operations");
        }
        const selection = figma.currentPage.selection;
        let table: FrameNode | null = null;
        if (selection.length > 0) {
          table = findTableFrameFromNode(selection[0] as any);
        }
        if (!table) {
          table = figma.root.findOne(
            (n) =>
              n.type === "FRAME" &&
              (n as FrameNode).layoutMode === "HORIZONTAL" &&
              (n as FrameNode).name.startsWith("Table ")
          ) as FrameNode | null;
        }
        if (!table) throw new Error("未找到需要编辑的表格。请选中表格或其任一子元素。");

        for (const op of env.patch.operations) {
          await applyOperationToTable(table, op);
          await yieldToMain();
        }
        
        const duration = Date.now() - startTime;
        figma.ui.postMessage({ 
          type: "log", 
          action: "MODIFY_TABLE", 
          duration, 
          userId: figma.currentUser?.id || "anonymous",
          metadata: { 
            opCount: env.patch.operations.length
          }
        });

        figma.ui.postMessage({ type: "edit_completed" });
        figma.ui.postMessage({ type: "ai_apply_envelope_done" });
        figma.notify("已应用增量变更");
      }
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : String(e);
      const duration = Date.now() - startTime;
      figma.ui.postMessage({ 
        type: "log", 
        action: env.intent === "create" ? "CREATE_TABLE" : "MODIFY_TABLE", 
        duration, 
        status: "FAIL",
        error: msg,
        userId: figma.currentUser?.id || "anonymous"
      });
      figma.notify("Envelope 应用失败: " + msg);
      postError(msg);
      figma.ui.postMessage({ type: "ai_apply_envelope_done" }); // Also reset on error
    } finally {
      setProcessing(false);
    }
    return;
  }
  if (message.type === "update_component_key") {
    setProcessing(true);
    try {
      await loadComponent(message.key);
      figma.notify("组件 Key 已更新");
    } catch (e: any) {
      figma.notify("更新组件 Key 失败: " + (e?.message ?? String(e)));
    } finally {
      setProcessing(false);
    }
  } else if (message.type === "set_col_width") {
    setProcessing(true);
    try {
      if (figma.currentPage.selection.length === 0) {
        figma.notify("请先选中单元格或列");
        return;
      }
      const mode = message.mode === "Fixed" ? "FIXED" : message.mode === "Hug" ? "HUG" : "FILL";
      
      // Lock container during operation
      const selection = figma.currentPage.selection;
      const table = findTableFrameFromNode(selection[0] as any);
      const container = table?.parent as FrameNode;
      const originalLocked = container?.locked ?? false;
      if (container) container.locked = true;
      
      try {
        setColumnLayout(mode);
        figma.notify(`列宽已设置为：${mode === "FIXED" ? "固定" : mode === "HUG" ? "适应" : "充满"}`);
      } finally {
        if (container) container.locked = originalLocked;
      }
    } catch (e: any) {
      figma.notify("设置列宽失败: " + e.message);
    } finally {
      setProcessing(false);
    }
  } else if (message.type === "set_table_rows") {
    setProcessing(true);
    try {
      const selection = figma.currentPage.selection;
      let table: FrameNode | null = null;
      if (selection.length > 0) {
        table = findTableFrameFromNode(selection[0] as any);
      }
      if (!table) {
        table = figma.root.findOne(
          (n) =>
            n.type === "FRAME" &&
            (n as FrameNode).layoutMode === "HORIZONTAL" &&
            (n as FrameNode).name.startsWith("Smart Table") &&
            n.getPluginData("smart_table") === "true"
        ) as FrameNode | null;
      }
      if (!table) {
        figma.notify("未找到需要调整的表格。请选中表格或其任一子元素。");
        return;
      }

      const container = table.parent as FrameNode;
      const originalLocked = container?.locked ?? false;
      if (container) container.locked = true;

      try {
        // 保存到 Plugin Data
        table.setPluginData("rowCount", message.rows.toString());

        const currentContext = await getTableContext(table);
        if (!currentContext) throw new Error("无法获取表格上下文");
        
        const currentRows = currentContext.rows;
        const newRows = message.rows;
        
        if (newRows > currentRows) {
          await applyOperationToTable(table, { 
            op: "add_rows", 
            count: newRows - currentRows, 
            position: "end" 
          });
          figma.notify(`表格已增加 ${newRows - currentRows} 行`);
        } else if (newRows < currentRows) {
          const countToRemove = currentRows - newRows;
          // Remove from the end
          const indexes = Array.from({ length: countToRemove }, (_, i) => currentRows - 1 - i);
          await applyOperationToTable(table, { 
            op: "remove_rows", 
            indexes 
          });
          figma.notify(`表格已删除 ${countToRemove} 行`);
        } else {
          figma.notify("行数未发生变化");
        }
      } finally {
        if (container) container.locked = originalLocked;
      }
    } catch (e: any) {
      figma.notify("调整行数失败: " + e.message);
    } finally {
      setProcessing(false);
    }
  }

  if (message.type === "set_header_props") {
    setProcessing(true);
    try {
      const { filter, sort, search, info } = message.props;
      const selection = figma.currentPage.selection;
      if (selection.length === 0) {
        figma.notify("请先选中单元格");
        return;
      }

      // Determine mode from props
      let mode: HeaderMode = "none";
      if (filter) mode = "filter";
      else if (sort) mode = "sort";
      else if (search) mode = "search";
      else if (info) mode = "info";

      for (const node of selection) {
        const col = findColumnFrame(node);
        if (col) {
          const table = col.parent as FrameNode;
          const cols = getColumnFrames(table);
          const colIndex = cols.indexOf(col);
          if (colIndex !== -1) {
            await applyHeaderModeToColumn(table, colIndex, mode);
          }
        }
      }
      figma.notify("已更新表头设置");
    } finally {
      setProcessing(false);
    }
  }

  if (message.type === "set_header_mode") {
    setProcessing(true);
    try {
      const { mode } = message;
      const selection = figma.currentPage.selection;
      if (selection.length === 0) {
        figma.notify("请先选中单元格");
        return;
      }

      for (const node of selection) {
        const col = findColumnFrame(node);
        if (col) {
          const table = col.parent as FrameNode;
          const cols = getColumnFrames(table);
          const colIndex = cols.indexOf(col);
          if (colIndex !== -1) {
            await applyHeaderModeToColumn(table, colIndex, mode);
          }
        }
      }
      figma.notify("已更新表头设置");
    } finally {
      setProcessing(false);
    }
  }

  if (message.type === "set_cell_align") {
    setProcessing(true);
    try {
      const selection = figma.currentPage.selection;
      if (selection.length === 0) {
        figma.notify("请先选中单元格或列");
        return;
      }
      let updateCount = 0;
      for (const node of selection) {
        const updateAlign = async (n: SceneNode) => {
          if (n.type === "FRAME" && n.getPluginData("cellType")) {
            const frame = n as FrameNode;
            const isHeader = isHeaderNode(frame);
            
            if (message.align === "left") {
              frame.primaryAxisAlignItems = "MIN";
              const textNode = frame.findOne(c => c.type === "TEXT") as TextNode;
              if (textNode) textNode.textAlignHorizontal = "LEFT";
              frame.setPluginData("textAlign", "left");
              updateCount++;
              return true;
            } else if (message.align === "right") {
              frame.primaryAxisAlignItems = "MAX";
              const textNode = frame.findOne(c => c.type === "TEXT") as TextNode;
              if (textNode) textNode.textAlignHorizontal = "RIGHT";
              frame.setPluginData("textAlign", "right");
              updateCount++;
              return true;
            } else if (message.align === "center" && !isHeader) {
              frame.primaryAxisAlignItems = "CENTER";
              const textNode = frame.findOne(c => c.type === "TEXT") as TextNode;
              if (textNode) textNode.textAlignHorizontal = "CENTER";
              frame.setPluginData("textAlign", "center");
              updateCount++;
              return true;
            }
          } else if (n.type === "INSTANCE") {
              if (await setInstanceAlign(n as InstanceNode, message.align)) {
                updateCount++;
                return true;
              }
          }
          return false;
        };

        if (node.type === "FRAME" && node.layoutMode === "VERTICAL") {
          node.setPluginData("textAlign", message.align);
          for (let i = 0; i < node.children.length; i++) {
            await updateAlign(node.children[i]);
          }
        } else {
          await updateAlign(node);
        }
      }
      if (updateCount > 0) {
        figma.notify(`已更新 ${updateCount} 个单元格对齐方式`);
      } else {
        figma.notify("未找到可更新对齐方式的单元格");
      }
    } finally {
      setProcessing(false);
    }
  }

  if (message.type === "set_cell_type") {
    // 只有在涉及组件加载等可能较慢的操作时，才考虑阻塞 UI，或者完全移除阻塞
    // setProcessing(true); 
    try {
      const { cellType } = message;
      const selection = figma.currentPage.selection;
      let updateCount = 0;

      // Special handling for Custom Cells (Tag, Avatar, etc.)
      const customRenderer = CUSTOM_CELL_REGISTRY[cellType as ColumnType];
      const hasCustomRenderer = !!customRenderer;
      if (hasCustomRenderer) {
        try {
          let context: any = {};
          if (cellType === "Tag") {
            const { component: tagComponent } = await resolveCellFactory(TAG_COMPONENT_KEY);
            const { component: counterComponent } = await resolveCellFactory(TAG_COUNTER_COMPONENT_KEY);
            context = { tagComponent, counterComponent: counterComponent || tagComponent };
          } else if (cellType === "Avatar") {
            const { component: avatarComponent } = await resolveCellFactory(AVATAR_COMPONENT_KEY);
            context = { 
              avatarComponent,
              overrideDisplayValue: "" // We will set this per-cell in the loop below
            };
            console.log("[set_cell_type] Avatar context prepared", context);
          } else if (cellType === "ActionText") {
            const { component: moreIconComponent } = await resolveCellFactory(ACTION_MORE_ICON_COMPONENT_KEY);
            context = { moreIconComponent };
          } else if (cellType === "ActionIcon") {
            const { component: editIconComponent } = await resolveCellFactory(EDIT_ICON_COMPONENT_KEY);
            const { component: deleteIconComponent } = await resolveCellFactory(DELETE_ICON_COMPONENT_KEY);
            const { component: actionMoreIconComponent } = await resolveCellFactory(ACTION_MORE_ICON_COMPONENT_KEY);
            context = { editIconComponent, deleteIconComponent, actionMoreIconComponent };
          } else if (cellType === "Input") {
            const { component: inputComponent } = await resolveCellFactory(INPUT_COMPONENT_KEY);
            context = { inputComponent };
          } else if (cellType === "Select") {
            const { component: selectComponent } = await resolveCellFactory(SELECT_COMPONENT_KEY);
            context = { selectComponent };
          } else if (cellType === "State") {
            const { component: stateComponent } = await resolveCellFactory(STATE_COMPONENT_KEY);
            context = { stateComponent };
          }

          if (hasCustomRenderer) {
            for (const node of selection) {
              let nodesToUpdate: SceneNode[] = [];
              if (node.type === "FRAME" && node.layoutMode === "VERTICAL") {
                nodesToUpdate = node.children.slice(await getHeaderOffset(node as FrameNode));
                const isHug = (cellType === "ActionText" || cellType === "ActionIcon");
                node.layoutSizingHorizontal = isHug ? "HUG" : "FILL";
                if (!isHug) {
                  node.counterAxisSizingMode = "FIXED";
                }
                node.setPluginData("cellType", cellType);
                
                // Also update width of children cells
                for (const child of node.children) {
                  if (child.type === "FRAME" || child.type === "INSTANCE") {
                    if (isHeaderNode(child)) {
                      (child as any).layoutSizingHorizontal = "FILL";
                      if ("layoutAlign" in child) {
                        (child as any).layoutAlign = "STRETCH";
                      }
                    } else {
                      (child as any).layoutSizingHorizontal = isHug ? "HUG" : "FILL";
                      if (isHug && "layoutAlign" in child) {
                        (child as any).layoutAlign = "INHERIT";
                      } else if (!isHug && "layoutAlign" in child) {
                        (child as any).layoutAlign = "STRETCH";
                      }
                    }
                  }
                }
                if (cellType === "ActionIcon" || cellType === "ActionText") {
                  node.setPluginData("cellValue", "编辑 删除 …");
                }
              } else if (node.type === "INSTANCE" || (node.type === "FRAME" && node.getPluginData("cellType"))) {
                nodesToUpdate = [node];
                // If we are updating individual cells, we should also check if the parent column needs a layout update
                const parentCol = findColumnFrame(node as SceneNode);
                if (parentCol) {
                  const isHug = (cellType === "ActionText" || cellType === "ActionIcon");
                  parentCol.layoutSizingHorizontal = isHug ? "HUG" : "FILL";
                  if (!isHug) {
                    parentCol.counterAxisSizingMode = "FIXED";
                  }
                  parentCol.setPluginData("cellType", cellType);
                }
              }

              for (const n of nodesToUpdate) {
                const originalText = extractTextFromNode(n);
                
                let cellFrame: FrameNode;
                let parent = n.parent;
                let index = parent ? parent.children.indexOf(n) : -1;

                if (n.type === "FRAME" && n.getPluginData("cellType") === cellType) {
                  cellFrame = n as FrameNode;
                  for (const child of cellFrame.children) {
                    child.remove();
                  }
                } else {
                  cellFrame = createCustomCellFrame(n.name, cellType);
                  if (parent) {
                    parent.insertChild(index, cellFrame);
                    n.remove();
                  }
                }

                applyCellCommonStyling(cellFrame);
                cellFrame.layoutSizingHorizontal = "FILL"; 
                
                if (cellType === "Text") {
                  const displayMode = cellFrame.getPluginData("textDisplayMode") || "ellipsis";
                  if (displayMode === "lineBreak") {
                    cellFrame.counterAxisSizingMode = "AUTO";
                    cellFrame.layoutSizingVertical = "HUG";
                  } else {
                    cellFrame.counterAxisSizingMode = "FIXED";
                    cellFrame.layoutSizingVertical = "FIXED";
                    
                    let targetHeight = tableSwitchesState.rowHeight;
                    const table = findTableFrameFromNode(cellFrame);
                    if (table) {
                      const savedHeight = table.getPluginData("tableRowHeight");
                      if (savedHeight) {
                        targetHeight = parseInt(savedHeight, 10) || tableSwitchesState.rowHeight;
                      }
                    }
                    cellFrame.resize(cellFrame.width, targetHeight);
                  }
                } else {
                  cellFrame.layoutSizingVertical = "FIXED";
                  
                  let targetHeight = tableSwitchesState.rowHeight;
                  const table = findTableFrameFromNode(cellFrame);
                  if (table) {
                    const savedHeight = table.getPluginData("tableRowHeight");
                    if (savedHeight) {
                      targetHeight = parseInt(savedHeight, 10) || tableSwitchesState.rowHeight;
                    }
                  }
                  cellFrame.resize(cellFrame.width, targetHeight);
                }
                
                cellFrame.layoutAlign = "STRETCH"; 
                
                // Force layout mode and sizing again after renderer to ensure it sticks
                if (cellType === "ActionText" || cellType === "ActionIcon") {
                  cellFrame.layoutMode = "HORIZONTAL";
                  cellFrame.primaryAxisSizingMode = "FIXED"; 
                  cellFrame.counterAxisSizingMode = "FIXED";
                }
                
                let textToRender = originalText;
                if (cellType === "ActionIcon" || cellType === "ActionText") {
                  textToRender = "编辑 删除 …";
                }
                
                // Sync metadata to cell frame
                cellFrame.setPluginData("cellType", cellType);
                if (textToRender) {
                  cellFrame.setPluginData("cellValue", textToRender);
                }

                if (cellType === "Avatar") {
                  context.overrideDisplayValue = getDefaultAvatarName(textToRender);
                }

                console.log("[set_cell_type] Calling customRenderer", { 
                  cellType, 
                  textToRender, 
                  hasOverride: !!context.overrideDisplayValue,
                  override: context.overrideDisplayValue 
                });
                await customRenderer(cellFrame, textToRender, context);
                
                // Also update parent column if all cells in column are being updated
                const parentCol = findColumnFrame(cellFrame);
                if (parentCol) {
                  parentCol.setPluginData("cellType", cellType);
                  if (textToRender) parentCol.setPluginData("cellValue", textToRender);
                }
                
                updateCount++;
              }
            }
            
            if (updateCount > 0) {
              let label = "文字";
              if (cellType === "Tag") label = "标签";
              else if (cellType === "Avatar") label = "头像";
              else if (cellType === "ActionText") label = "操作";
              else if (cellType === "Input") label = "输入";
              else if (cellType === "Select") label = "选择";
              else if (cellType === "Text") label = "文本";
              figma.notify(`已更新 ${updateCount} 个单元格为${label}类型`);
            } else {
              figma.notify("未找到可更新的单元格");
            }
            postSelection();
            return;
          }
        } catch (e) {
          console.warn(`Failed to apply ${cellType} component`, e);
          figma.notify(`应用${cellType}组件失败: ` + e);
          return;
        }
      }

      // Standard Cell Types (Text, Icon, etc.) handled by Instance Swapping
      const criteria = getCellVariantCriteria(cellType as ColumnType);

      for (const node of selection) {
        // If column selected, iterate children
        let nodesToUpdate: SceneNode[] = [];
        if (node.type === "FRAME" && node.layoutMode === "VERTICAL") {
          nodesToUpdate = node.children.slice(await getHeaderOffset(node as FrameNode));
          
          // Ensure layout settings
          const isHug = (cellType === "ActionText" || cellType === "ActionIcon");
          node.layoutSizingHorizontal = isHug ? "HUG" : "FILL";
          if (!isHug) {
            node.counterAxisSizingMode = "FIXED";
          }
        } else if (node.type === "INSTANCE" || (node.type === "FRAME" && node.getPluginData("cellType"))) {
          nodesToUpdate = [node];
          // Also update parent column if needed
          const parentCol = findColumnFrame(node as SceneNode);
          if (parentCol) {
            const isHug = (cellType === "ActionText" || cellType === "ActionIcon");
            parentCol.layoutSizingHorizontal = isHug ? "HUG" : "FILL";
            if (!isHug) {
              parentCol.counterAxisSizingMode = "FIXED";
            }
          }
        }

        // Update cells width
        const isHug = (cellType === "ActionText" || cellType === "ActionIcon");
        for (const n of nodesToUpdate) {
          if ("layoutSizingHorizontal" in n) {
            (n as any).layoutSizingHorizontal = isHug ? "HUG" : "FILL";
            if (isHug && "layoutAlign" in n) {
              (n as any).layoutAlign = "INHERIT";
            }
          }
        }

        // Prepare target component for swap if needed
        // Default to CELL_COMPONENT_KEY for standard types
        let targetComponentKey = CELL_COMPONENT_KEY;

        let targetComponentSet: ComponentNode | ComponentSetNode | undefined;
        
        for (const nodeItem of nodesToUpdate) {
          let n = nodeItem as SceneNode;

          // Handle Custom Frame -> Instance conversion (for standard types)
          const currentCellType = n.type === "FRAME" ? n.getPluginData("cellType") : "";
          if (n.type === "FRAME" && ["Text", "Tag", "Avatar", "ActionText", "Input", "Select"].includes(currentCellType)) {
            const originalText = extractTextFromNode(n);

            try {
              const { component } = await resolveCellFactory(CELL_COMPONENT_KEY);
              if (component) {
                let inst: InstanceNode;
                if (component.type === "COMPONENT_SET") {
                  const def = component.defaultVariant as ComponentNode;
                  inst = (def ?? component.children[0]).createInstance();
                } else {
                  inst = (component as ComponentNode).createInstance();
                }
                
                const t = inst.findOne(x => x.type === "TEXT") as TextNode;
                if (t) {
                  await loadTextNodeFonts(t);
                  t.characters = originalText || (currentCellType === "Avatar" ? getDefaultAvatarName(originalText) : "");
                }

                const parent = n.parent;
                if (parent) {
                  const index = parent.children.indexOf(n);
                  
                  // Insert FIRST, then set sizing props to avoid "not child of auto-layout" error
                  parent.insertChild(index, inst);
                  
                  inst.layoutSizingHorizontal = "FILL";
                  inst.layoutSizingVertical = "FIXED";
                  inst.resize(n.width, n.height);
                  
                  n.remove();
                  n = inst;
                }
              }
            } catch (e) {
              console.warn("Failed to convert Custom Frame to Instance", e);
              continue;
            }
          }

          if (n.type === "INSTANCE") {
            // 1. Extract text before swap
            let originalText = "";
            try {
              const textNodes = n.findAll(child => child.type === "TEXT") as TextNode[];
              if (textNodes.length > 0) {
                originalText = textNodes.map(t => t.characters).join(" ");
              }
            } catch (e) {}

            const main = await n.getMainComponentAsync();
            const currentKey = main?.key;
            const parentKey = (main?.parent as ComponentSetNode)?.key;
            
            // Check if current instance matches target component key
            const isTargetComponent = currentKey === targetComponentKey || parentKey === targetComponentKey;
            
            if (!isTargetComponent) {
              // Load target component if not loaded
              if (!targetComponentSet) {
                try {
                  const { component } = await resolveCellFactory(targetComponentKey);
                  targetComponentSet = component;
                } catch (e) {
                  console.warn("Failed to resolve target component", e);
                }
              }

              if (targetComponentSet) {
                try {
                  if (targetComponentSet.type === "COMPONENT_SET") {
                    const def = targetComponentSet.defaultVariant as ComponentNode;
                    const target = def ?? targetComponentSet.children[0] as ComponentNode;
                    if (target) n.swapComponent(target);
                  } else {
                    n.swapComponent(targetComponentSet as ComponentNode);
                  }
                } catch (e) {
                  console.warn("Swap to target component failed", e);
                }
              }
            }

            // Re-fetch main after potential swap
            const newMain = await n.getMainComponentAsync();
            if (newMain && newMain.parent && newMain.parent.type === "COMPONENT_SET") {
              const componentSet = newMain.parent;
              
              // Use robust criteria creation
              const criteria = createVariantCriteria(componentSet, cellType);
              
              const targetVariant = findVariant(componentSet, criteria);
              if (targetVariant) {
                n.swapComponent(targetVariant);
                updateCount++;
              }

              // Sync to plugin data for selection readout and persistence
              n.setPluginData("cellType", cellType);
              if (originalText) {
                n.setPluginData("cellValue", originalText);
              } else if (cellType === "Avatar") {
                n.setPluginData("cellValue", getDefaultAvatarName(extractTextFromNode(n)));
              } else if (cellType === "ActionIcon" || cellType === "ActionText") {
                n.setPluginData("cellValue", "编辑 删除 …");
              }

              // Also update parent column if all cells in column are being updated
              const parentCol = findColumnFrame(n);
              if (parentCol) {
                parentCol.setPluginData("cellType", cellType);
                const val = n.getPluginData("cellValue");
                if (val) parentCol.setPluginData("cellValue", val);
              }
            }
            
            // 2. Restore text if converting to Text type
            if (cellType === "Text" && originalText) {
              try {
                const newTextNodes = n.findAll(child => child.type === "TEXT") as TextNode[];
                if (newTextNodes.length > 0) {
                  const t = newTextNodes[0];
                  await loadTextNodeFonts(t);
                  t.characters = originalText;
                }
              } catch (e) {}
            }
          }
        }
      }
      if (updateCount > 0) {
        figma.notify(`已更新 ${updateCount} 个单元格类型`);
      } else {
        figma.notify("未找到可更新的单元格");
      }
    } finally {
      // setProcessing(false);
    }
  }

  if (message.type === "set_text_display_mode") {
    setProcessing(true);
    try {
      const selection = figma.currentPage.selection;
      if (selection.length === 0) {
        figma.notify("请先选中单元格");
        return;
      }
      let updateCount = 0;
      for (const node of selection) {
        const updateNode = async (n: SceneNode) => {
          if (n.type === "FRAME" && n.getPluginData("cellType") === "Text") {
            n.setPluginData("textDisplayMode", message.mode);
            const cellValue = n.getPluginData("cellValue") || extractTextFromNode(n);
            await renderTextCell(n as FrameNode, cellValue, {});
            updateCount++;
          }
        };

        if (node.type === "FRAME" && node.layoutMode === "VERTICAL") {
          const children = node.children.slice(await getHeaderOffset(node as FrameNode));
          for (const child of children) {
            await updateNode(child as SceneNode);
          }
        } else {
          await updateNode(node as SceneNode);
        }
      }
      if (updateCount > 0) {
        figma.notify(`已更新 ${updateCount} 个单元格显示模式`);
        postSelection();
      } else {
        figma.notify("未选中文字类型单元格");
      }
    } finally {
      setProcessing(false);
    }
  }

  if (message.type === "apply_to_column") {
    setProcessing(true);
    try {
      if (figma.currentPage.selection.length !== 1) {
        figma.notify("请选中一个作为模板的单元格");
        return;
      }
      // If selection is inside a cell (e.g. text node), we need to find the cell frame first.
      // A cell is a direct child of a column frame.
      let sourceCell = figma.currentPage.selection[0] as SceneNode;
      const columnFrame = findColumnFrame(sourceCell);
      
      if (!columnFrame) {
        figma.notify("请选中表格中的单元格或元素");
        return;
      }
      
      // If the selected node is not a direct child of columnFrame, traverse up to find the cell
      if (sourceCell.parent !== columnFrame) {
         let cur = sourceCell;
         while (cur.parent && cur.parent !== columnFrame) {
            cur = cur.parent as SceneNode;
         }
         // Now cur should be the direct child of columnFrame (the cell)
         if (cur.parent === columnFrame) {
            sourceCell = cur;
         } else {
            // Should not happen if findColumnFrame works correctly
            figma.notify("无法定位所属单元格");
            return;
         }
      }

      const table = findTableFrameFromNode(columnFrame);
      if (!table) {
        figma.notify("未找到表格容器");
        return;
      }

      const container = table.parent as FrameNode;
      const originalLocked = container?.locked ?? false;
      if (container) container.locked = true;

      try {
        const cols = getColumnFrames(table);
        const colIndex = cols.indexOf(columnFrame);
        if (colIndex === -1) {
          figma.notify("未找到列索引");
          return;
        }

        // Simply clone the source cell and replace all other cells in the column
        const children = columnFrame.children;
        const headerOffset = await getHeaderOffset(columnFrame);
        let updateCount = 0;
        
        // Use a loop that is safe against array modification (though we are replacing items in place)
        // We iterate from headerOffset to end
        for (let i = headerOffset; i < children.length; i++) {
          const target = children[i];
          
          // Skip the source cell itself to avoid removing it
          if (target.id === sourceCell.id) continue;
          
          if (target.type === "FRAME" || target.type === "INSTANCE") {
            try {
              const newCell = sourceCell.clone();
              
              // Insert at the same position
              columnFrame.insertChild(i, newCell);
              
              // Ensure layout properties are correct
              if ("layoutSizingHorizontal" in newCell) {
                (newCell as any).layoutSizingHorizontal = "FILL";
              }
              // Reset height to fixed or hug? Usually fixed for table rows unless variable height
              // But clone() should preserve the height mode of the source.
              // If source is auto-height (HUG), newCell will be too.
              
              // Remove the old cell
              target.remove();
              
              updateCount++;
              
              // Sync row height
              await alignTableRows(table, i, [newCell]);
            } catch (e) {
              console.error("Failed to clone/replace cell at index " + i, e);
            }
          }
        }
        
        figma.notify(`已将内容应用到 ${updateCount} 个单元格`);
      } finally {
        if (container) container.locked = originalLocked;
      }
    } finally {
      setProcessing(false);
    }
  }

  if (message.type === "add_column") {
    setProcessing(true);
    try {
      const selection = figma.currentPage.selection;
      let table: FrameNode | null = null;
      let targetColumnIndex = -1;

      if (selection.length > 0) {
        const node = selection[0];
        table = findTableFrameFromNode(node);
        
        // Try to find the specific column to insert after
        const colFrame = findColumnFrame(node);
        if (colFrame && table) {
            const cols = getColumnFrames(table);
            targetColumnIndex = cols.indexOf(colFrame);
        }
      }
      
      if (!table) {
        figma.notify("请先选中表格或表格内的元素");
        return;
      }

      const container = table.parent as FrameNode;
      const originalLocked = container?.locked ?? false;
      if (container) container.locked = true;

      try {
        await applyOperationToTable(table, {
          op: "add_cols",
          count: 1,
          position: targetColumnIndex !== -1 ? targetColumnIndex + 1 : "end"
        });
        const msg = targetColumnIndex !== -1 
            ? `已在选中列右侧添加一列` 
            : "已在最右侧添加一列";
        figma.notify(msg);
      } catch (e: any) {
        figma.notify("添加列失败: " + e.message);
      } finally {
        if (container) container.locked = originalLocked;
      }
    } finally {
      setProcessing(false);
    }
    return;
  }

  if (message.type === "get_component_props") {
    setProcessing(true);
    try {
      // Priority: 1. Key from message (if we add it to message) 2. Selection
      // The UI currently sends { type: "get_component_props" } but we can change UI or just check selection.
      // However, the user wants to read a specific component by key because they can't select it (maybe).
      // Let's check if the user entered a key in the UI input, but the message structure needs to support it?
      // Actually, let's just use the logic: if selection is empty, check if we can inspect by key provided in a new field? 
      // Wait, the UI has `componentKeyInput`. We should update UI to send it.
      
      // For now, let's fix the "Reading..." stuck issue and support key.
      
      let targetNode: ComponentNode | ComponentSetNode | InstanceNode | null = null;
      
      // Try to use the key from the message if provided (we need to update interface)
      // Or just rely on selection for now, but fix the stuck issue.
      
      if (figma.currentPage.selection.length === 1) {
          const node = figma.currentPage.selection[0];
          if (node.type === "INSTANCE" || node.type === "COMPONENT" || node.type === "COMPONENT_SET") {
              targetNode = node;
          }
      }
      
      if (!targetNode) {
        // Try to load by key if provided in message (need to update UI to send it)
        // Let's assume we will update UI to send `key`
        if ((message as any).key) {
            try {
                targetNode = await loadComponent((message as any).key);
            } catch (e) {
                figma.notify("无法加载该 Key 的组件: " + e);
                postError("无法加载该 Key 的组件");
                return;
            }
        }
      }

      if (!targetNode) {
        figma.notify("请选中一个组件/实例，或在输入框填写 Key");
        postError("未选中组件或 Key 无效");
        return;
      }

      let props: any[] = [];
      if (targetNode.type === "INSTANCE") {
        props = Object.entries(targetNode.componentProperties).map(([key, val]) => ({
          name: key,
          type: val.type,
          defaultValue: val.value
        }));
      } else if (targetNode.type === "COMPONENT" || targetNode.type === "COMPONENT_SET") {
        // If it's a Component Set, we might want to list variants?
        // componentPropertyDefinitions gives the properties of the set.
        const definitions = targetNode.componentPropertyDefinitions;
        props = Object.entries(definitions).map(([key, def]) => ({
          name: key,
          type: def.type,
          defaultValue: def.defaultValue,
          variantOptions: def.variantOptions
        }));
      }

      figma.ui.postMessage({ type: "component_props", props });
      figma.notify("已读取属性");
    } finally {
      setProcessing(false);
    }
  }

  if (message.type === "set_table_size") {
    setProcessing(true);
    try {
      const selection = figma.currentPage.selection;
      if (selection.length === 0) return;
      const table = findTableFrameFromNode(selection[0] as any);
      if (!table) return;

      const container = table.parent as FrameNode;
      const originalLocked = container?.locked ?? false;
      if (container) container.locked = true;

      try {
        const sizeMap = {
          mini: 32,
          default: 40,
          medium: 48,
          large: 56
        };
        const h = sizeMap[message.size];
        
        // Update global state for future creations
        tableSwitchesState.rowHeight = h;
        
        // Save current row height to table plugin data
        table.setPluginData("tableRowHeight", h.toString());
        
        const cols = getColumnFrames(table);
        for (const col of cols) {
           // Header and body cells should all follow row height
           for (let i = 0; i < col.children.length; i++) {
              const cell = col.children[i] as FrameNode;
              
              // Skip cells that are in "lineBreak" mode
              if (cell.type === "FRAME" && cell.getPluginData("cellType") === "Text") {
                 const displayMode = cell.getPluginData("textDisplayMode") || "ellipsis";
                 if (displayMode === "lineBreak") {
                    // Keep it auto-height
                    cell.counterAxisSizingMode = "AUTO";
                    cell.layoutSizingVertical = "HUG";
                    continue;
                 }
              }

              if ("layoutSizingVertical" in cell) {
                 cell.layoutSizingVertical = "FIXED";
                 cell.resize(cell.width, h);
              }
           }
        }
        postSelection();
      } finally {
        if (container) container.locked = originalLocked;
      }
    } finally {
      setProcessing(false);
    }
  }

  if (message.type === "set_row_action") {
     setProcessing(true);
     try {
       const selection = figma.currentPage.selection;
       if (selection.length === 0) return;
       const table = findTableFrameFromNode(selection[0] as any);
       if (!table) return;
       
       const container = table.parent as FrameNode;
       const originalLocked = container?.locked ?? false;
       if (container) container.locked = true;

       try {
         // Store it on the table frame
         table.setPluginData("rowActionType", message.action);

         // 强制触发一次 UI 状态更新，确保选中态同步
         postSelection();

         const cols = getColumnFrames(table);
         if (cols.length === 0) return;

         // Identify if the first column is a row action column using plugin data
         const firstCol = cols[0];
         const isActionCol = firstCol.getPluginData("isRowActionColumn") === "true";

         if (message.action === "none") {
             if (isActionCol) {
                 firstCol.remove();
                 figma.notify("已移除操作列");
             }
             return;
         }

         // Map message.action to the type expected by createRowActionColumn
         let type: "Checkbox" | "Radio" | "Drag" | "Expand" | "Switch" = "Checkbox";
         if (message.action === "multiple") type = "Checkbox";
         else if (message.action === "single") type = "Radio";
         else if (message.action === "drag") type = "Drag";
         else if (message.action === "expand") type = "Expand";
         else if (message.action === "switch") type = "Switch";

         // If it's already an action column and the type is the same, do nothing
         if (isActionCol && firstCol.getPluginData("rowActionType") === type) {
             return;
         }

        // If it's an action column but different type, or not an action column at all
        if (isActionCol) {
            // Record position to replace it exactly
            const index = table.children.indexOf(firstCol);
            firstCol.remove();
            
            // Calculate rows (excluding header)
            // We look at other columns to determine row count
            const otherCol = getColumnFrames(table)[0];
            if (otherCol) {
                const offset = await getHeaderOffset(otherCol);
                const rowCount = otherCol.children.length - offset;

                // Create the new row action column at the same position
                const newCol = await createRowActionColumn(table, rowCount, type);
                table.insertChild(index, newCol);
            }
        } else {
            // Original logic for adding a new action column at the beginning
            const otherCol = getColumnFrames(table)[0];
            if (otherCol) {
                const offset = await getHeaderOffset(otherCol);
                const rowCount = otherCol.children.length - offset;
                await createRowActionColumn(table, rowCount, type);
            }
        }

        figma.notify(`已设置操作列为 ${type}`);
        postSelection();
      } finally {
        if (container) container.locked = originalLocked;
      }
    } finally {
      setProcessing(false);
    }
  }

  if (message.type === "set_table_switch") {
     setProcessing(true);
     try {
       // Update global state for future creations
       if (message.key in tableSwitchesState) {
         (tableSwitchesState as any)[message.key] = message.enabled;
       }

       const selection = figma.currentPage.selection;
       if (selection.length === 0) return;
       const table = findTableFrameFromNode(selection[0] as any);
       if (!table) return;

       const container = table.parent as FrameNode;
       const originalLocked = container?.locked ?? false;
       if (container) container.locked = true;

       try {
         // 保存到 Plugin Data
         const mapping: Record<string, string> = {
             "tabs": "hasTabs",
             "filter": "hasFilter",
             "actions": "hasActions",
             "pagination": "hasPagination"
         };
         const standardKey = mapping[message.key] || `switch_${message.key}`;
         table.setPluginData(standardKey, message.enabled ? "true" : "false");
         
         if (!container || container.type !== "FRAME") return;

         if (message.key === "pagination") {
             let pager: SceneNode | undefined;
             for (const c of container.children) {
                 if (c.name.includes("Pagination")) {
                     pager = c;
                     break;
                 }
                 if (c.type === "INSTANCE") {
                     const main = await (c as InstanceNode).getMainComponentAsync();
                     if (main?.key === PAGINATION_COMPONENT_KEY || (main?.parent?.type === "COMPONENT_SET" && (main.parent as ComponentSetNode).key === PAGINATION_COMPONENT_KEY)) {
                         pager = c;
                         break;
                     }
                 }
             }
             
             if (!pager && message.enabled) {
                    try {
                        const comp = await loadComponent(PAGINATION_COMPONENT_KEY, "Pagination");
                        let inst: SceneNode | null = null;
                        if (comp.type === "COMPONENT_SET") {
                         const defaultVar = comp.defaultVariant as ComponentNode | undefined;
                         const target = defaultVar ?? (comp.children.find((c) => c.type === "COMPONENT") as ComponentNode | undefined);
                         if (target) inst = target.createInstance();
                     } else {
                         inst = (comp as ComponentNode).createInstance();
                     }
                     if (inst) {
                         inst.name = "Pagination";
                         // Ensure paginator is always at the bottom
                         container.insertChild(container.children.length, inst);
                         if ("layoutSizingHorizontal" in inst) {
                             (inst as any).layoutSizingHorizontal = "FILL";
                         }
                         pager = inst;
                     }
                 } catch (e) {
                     console.warn("Failed to load Pagination", e);
                 }
             }
             
             if (pager) {
                 pager.visible = message.enabled;
             }
         } else {
             let topBar = container.children.find(c => c.name === "Top Bar Container") as FrameNode | undefined;
             if (!topBar && message.enabled) {
                 // Create Top Bar if missing
                 topBar = figma.createFrame();
                 topBar.name = "Top Bar Container";
                 topBar.layoutMode = "HORIZONTAL";
                 topBar.counterAxisSizingMode = "AUTO";
                 topBar.primaryAxisSizingMode = "FIXED";
                 topBar.itemSpacing = 20;
                 topBar.paddingBottom = 20;
                 topBar.fills = [];
                 topBar.clipsContent = false;
                 container.insertChild(0, topBar); // Insert at top
                 topBar.layoutSizingHorizontal = "FILL";
             }

             if (topBar && topBar.type === "FRAME") {
                 const nameMap: Record<string, string> = {
                     filter: "Filter",
                     actions: "Actions",
                     tabs: "Tabs",
                     pagination: "" 
                 };
                 const keyMap: Record<string, string> = {
                     filter: FILTER_COMPONENT_KEY,
                     actions: BUTTON_GROUP_COMPONENT_KEY,
                     tabs: TABS_COMPONENT_KEY
                 };
                 const layoutMap: Record<string, "FILL" | "HUG"> = {
                     filter: "FILL",
                     actions: "HUG",
                     tabs: "HUG"
                 };

                 const targetName = nameMap[message.key];
                 const targetKey = keyMap[message.key];
                 
                 if (targetName && targetKey) {
                     let target = topBar.children.find(c => c.name === targetName);
                     
                     if (!target && message.enabled) {
                        try {
                            const comp = await loadComponent(targetKey, targetName);
                            let inst: SceneNode | null = null;
                            if (comp.type === "COMPONENT_SET") {
                                 const defaultVar = comp.defaultVariant as ComponentNode | undefined;
                                 const targetNode = defaultVar ?? (comp.children.find((c) => c.type === "COMPONENT") as ComponentNode | undefined);
                                 if (targetNode) inst = targetNode.createInstance();
                             } else {
                                 inst = (comp as ComponentNode).createInstance();
                             }
                             
                             if (inst) {
                                 inst.name = targetName;
                                 // Top Bar order: Tabs, Filter, Actions.
                                 const order = ["Tabs", "Filter", "Actions"];
                                 const idx = order.indexOf(targetName);
                                 
                                 let insertIndex = topBar.children.length;
                                 for(let i=0; i<topBar.children.length; i++) {
                                     const cName = topBar.children[i].name;
                                     const cIdx = order.indexOf(cName);
                                     if (cIdx > idx) {
                                         insertIndex = i;
                                         break;
                                     }
                                 }
                                 topBar.insertChild(insertIndex, inst);

                                 if ("layoutSizingHorizontal" in inst) {
                                     (inst as any).layoutSizingHorizontal = layoutMap[message.key] === "FILL" ? "FILL" : "HUG";
                                 }
                                 target = inst;
                             }
                         } catch (e) {
                             console.warn(`Failed to load ${targetName}`, e);
                         }
                     }

                     if (target) {
                         if (message.key === "filter" && target.type === "INSTANCE") {
                             // Filter logic: Switch OFF -> Quantity="0", Switch ON -> Quantity="3"
                             target.visible = true;
                             const props = target.componentProperties;
                             const key = Object.keys(props).find(k => k.includes("数量"));
                             if (key) {
                                 const val = message.enabled ? "3" : "0";
                                 try {
                                     target.setProperties({ [key]: val });
                                 } catch (e) {}
                             } else {
                                 // Fallback
                                 target.visible = message.enabled;
                             }
                         } else {
                             target.visible = message.enabled;
                         }
                     }
                     
                     // Update Top Bar visibility
                     const tabs = topBar.children.find(c => c.name === "Tabs");
                     const filter = topBar.children.find(c => c.name === "Filter");
                     const actions = topBar.children.find(c => c.name === "Actions");
                     
                     const isFilterActive = () => {
                         if (!filter || !filter.visible) return false;
                         if (filter.type === "INSTANCE") {
                             const props = filter.componentProperties;
                             const key = Object.keys(props).find(k => k.includes("数量"));
                             if (key && props[key].value === "0") return false;
                         }
                         return true;
                     };

                     const anyVisible = (tabs?.visible ?? false) || isFilterActive() || (actions?.visible ?? false);
                     topBar.visible = anyVisible;
                 }
             }
         }
         postSelection();
       } finally {
         if (container) container.locked = originalLocked;
       }
     } finally {
       setProcessing(false);
     }
  }

  if (message.type === "get_figma_tokens") {
    const tokens = await getFigmaTokens();
    figma.ui.postMessage({ type: "figma_tokens", tokens });
    return;
  }

  if (message.type === "ping") {
      const selection = figma.currentPage.selection;
      let selectionLabel = "";
      let selectionKind: "table" | "column" | "cell" | undefined;
      let tableContext: { rows: number; cols: number; headers: string[] } | undefined;
      let componentKey: string | undefined;
      let headerMode: HeaderMode | undefined;
      let tableSize: "mini" | "default" | "medium" | "large" | undefined;
      let rowAction: "none" | "multiple" | "single" | "drag" | "expand" | "switch" | undefined;
      let tableSwitches: { pagination: boolean; filter: boolean; actions: boolean; tabs: boolean } | undefined;
      let colWidthMode: "FIXED" | "FILL" | undefined;
      let cellType: string | undefined;
      let cellAlign: "left" | "center" | "right" | undefined;

      if (selection.length === 1) {
          const node = selection[0];
          
          // Check for Filter component specifically
          const isFilterResult = await isFilter(node);
          if (isFilterResult) {
               selectionLabel = "当前选中：筛选器";
               selectionKind = "table"; // Show table panel for filters as they are part of table controls
               // Force table context extraction for Filter too, if possible
               // Filter -> Top Bar -> Table Block -> Table Frame? 
               // Or just find nearest table context?
               const table = findTableFrameFromNode(node as any);
               if (table) {
                  const cols = getColumnFrames(table);
                  const headers = cols.map(c => {
                      const h = c.children[0];
                      if (h && h.type === "INSTANCE") {
                          const t = h.findOne(x => x.type === "TEXT") as TextNode;
                          return t ? t.characters : "";
                      }
                      return "";
                  });
                  tableContext = {
                      rows: cols[0] ? cols[0].children.length - (await getHeaderOffset(cols[0])) : 0,
                      cols: cols.length,
                      headers
                  };
                  
                  // 提取表格配置
                  tableSize = await getTableSize(table);
                  rowAction = await getRowAction(table);
                  tableSwitches = await getTableSwitches(table);
               }
           } else if (node.type === "FRAME" && node.name.startsWith("Smart Table")) {
               if (!selectionLabel) selectionLabel = "当前选中：表格";
               selectionKind = "table";
               // ... extract context ...
           } else {
               // Try to find parent table
               const table = findTableFrameFromNode(node as any);
               if (table) {
                   const col = findColumnFrame(node as any);
                   if (col) {
                       const isHeader = col.children[0] === node;
                       if (isHeader) {
                          if (!selectionLabel) selectionLabel = `当前选中：${col.name} (表头)`;
                          selectionKind = "column";
                       } else {
                          if (!selectionLabel) selectionLabel = `当前选中：${col.name} (单元格)`;
                          selectionKind = "cell";
                       }
                   } else {
                       // Only set as general table element if not already identified as Filter
                       // Since we prioritize isFilterResult at the top, this block is only reached if !isFilterResult
                       // So we can safely set it here.
                       if (!selectionLabel) selectionLabel = "当前选中：表格内元素";
                   }
                  
                  // Extract context
                  const cols = getColumnFrames(table);
                  const headers = cols.map(c => {
                      const h = c.children[0];
                      if (h && h.type === "INSTANCE") {
                          const t = h.findOne(x => x.type === "TEXT") as TextNode;
                          return t ? t.characters : "";
                      }
                      return "";
                  });
                  tableContext = {
                      rows: cols[0] ? cols[0].children.length - (await getHeaderOffset(cols[0])) : 0,
                      cols: cols.length,
                      headers
                  };

                  // 提取表格配置
                  tableSize = await getTableSize(table);
                  rowAction = await getRowAction(table);
                  tableSwitches = await getTableSwitches(table);
              } else {
                  selectionLabel = `当前选中：${node.name}`;
              }
          }
      } else if (selection.length > 1) {
          selectionLabel = `已选中 ${selection.length} 个图层`;
      } else {
          selectionLabel = "未选中任何内容";
      }

      figma.ui.postMessage({
        type: "selection",
        count: selection.length,
        selectionLabel,
        selectionKind,
        tableContext,
        componentKey,
        headerMode,
        tableSize,
        rowAction,
        tableSwitches,
        colWidthMode,
        cellType,
        cellAlign
      });
      return;
  }

  if (message.type === "create_table") {
    setProcessing(true);
    try {
      await createTable({
        rows: toPositiveInt(message.rows, 10),
        cols: toPositiveInt(message.cols, 5),
        rowGap: 0,
        colGap: 0,
        envelopeSchema: {
        rows: message.rows,
        cols: message.cols,
        columns: Array(message.cols).fill(0).map((_, i) => {
          let type = (message.cellType as any) || "Text";
          let title = `Column ${i + 1}`;
          if (type === "Text" && message.cols >= 3) {
            if (i === 0) {
              type = "Avatar";
              title = "头像";
            } else if (i === message.cols - 1) {
              type = "ActionText";
              title = "操作";
            }
          }
          return {
            id: `col-${i}`,
            title,
            type,
            header: "none"
          };
        }),
        data: Array(message.rows).fill(0).map(() => Array(message.cols).fill(""))
      }
      });
      
      figma.ui.postMessage({
        type: "table_created",
        rows: message.rows,
        cols: message.cols
      });
      figma.notify(`已生成 ${message.rows}行 x ${message.cols}列 表格`);

    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      figma.notify(msg);
      postError(msg);
    } finally {
      setProcessing(false);
    }
  }

  if (message.type === "ai_create_table") {
    setProcessing(true);
    try {
      const spec = message.spec;

      // Reorder columns: Ensure ActionText/Action columns are always at the end
      if (spec.columns && spec.columns.length > 0) {
        const actionIndices: number[] = [];
        const nonActionIndices: number[] = [];

        spec.columns.forEach((c, i) => {
          if (c.type === "ActionText" || c.type === "ActionIcon") {
            actionIndices.push(i);
          } else {
            nonActionIndices.push(i);
          }
        });

        if (actionIndices.length > 0) {
          const newOrder = nonActionIndices.concat(actionIndices);
          
          spec.columns = newOrder.map(i => spec.columns![i]);
          if (spec.headers) spec.headers = newOrder.map(i => spec.headers[i]);
          if (spec.data) spec.data = spec.data.map(row => {
             const newRow: any[] = [];
             newOrder.forEach(idx => {
               newRow.push(row[idx] !== undefined ? row[idx] : "");
             });
             return newRow;
          });
        }
      }

      // Auto-detect column types if not provided or set to Text
      const columns = spec.columns || spec.headers.map((h, i) => ({
        id: `col-${i}`,
        title: h,
        type: "Text" as ColumnType,
        header: "none" as HeaderMode
      }));

      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        if (col.type === "Text") {
          // Scan data for +n pattern to auto-detect Tag type
          let isTag = false;
          for (let r = 0; r < spec.rows; r++) {
            const v = spec.data?.[r]?.[i];
            if (typeof v === "string" && /.+(\+\d+)$/.test(v)) {
              isTag = true;
              break;
            }
          }
          if (isTag) col.type = "Tag";
        }
      }

      await createTable({
        rows: toPositiveInt(spec.rows, 10),
        cols: toPositiveInt(spec.cols, 5),
        rowGap: 0,
        colGap: 0,
        envelopeSchema: {
          rows: spec.rows,
          cols: spec.cols,
          columns: columns,
          data: spec.data
        }
      });
      
      figma.ui.postMessage({ type: "table_created", rows: spec.rows, cols: spec.cols });
      figma.notify(`已生成并填充 ${spec.rows}行 x ${spec.cols}列 表格`);
      postSelection();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      figma.notify(msg);
      postError(msg);
    } finally {
      setProcessing(false);
    }
  }
};

// 注册 selectionchange 事件监听
figma.on("selectionchange", () => {
  postSelection();
});

// 初始化时发送一次选中状态
postSelection();

