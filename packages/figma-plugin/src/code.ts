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

/**
 * Design Tokens
 * 用于维护全局色彩、尺寸、字号变量
 */
const TOKENS = {
  colors: {
    "text-1": "0C0D0E",
    "link-6": "1664FF",
    "danger-6": "D7312A",
    "color-fill-2": "737A87",
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

const TABS_COMPONENT_KEY = "4c762a63f502f3c4596e4cdb0647514cf00a2ec7";
const FILTER_COMPONENT_KEY = "cadcfc99d9dc7ac32eac6eda4664ad68a712d19d"; // Updated Key
const FILTER_ITEM_COMPONENT_KEY = "7eaa61f7dda9a4e8271e2dbfcafcb5c2730ac2ab"; // Filter Item Key
const BUTTON_GROUP_COMPONENT_KEY = "180fb77e98e458d377212d51f6698085a4bf2f9f";
const PAGINATION_COMPONENT_KEY = "4a052d113919473bb3079dd723e05ccd343042c5";
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
const INPUT_COMPONENT_KEY = "e1c520fea681ece9994290c63d0b77ad19dbf7fa";
const SELECT_COMPONENT_KEY = "27245acbfd46e812fb383443f0aac88df751fa15";

const componentCache = new Map<string, ComponentNode | ComponentSetNode>();

let tableSwitchesState = {
  pagination: true,
  filter: true,
  actions: true,
  tabs: false // Initial state off as requested
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

function toHeaderMode(props: { filter: boolean; sort: boolean; search: boolean } | null): HeaderMode | undefined {
  if (!props) return undefined;
  if (props.search) return "search";
  if (props.sort) return "sort";
  if (props.filter) return "filter";
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
    const mark = table.getPluginData("smart_table");
    if (mark && mark.toLowerCase() === "true") return true;
    
    // Check children structure: all children should be vertical frames
    if (table.layoutMode === "HORIZONTAL" && table.children.length > 0) {
      const allVertical = table.children.every(c => c.type === "FRAME" && c.layoutMode === "VERTICAL");
      if (allVertical) return true;
    }
  } catch {}
  return table.name.startsWith("Smart Table ") || table.name.startsWith("Table ");
}

function findColumnFrame(node: SceneNode): FrameNode | null {
  let cur: BaseNode | null = node.parent;
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
  let cur: BaseNode | null = node;
  while (cur) {
    if (cur.type === "FRAME") {
      const f = cur as FrameNode;
      // 1. Is this the table itself?
      if (f.layoutMode === "HORIZONTAL" && isSmartTableFrame(f)) return f;

      // 2. Is this the container block?
      if (f.layoutMode === "VERTICAL") {
        const childTable = f.children.find(
          (n) =>
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

async function isHeaderInstance(instance: InstanceNode): Promise<boolean> {
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

async function getTableContext(table: FrameNode): Promise<TableContext | null> {
  const columns = table.children.filter((n) => n.type === "FRAME") as FrameNode[];
  const cols = columns.length;
  if (cols === 0) return null;

  const firstCol = columns[0];
  if (firstCol.layoutMode !== "VERTICAL") return null;

  const firstChild = firstCol.children[0];
  const hasHeader = Boolean(firstChild && firstChild.type === "INSTANCE" && await isHeaderInstance(firstChild as InstanceNode));
  const rows = Math.max(0, firstCol.children.length - (hasHeader ? 1 : 0));
  const headers: string[] = [];
  for (let c = 0; c < cols; c++) {
    const col = columns[c];
    const headerNode = hasHeader ? col.children[0] : null;
    if (headerNode && headerNode.type === "INSTANCE") {
      const text = await getFirstTextValue(headerNode);
      headers.push(text ?? "");
    } else {
      headers.push("");
    }
  }

  const rowAction = await getRowAction(table) as any;
  const config = await getTableConfig(table);

  return { rows, cols, headers, rowAction, config };
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
  if (cell.type === "FRAME" && ["Text", "Tag", "Avatar", "ActionText", "Input", "Select"].includes(customCellType)) {
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

async function postSelection() {
  if (typeof figma.ui === "undefined" || !figma.ui) return;
  const selection = figma.currentPage.selection;
  let componentKey: string | undefined;
  let headerProps: { filter: boolean; sort: boolean; search: boolean } | null = null;
  let tableContext: TableContext | null = null;
  let selectionKind: "table" | "column" | "cell" | "filter" | "button_group" | "tabs" | "pagination" | undefined;
  let selectionLabel: string | undefined;
  let activeTableFrame: FrameNode | null = null;
  let pluginData: Record<string, string> = {};

  if (selection.length === 1) {
    const node = selection[0];
    
    // Extract all plugin data keys we care about
    const dataKeys = ["cellType", "cellValue", "columnId", "tableId", "role", "textDisplayMode"]; 
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
      node.parent.name.startsWith("Table ")
    ) {
      columnFrame = node as FrameNode;
    }
    // 情况2: 选中了 Cell (Instance)
    else if (
      node.parent?.type === "FRAME" &&
      node.parent.layoutMode === "VERTICAL" &&
      node.parent.parent?.type === "FRAME" &&
      node.parent.parent.layoutMode === "HORIZONTAL" &&
      node.parent.parent.name.startsWith("Table ")
    ) {
      columnFrame = node.parent as FrameNode;
    }

    const tableFrame = findTableFrameFromNode(node as any);
    if (tableFrame) {
      activeTableFrame = tableFrame;
      const columns = getColumnFrames(tableFrame);
      const ctx = await getTableContext(tableFrame);
      tableContext = ctx;
      const pos = await computeTableSelectionPosition(tableFrame, node as SceneNode);
      
      // Only set selectionKind/Label if not already set by isFilter
      if (!selectionKind) {
        selectionKind = pos.kind;
      }
      
      let colWidthMode: "FIXED" | "FILL" | undefined;
      let cellType: string | undefined;
      let cellAlign: "left" | "center" | "right" | undefined;

      if (!selectionKind) {
        selectionKind = "table";
        if (!selectionLabel) selectionLabel = "当前选中：表格";
      } else if (selectionKind === "table") {
        if (!selectionLabel) selectionLabel = "当前选中：表格";
      } else if (selectionKind === "column" && typeof pos.columnIndex === "number") {
        const headerTitle = tableContext?.headers?.[pos.columnIndex] ?? "";
        const colLabel = headerTitle && headerTitle.trim().length > 0 ? headerTitle.trim() : `第 ${pos.columnIndex + 1} 列`;
        selectionLabel = `当前选中：列 - ${colLabel}`;
        const colFrame = columns[pos.columnIndex];
        if (colFrame) {
          colFrame.name = colLabel;
          colWidthMode = getColumnWidthMode(colFrame);
          // Get first cell to guess type/align? Or average?
          // Usually check first body cell
          const offset = await getHeaderOffset(colFrame);
          if (colFrame.children.length > offset) {
              const cell = colFrame.children[offset];
              cellType = await getCellType(cell);
              cellAlign = getCellAlignment(cell);
              if (cellType === "Tag" && !componentKey) {
                  componentKey = TAG_COMPONENT_KEY;
              } else if (cellType === "Avatar" && !componentKey) {
                  componentKey = AVATAR_COMPONENT_KEY;
              }
          }
        }
      } else if (
        pos.kind === "cell" &&
        typeof pos.columnIndex === "number" &&
        typeof pos.rowIndex === "number"
      ) {
        const headerTitle = tableContext?.headers?.[pos.columnIndex] ?? "";
        const colLabel = headerTitle && headerTitle.trim().length > 0 ? headerTitle.trim() : `第 ${pos.columnIndex + 1} 列`;
        const indexDisplay = pos.rowIndex + 1;
        selectionLabel = `当前选中：单元格 - ${colLabel}-${indexDisplay}`;
        const colFrame = columns[pos.columnIndex];
        if (colFrame) {
          const offset = await getHeaderOffset(colFrame);
          colWidthMode = getColumnWidthMode(colFrame);
          const cellNode = colFrame.children[offset + pos.rowIndex];
          if (cellNode) {
            cellNode.name = `${colLabel}-${indexDisplay}`;
            cellType = await getCellType(cellNode);
            cellAlign = getCellAlignment(cellNode);

            const textDisplayMode = cellNode.getPluginData("textDisplayMode");
            if (textDisplayMode) pluginData["textDisplayMode"] = textDisplayMode;

            // Proactively sync cellValue to Plugin Data for Dev Mode visibility
            const currentText = extractTextFromNode(cellNode, true);
            cellNode.setPluginData("cellValue", currentText);
            
            // Also set on the actually selected node (which might be a child) for direct visibility in Dev Mode
            if (node !== cellNode && "setPluginData" in node) {
              (node as any).setPluginData("cellValue", currentText);
            }
            
            pluginData["cellValue"] = currentText;

            // If it's a tag/avatar cell (Frame), we might want to pretend it has the correct component key
            if (cellType === "Tag" && !componentKey) {
              componentKey = TAG_COMPONENT_KEY;
            } else if (cellType === "Avatar" && !componentKey) {
              componentKey = AVATAR_COMPONENT_KEY;
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
              search: getBooleanPropValue(firstChild as InstanceNode, PROP_KEYS.search)
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
    tableSize: activeTableFrame ? await getTableSize(activeTableFrame) : undefined,
    rowAction: activeTableFrame ? await getRowAction(activeTableFrame) : undefined,
    tableSwitches: activeTableFrame ? await getTableSwitches(activeTableFrame) : undefined,
    pluginData
  });
}

function postError(message: string) {
  if (figma.ui) figma.ui.postMessage({ type: "error", message });
}

function postStatus(message: string) {
  if (figma.ui) figma.ui.postMessage({ type: "status", message });
}

async function loadTextNodeFonts(node: TextNode) {
  const fontNames: FontName[] =
    node.fontName === figma.mixed
      ? (node.characters.length > 0
          ? (node.getRangeAllFontNames(0, node.characters.length) as FontName[])
          : [{ family: "Inter", style: "Regular" }])
      : [node.fontName as FontName];

  const SAFE_DEFAULT_FONT: FontName = { family: "Inter", style: "Regular" };

  for (const f of fontNames) {
    try {
      // 1. Try to load the original font
      await Promise.race([
        figma.loadFontAsync(f),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Font load timeout: ${f.family} ${f.style}`)), 5000))
      ]);
    } catch (e) {
      console.warn(`Failed to load font ${f.family} ${f.style}, attempting fallback:`, e);
      
      // 2. Specific fix for PingFang SC quirk (common in Chinese designs)
      if (f.family.replace(/\s+/g, "") === "PingFangSC") {
        try {
          const altFont = { family: "Ping Fang SC", style: f.style };
          await figma.loadFontAsync(altFont);
          node.fontName = altFont;
          console.log(`Applied alternative Ping Fang SC`);
          continue;
        } catch (e2) {}
      }

      // 3. Final Fallback: Use "Inter" which is guaranteed to be available in Figma
      try {
        const fallbackStyle = f.style === "Bold" || f.style === "Medium" || f.style === "Semibold" ? "Bold" : "Regular";
        const fallbackFont = { family: "Inter", style: fallbackStyle };
        await figma.loadFontAsync(fallbackFont);
        
        // If the whole node used the failing font, update it
        if (node.fontName !== figma.mixed) {
          node.fontName = fallbackFont;
        } else {
          // If it was mixed, we should ideally update the range, but for safety in plugins, 
          // setting the whole node to fallback is often better than a crash.
          node.fontName = fallbackFont;
        }
        console.log(`Fallback to safe font: Inter ${fallbackStyle}`);
      } catch (fallbackErr) {
        // Extreme fallback if even Inter fails (should not happen in Figma)
        console.error("Critical: Default font Inter failed to load", fallbackErr);
        await figma.loadFontAsync(SAFE_DEFAULT_FONT);
        node.fontName = SAFE_DEFAULT_FONT;
      }
    }
  }
}

async function setFirstText(node: SceneNode, value: string) {
  const anyNode = node as any;
  const textNodes: TextNode[] =
    typeof anyNode.findAll === "function" ? (anyNode.findAll((n: SceneNode) => n.type === "TEXT") as TextNode[]) : [];
  const t = textNodes[0];
  if (!t) return false;
  await loadTextNodeFonts(t);
  try {
    t.characters = value;
    return true;
  } catch {
    return false;
  }
}



function headerPropsFromMode(mode: HeaderMode): { filter: boolean; sort: boolean; search: boolean } {
  if (mode === "filter") return { filter: true, sort: false, search: false };
  if (mode === "sort") return { filter: false, sort: true, search: false };
  if (mode === "search") return { filter: false, sort: false, search: true };
  return { filter: false, sort: false, search: false };
}

async function applyHeaderModeToInstance(instance: InstanceNode, mode: HeaderMode) {
  const { filter, sort, search } = headerPropsFromMode(mode);
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
}

function getColumnFrames(table: FrameNode): FrameNode[] {
  return table.children.filter((n) => n.type === "FRAME") as FrameNode[];
}

async function getHeaderOffset(col: FrameNode): Promise<number> {
  const first = col.children[0];
  if (first && first.type === "INSTANCE" && await isHeaderInstance(first as InstanceNode)) return 1;
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
  if (first && first.type === "INSTANCE" && await isHeaderInstance(first as InstanceNode)) {
    await applyHeaderModeToInstance(first as InstanceNode, mode);
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
      } else if (cellType === "ActionText") {
        const texts: string[] = [];
        n.children.forEach(c => {
          if (c.type === "TEXT") {
            texts.push(c.characters);
          }
        });
        return texts.join("，");
      } else if (cellType === "Input" || cellType === "Select" || cellType === "Text") {
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
    inputComponent?: ComponentNode | ComponentSetNode;
    selectComponent?: ComponentNode | ComponentSetNode;
    [key: string]: any;
  }
) => Promise<void>;

/**
 * Applies common styling to a cell frame (padding, border, layout)
 */
function applyCellCommonStyling(cellFrame: FrameNode) {
  cellFrame.layoutMode = "HORIZONTAL";
  cellFrame.counterAxisSizingMode = "FIXED";
  // Standard cell height is 40px
  cellFrame.resize(cellFrame.width, 40); 
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
  cellFrame.strokeBottomWeight = 1;
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

  const MAX_VISIBLE = 3;
  const showMore = parts.length > MAX_VISIBLE;
  const visibleCount = showMore ? 2 : parts.length;

  for (let i = 0; i < visibleCount; i++) {
    const part = parts[i];
    const textNode = figma.createText();
    await loadTextNodeFonts(textNode);
    textNode.characters = part;
    textNode.fontSize = TOKENS.fontSizes["body-2"];
    
    // Color logic: "删除" -> danger-6, else link-6
    const isDelete = part.includes("删除");
    const colorHex = isDelete ? TOKENS.colors["danger-6"] : TOKENS.colors["link-6"];
    textNode.fills = [{ type: "SOLID", color: hexToRgb(colorHex) }];
    
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
    cellFrame.appendChild(iconInst);
  }

  // Layout styling
  cellFrame.itemSpacing = 16;
  cellFrame.layoutMode = "HORIZONTAL";
  (cellFrame as any).layoutSizingHorizontal = "HUG";
  cellFrame.counterAxisSizingMode = "FIXED";
  cellFrame.counterAxisAlignItems = "CENTER";
}

const CUSTOM_CELL_REGISTRY: Partial<Record<ColumnType, CustomCellRenderer>> = {
  "Tag": renderTagCell,
  "Avatar": renderAvatarCell,
  "ActionText": renderActionCell,
  "Input": renderInputCell,
  "Select": renderSelectCell,
  "Text": renderTextCell,
};

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
  
  if (oldAlign === "MAX") {
      cellFrame.primaryAxisAlignItems = "MAX";
      textNode.textAlignHorizontal = "RIGHT";
  } else {
      cellFrame.primaryAxisAlignItems = "MIN";
      textNode.textAlignHorizontal = "LEFT";
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
    
    // Restore saved table height if available, otherwise default to 40
    let targetHeight = 40;
    const table = findTableFrameFromNode(cellFrame);
    if (table) {
      const savedHeight = table.getPluginData("tableRowHeight");
      if (savedHeight) {
        targetHeight = parseInt(savedHeight, 10) || 40;
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

  // Set to FILL width - MUST be done AFTER appendChild to ensure parent is an auto-layout frame
  if (cellFrame.layoutMode !== "NONE") {
    (inst as any).layoutSizingHorizontal = "FILL";
  }
}

async function renderAvatarCell(
  cellFrame: FrameNode,
  text: string,
  context: { avatarComponent?: ComponentNode | ComponentSetNode }
) {
  const { avatarComponent } = context;
  if (!avatarComponent) return;

  const finalName = text || "宋明杰";
  // Store original text in Plugin Data immediately
  cellFrame.setPluginData("cellValue", finalName);

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
        context = { avatarComponent };
      } else if (type === "ActionText") {
        const { component: moreIconComponent } = await resolveCellFactory(MORE_ICON_COMPONENT_KEY);
        context = { moreIconComponent };
      } else if (type === "Input") {
        const { component: inputComponent } = await resolveCellFactory(INPUT_COMPONENT_KEY);
        context = { inputComponent };
      } else if (type === "Select") {
        const { component: selectComponent } = await resolveCellFactory(SELECT_COMPONENT_KEY);
        context = { selectComponent };
      }

      if (Object.keys(context).some(k => context[k])) {
        // Set column layout props
        col.layoutSizingHorizontal = type === "ActionText" ? "HUG" : "FILL";
        col.counterAxisSizingMode = "FIXED";

        // Snapshot children to avoid mutation issues during iteration
        const childrenSnapshot = [...col.children];

        for (let i = offset; i < childrenSnapshot.length; i++) {
          const n = childrenSnapshot[i];
          if (n.parent !== col) continue;
          
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

          cellFrame.layoutSizingHorizontal = type === "ActionText" ? "HUG" : "FILL";
          cellFrame.layoutSizingVertical = "FIXED";
          cellFrame.layoutAlign = type === "ActionText" ? "INHERIT" : "STRETCH"; 
          
          applyCellCommonStyling(cellFrame);
          
          const originalText = extractTextFromNode(n);
          await customRenderer(cellFrame, originalText, context);
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
      // Ensure action cells are HUG if type is Action
      if (type === "ActionText" || type === "ActionIcon") {
        if ("layoutSizingHorizontal" in inst) {
          (inst as any).layoutSizingHorizontal = "HUG";
        }
      }
    }
  }

  // Final check: if the column is now an action column, ensure it's HUG
  if (type === "ActionText" || type === "ActionIcon" || col.name.toLowerCase().includes("操作") || col.name.toLowerCase().includes("action")) {
    col.layoutSizingHorizontal = "HUG";
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

async function applyColumnWidthToColumn(table: FrameNode, colIndex: number, mode: "FIXED" | "FILL") {
  const cols = getColumnFrames(table);
  const col = cols[colIndex];
  if (!col) return;

  if (mode === "FILL") {
    col.layoutSizingHorizontal = "FILL";
  } else {
    col.layoutSizingHorizontal = "FIXED";
  }

  for (const child of col.children) {
    if ("layoutSizingHorizontal" in child) {
      child.layoutSizingHorizontal = "FILL";
    }
  }
}

async function applyColumnAlignToColumn(table: FrameNode, colIndex: number, align: "left" | "center" | "right") {
  const cols = getColumnFrames(table);
  const col = cols[colIndex];
  if (!col) return;

  // Apply to header too if it exists? Usually header alignment matches column alignment or is separate.
  // For now, let's apply to all instances in the column including header if possible, 
  // or maybe just body cells if headers have their own style.
  // The user said "Alignment" is open to the large model.
  // Let's apply to all instances.
  
  for (const child of col.children) {
    if (child.type === "INSTANCE") {
      const inst = child as InstanceNode;
      if (await isHeaderInstance(inst)) {
        // User explicitly asked for headers to be left aligned
        await setInstanceAlign(inst, "left");
      } else {
        await setInstanceAlign(inst, align);
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
          const colName = col.name.toLowerCase();
          if (colName.includes("操作") || colName.includes("action")) {
            (newCell as any).layoutSizingHorizontal = "HUG";
          } else {
            (newCell as any).layoutSizingHorizontal = "FILL";
          }
        }
      }
    }
    return;
  }

  if (op.op === "remove_rows") {
    const sorted = [...op.indexes].sort((a, b) => b - a);
    for (const col of cols) {
      const offset = await getHeaderOffset(col);
      const currentRows = Math.max(0, col.children.length - offset);
      for (const idx of sorted) {
        if (idx < 0 || idx >= currentRows) continue;
        const node = col.children[offset + idx];
        if (node) node.remove();
      }
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

      if (titleLower.includes("操作") || titleLower.includes("action") || type === "ActionText") {
        newCol.layoutSizingHorizontal = "HUG";
      } else {
        newCol.layoutSizingHorizontal = "FILL";
      }

      if (hasHeader && newCol.children[0] && newCol.children[0].type === "INSTANCE") {
        await setFirstText(newCol.children[0] as any, title);
        if (header) await applyHeaderModeToInstance(newCol.children[0] as any, header);
      }
      if (type) {
        const idx = table.children.indexOf(newCol);
        await applyColumnTypeToColumn(table, idx, type);
      }
    }
    return;
  }

  if (op.op === "remove_cols") {
    const sorted = [...op.indexes].sort((a, b) => b - a);
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
    if (first && first.type === "INSTANCE" && await isHeaderInstance(first as InstanceNode)) {
      await setFirstText(first as any, op.title);
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
      const items = op.items;
      // Tabs usually have child items or are a single instance with variant
      // For simplicity, find all text nodes and update them
      const textNodes = tabsInst.findAll(n => n.type === "TEXT") as TextNode[];
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
    await setFirstText(cell as any, op.value);
    return;
  }

  if (op.op === "fill_column") {
    const col = cols[op.col];
    if (!col) return;
    const offset = await getHeaderOffset(col);
    for (let r = 0; r < op.values.length; r++) {
      const cell = col.children[offset + r];
      if (!cell) break;
      await setFirstText(cell as any, String(op.values[r]));
    }
    return;
  }

  if (op.op === "translate") {
    figma.notify("translate 操作需要由网关转成 update_cell 才能执行");
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
    return componentCache.get(key)!;
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
            const criteria: Record<string, string> = {
                "Check 多选": type === "Checkbox" ? "True" : "False",
                "Expand 展开": type === "Expand" ? "True" : "False",
                "Size 尺寸": "Default 40", // 统一使用 Default 40，这是高度属性
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
                const finalProps: any = {
                    "Check 多选": "False",
                    "Expand 展开": "False",
                    "Size 尺寸": "Default 40",
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
                if (rowHeights[i] !== undefined && Math.abs(rowHeights[i] - 40) > 0.1) {
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
        }
    }
    
    return colFrame;
}

async function createTable(params: CreateTableOptions) {
  const { rows, cols, rowGap, colGap, rowActionType, envelopeSchema } = params;

  // 1. Load basic components (Header and Cell)
  const headerComponent = await loadComponent(HEADER_COMPONENT_KEY, "Header");
  const cellComponent = await loadComponent(CELL_COMPONENT_KEY, "Cell");
  const actionTextComponent = await loadComponent(ROW_ACTION_COMPONENT_KEY, "ActionText").catch(() => null);
  // Basic components for type checking/fallback
  const baseTagComponent = await loadComponent(TAG_COMPONENT_KEY, "Tag");
  const baseAvatarComponent = await loadComponent(AVATAR_COMPONENT_KEY, "Avatar");
  const baseInputComponent = await loadComponent(INPUT_COMPONENT_KEY, "Input");
  const baseSelectComponent = await loadComponent(SELECT_COMPONENT_KEY, "Select");

  // Header factory helper
  const getHeaderFactory = (headerMode: HeaderMode = "none") => {
    if (!headerComponent) return null;
    if (headerComponent.type === "COMPONENT_SET") {
      const criteria = {
        "Filter": headerMode === "filter" ? "True" : "False",
        "Select": headerMode === "filter" ? "True" : "False",
        "Sort": headerMode === "sort" ? "True" : "False",
        "Search": headerMode === "search" ? "True" : "False",
        "筛选": headerMode === "filter" ? "True" : "False",
        "排序": headerMode === "sort" ? "True" : "False",
        "搜索": headerMode === "search" ? "True" : "False",
        "Align 排列方式": "Left 左"
      };
      const target = findVariant(headerComponent, criteria);
      return target ? () => {
        const inst = target.createInstance();
        try {
          // Use more flexible property matching for setProperties
          const currentProps = inst.componentProperties;
          const finalProps: any = {};
          for (const [ckey, cval] of Object.entries(criteria)) {
            const actualKey = Object.keys(currentProps).find(k => k.trim() === ckey.trim()) || 
                             Object.keys(currentProps).find(k => k.includes(ckey));
            if (actualKey) {
                const propInfo = currentProps[actualKey] as any;
                let finalVal: any = cval;
                
                // Ensure value matches property type (Boolean vs String)
                if (propInfo.type === "BOOLEAN") {
                    finalVal = (String(cval) === "True" || cval === (true as any));
                } else {
                    finalVal = typeof cval === "boolean" ? (cval ? "True" : "False") : String(cval);
                }
                
                // Special handling for State type mismatch issues
                // If it's a VARIANT property but the component expects a string that looks like boolean
                if (propInfo.type === "VARIANT" && typeof finalVal === "boolean") {
                   finalVal = finalVal ? "True" : "False";
                }

                finalProps[actualKey] = finalVal;
            }
          }
          inst.setProperties(finalProps);
        } catch (e) {
          console.warn("Failed to set header properties during creation", e);
        }
        return inst;
      } : null;
    }
    return () => (headerComponent as ComponentNode).createInstance();
  };

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
          
          const headerMode = colSpec?.header || "none";

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

      // Apply initial header property from envelopeSchema if provided
      const hFactory = getHeaderFactory(headerMode);
      if (hFactory) {
        const header = hFactory();
        colFrame.appendChild(header);
        
        // Ensure header fills column width
        header.layoutAlign = "STRETCH";
        if ("layoutSizingHorizontal" in header) {
          (header as any).layoutSizingHorizontal = "FILL";
        }
        
        await setFirstText(header, colTitle);
        
      // Ensure header properties are set correctly (e.g. Filter)
      if (header.type === "INSTANCE" && headerMode !== "none") {
        try {
          const criteria: any = {
            "Filter": headerMode === "filter" ? "True" : "False",
            "Select": headerMode === "filter" ? "True" : "False",
            "Sort": headerMode === "sort" ? "True" : "False",
            "Search": headerMode === "search" ? "True" : "False",
            "筛选": headerMode === "filter" ? "True" : "False",
            "排序": headerMode === "sort" ? "True" : "False",
            "搜索": headerMode === "search" ? "True" : "False",
            "Align 排列方式": "Left 左"
          };
          const currentProps = header.componentProperties;
          const finalProps: any = {};
          for (const [ckey, cval] of Object.entries(criteria)) {
            const actualKey = Object.keys(currentProps).find(k => k.trim() === ckey.trim()) || 
                             Object.keys(currentProps).find(k => k.includes(ckey));
            if (actualKey) {
                const normalizedVal = typeof cval === "boolean" ? (cval ? "True" : "False") : cval;
                finalProps[actualKey] = normalizedVal;
            }
          }
          header.setProperties(finalProps);
        } catch (e) {
          console.warn("Failed to set header properties on instance", e);
        }
      }
      }

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

    if (customRenderer) {
        if (colType === "Tag") {
            const res = await resolveCellFactory(TAG_COMPONENT_KEY);
            tagComponent = res.component;
            const res2 = await resolveCellFactory(TAG_COUNTER_COMPONENT_KEY);
            counterComponent = res2.component;
        } else if (colType === "Avatar") {
            const res = await resolveCellFactory(AVATAR_COMPONENT_KEY);
            avatarComponent = res.component;
        } else if (colType === "ActionText") {
            const res = await resolveCellFactory(MORE_ICON_COMPONENT_KEY);
            moreIconComponent = res.component;
        } else if (colType === "Input") {
            const res = await resolveCellFactory(INPUT_COMPONENT_KEY);
            inputComponent = res.component;
        } else if (colType === "Select") {
            const res = await resolveCellFactory(SELECT_COMPONENT_KEY);
            selectComponent = res.component;
        }
    }

    for (let r = 0; r < rows; r++) {
      const val = envelopeSchema?.data?.[r]?.[c] ?? "";
      
      if (customRenderer) {
        const cellFrame = createCustomCellFrame(`${colType} Cell ${c + 1}-${r + 1}`, colType);
        colFrame.appendChild(cellFrame);
        cellFrame.layoutSizingHorizontal = colType === "ActionText" ? "HUG" : "FILL";
        cellFrame.layoutSizingVertical = "FIXED";
        
        const context = {
            tagComponent,
            counterComponent: counterComponent || tagComponent,
            avatarComponent,
            moreIconComponent,
            inputComponent,
            selectComponent
        };
        
        await customRenderer(cellFrame, val, context);
      } else if (cFactory) {
        const cell = cFactory();
        colFrame.appendChild(cell);
        if (colType === "ActionText" || colTitle.includes("操作")) {
          cell.layoutSizingHorizontal = "HUG";
        } else {
          cell.layoutSizingHorizontal = "FILL";
        }
        cell.name = `${colTitle}-${r + 1}`;
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
      container.appendChild(pagerInst);
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

  // Position at center
  // Give Figma a moment to finalize layout
  await yieldToMain();
  
  const center = figma.viewport.center;
  // Use absolute dimensions or fallback to totalWidth
  // Reading width/height here forces a layout pass in some Figma versions
  const currentWidth = container.width > 10 ? container.width : totalWidth;
  const currentHeight = container.height > 10 ? container.height : (rows * 40 + 200);
  
  const targetX = Math.round(center.x - currentWidth / 2);
  const targetY = Math.round(center.y - currentHeight / 2);
  
  container.x = targetX;
  container.y = targetY;
  
  // Final check to ensure it's not at origin if center is available
  if (container.x === 0 && container.y === 0 && (center.x !== 0 || center.y !== 0)) {
    container.x = targetX;
    container.y = targetY;
  }
  
  // Also scroll to it to be sure
  figma.viewport.scrollAndZoomIntoView([container]);
  figma.currentPage.selection = [container];

  return tableFrame;
}

function setColumnLayout(mode: "FIXED" | "FILL") {
  const selection = figma.currentPage.selection;
  for (const node of selection) {
    let columnFrame: FrameNode | null = null;

    // 1. Check if node IS the column
    if (node.type === "FRAME" && node.layoutMode === "VERTICAL") {
       columnFrame = node;
    } 
    // 2. Check parent (Cell selected)
    else if (node.parent?.type === "FRAME" && node.parent.layoutMode === "VERTICAL") {
       columnFrame = node.parent as FrameNode;
    }

    if (columnFrame) {
      if (mode === "FILL") {
         columnFrame.layoutSizingHorizontal = "FILL";
      } else {
         columnFrame.layoutSizingHorizontal = "FIXED";
      }
      
      // ALSO ensure cells are filling the column
      for (const child of columnFrame.children) {
         if ("layoutSizingHorizontal" in child) {
            child.layoutSizingHorizontal = "FILL";
         }
      }
      
    } else {
       throw new Error("选中节点不像是表格的列内单元格(父级不是垂直自动布局Frame)");
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

  if (typeof current === "string" && current === target) return false;
  try {
    instance.setProperties({ [key]: target });
    return true;
  } catch {
    return false;
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

   postSelection();

   figma.on("selectionchange", () => {
    postSelection();
  });

  figma.on("documentchange", async (event) => {
    const changes = event.documentChanges;
    const cellsToSync = new Map<string, { table: FrameNode; index: number }>();

    for (const change of changes) {
      if (change.type !== "PROPERTY_CHANGE") continue;
      
      const node = change.node;
      if (node.removed) continue;
      
      const props = (change.properties || []) as string[];
      const isHeightProp = props.includes("height") || props.includes("resize");
      const isTextProp = props.includes("characters");
      
      if (isHeightProp || isTextProp) {
        let sceneNode: FrameNode | InstanceNode | null = null;
        
        if (isTextProp && node.type === "TEXT") {
            // Find the parent cell frame
            let cur = node.parent;
            while (cur && cur.type !== "PAGE") {
                if (cur.type === "FRAME" || cur.type === "INSTANCE") {
                    const cellType = cur.getPluginData("cellType");
                    if (cellType === "Text") {
                        sceneNode = cur as FrameNode | InstanceNode;
                        break;
                    }
                }
                cur = cur.parent;
            }
        } else if (node.type === "INSTANCE" || node.type === "FRAME") {
            sceneNode = node as FrameNode | InstanceNode;
        }

        if (sceneNode) {
            const column = sceneNode.parent;
            if (column && column.type === "FRAME" && column.layoutMode === "VERTICAL") {
                const table = column.parent;
                if (table && table.type === "FRAME" && table.layoutMode === "HORIZONTAL" && isSmartTableFrame(table)) {
                    // If text changed, we MUST ensure it's HUG temporarily to get its new natural height
                    if (isTextProp || sceneNode.getPluginData("textDisplayMode") === "lineBreak") {
                        if ("layoutSizingVertical" in sceneNode && sceneNode.layoutSizingVertical !== "HUG") {
                            sceneNode.layoutSizingVertical = "HUG";
                        }
                    }

                    const index = column.children.indexOf(sceneNode);
                    if (index !== -1) {
                        const key = `${table.id}-${index}`;
                        cellsToSync.set(key, { table, index });
                    }
                }
            }
        }
      }
    }
    
    if (cellsToSync.size > 0) {
        for (const { table, index } of cellsToSync.values()) {
            const cols = getColumnFrames(table);
            let maxHeight = 0;
            
            // First pass: find max height
            for (const col of cols) {
               if (index < col.children.length) {
                   const cell = col.children[index];
                   if (cell.height > maxHeight) maxHeight = cell.height;
               }
            }
            
            if (maxHeight <= 0) continue;

            // Second pass: apply max height
            for (const col of cols) {
                if (index < col.children.length) {
                    const cell = col.children[index] as FrameNode | InstanceNode;
                    const isLineBreak = cell.getPluginData("textDisplayMode") === "lineBreak";
                    
                    if (isLineBreak) {
                        // If it's the tallest cell, keep it HUG so it can continue to grow
                        if (Math.abs(cell.height - maxHeight) <= 0.1) {
                            if ("layoutSizingVertical" in cell) cell.layoutSizingVertical = "HUG";
                        } else {
                            // If it's shorter than maxHeight, set to FIXED to align with row
                            if ("layoutSizingVertical" in cell) cell.layoutSizingVertical = "FIXED";
                            try { cell.resize(cell.width, maxHeight); } catch (e) {}
                        }
                    } else {
                        // Normal cells: always FIXED
                        if ("layoutSizingVertical" in cell) cell.layoutSizingVertical = "FIXED";
                        if (Math.abs(cell.height - maxHeight) > 0.1) {
                            try { cell.resize(cell.width, maxHeight); } catch (e) {}
                        }
                    }
                }
            }
        }
    }
  });
}

init();



figma.ui.onmessage = async (message: UiToPluginMessage) => {
  if (message.type === "ai_apply_envelope") {
    const env = message.envelope;
    try {
      if (env.intent === "create") {
        const { rows, cols, rowAction } = env.schema;
        
        const table = await createTable({
          rows,
          cols,
          rowGap: 0,
          colGap: 0,
          rowActionType: rowAction,
          envelopeSchema: env.schema
        });

        if (table) {
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
        figma.ui.postMessage({ type: "edit_completed" });
        figma.ui.postMessage({ type: "ai_apply_envelope_done" });
        figma.notify("已应用增量变更");
      }
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : String(e);
      figma.notify("Envelope 应用失败: " + msg);
      postError(msg);
      figma.ui.postMessage({ type: "ai_apply_envelope_done" }); // Also reset on error
    }
    return;
  }
  if (message.type === "update_component_key") {
    // 允许动态更新组件 Key
    try {
      await loadComponent(message.key);
      figma.notify("组件 Key 已更新");
    } catch (e: any) {
      figma.notify("更新组件 Key 失败: " + (e?.message ?? String(e)));
    }
  } else if (message.type === "set_col_width") {
    if (figma.currentPage.selection.length === 0) {
      figma.notify("请先选中单元格或列");
      return;
    }
    const mode = message.mode === "Fixed" ? "FIXED" : "FILL";
    try {
      setColumnLayout(mode);
      figma.notify(`列宽已设置为：${mode === "FIXED" ? "固定" : "充满"}`);
    } catch (e: any) {
      figma.notify("设置列宽失败: " + e.message);
    }
  } else if (message.type === "set_table_rows") {
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

    // 保存到 Plugin Data
    table.setPluginData("rowCount", message.rows.toString());

    try {
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
    } catch (e: any) {
      figma.notify("调整行数失败: " + e.message);
    }
  }

  if (message.type === "set_header_props") {
    const { filter, sort, search } = message.props;
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      figma.notify("请先选中单元格");
      return;
    }

    let updateCount = 0;

    for (const node of selection) {
      // Find the Header instance
      // 1. If selected is Instance, check if it's header.
      // 2. If selected is Column Frame, check first child.
      
      let headerInstance: InstanceNode | null = null;
      
      if (node.type === "INSTANCE") {
         // Is this a header?
         const main = await node.getMainComponentAsync();
         const isHeader = (m: ComponentNode | null) => {
             if (!m) return false;
             if (m.key === HEADER_COMPONENT_KEY) return true;
             if (m.parent && m.parent.type === "COMPONENT_SET") {
                return m.parent.key === HEADER_COMPONENT_KEY || 
                       m.parent.children.some(c => (c.type === "COMPONENT" || c.type === "COMPONENT_SET") && c.key === HEADER_COMPONENT_KEY);
             }
             return false;
          };

         if (isHeader(main)) {
             headerInstance = node;
         } else {
             // Maybe it's a cell, try to find the header in the same column?
             const col = node.parent;
             if (col && col.type === "FRAME" && col.children.length > 0) {
                 const first = col.children[0];
                 if (first.type === "INSTANCE") {
                    const m = await first.getMainComponentAsync();
                    if (isHeader(m)) {
                        headerInstance = first;
                    }
                 }
             }
         }
      } else if (node.type === "FRAME" && node.layoutMode === "VERTICAL") {
          // Column selected
          if (node.children.length > 0 && node.children[0].type === "INSTANCE") {
              headerInstance = node.children[0] as InstanceNode;
          }
      }

      if (headerInstance) {
          // Update props
          // Since it might be a variant switch or prop update
          // Let's try setProperties first if it's the right component set
          const main = await headerInstance.getMainComponentAsync();
          if (main && main.parent && main.parent.type === "COMPONENT_SET") {
               // Try to switch variant based on props
               // We need to know the current props and merge with new ones
               // But our findVariant logic is simple.
               // Let's just try to update the boolean props if they exist.
               
               const currentProps = headerInstance.componentProperties;
               const newProps: any = {};
               
               // Map our UI keys to Component Keys
               // filter -> "Filter", sort -> "Sort", search -> "Search"
               const setProp = (uiKey: string, val: boolean) => {
                   const key = Object.keys(currentProps).find(k => k.toLowerCase().includes(uiKey));
                   if (key) {
                       const currentVal = currentProps[key].value;
                       if (typeof currentVal === "boolean") {
                           newProps[key] = val;
                       } else if (typeof currentVal === "string") {
                           newProps[key] = val ? "True" : "False";
                       }
                   }
               };

               setProp("filter", filter);
               setProp("sort", sort);
               setProp("search", search);
               
               if (Object.keys(newProps).length > 0) {
                   try {
                       headerInstance.setProperties(newProps);
                       updateCount++;
                   } catch (e) {
                       console.log("Set props failed, trying swap", e);
                       // If setProperties fails, maybe we need to find a variant?
                       // But setProperties usually handles variant switching if props match.
                   }
               }
          }
      }
    }

    if (updateCount > 0) {
      figma.notify("已更新表头设置");
      postSelection(); 
    } else {
      figma.notify("未选中表格列或列首不是表头组件，或者属性名不匹配");
    }
  }

  if (message.type === "set_cell_align") {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      figma.notify("请先选中单元格或列");
      return;
    }
    let updateCount = 0;
    for (const node of selection) {
      const updateAlign = async (n: SceneNode) => {
        if (n.type === "FRAME" && n.getPluginData("cellType") === "Text") {
           // For Text custom cell, we just change primaryAxisAlignItems
           const frame = n as FrameNode;
           if (message.align === "left") {
             frame.primaryAxisAlignItems = "MIN";
             // Update text alignment
             const textNode = frame.findOne(c => c.type === "TEXT") as TextNode;
             if (textNode) textNode.textAlignHorizontal = "LEFT";
             updateCount++;
             return true;
           } else if (message.align === "right") {
             frame.primaryAxisAlignItems = "MAX";
             // Update text alignment
             const textNode = frame.findOne(c => c.type === "TEXT") as TextNode;
             if (textNode) textNode.textAlignHorizontal = "RIGHT";
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
  }

  if (message.type === "set_cell_type") {
     const { cellType } = message;
     const selection = figma.currentPage.selection;
     let updateCount = 0;

     // Special handling for Custom Cells (Tag, Avatar, etc.)
     const customRenderer = CUSTOM_CELL_REGISTRY[cellType as ColumnType];
     if (customRenderer) {
        try {
            let context: any = {};
            if (cellType === "Tag") {
                const { component: tagComponent } = await resolveCellFactory(TAG_COMPONENT_KEY);
                const { component: counterComponent } = await resolveCellFactory(TAG_COUNTER_COMPONENT_KEY);
                context = { tagComponent, counterComponent: counterComponent || tagComponent };
            } else if (cellType === "Avatar") {
                const { component: avatarComponent } = await resolveCellFactory(AVATAR_COMPONENT_KEY);
                context = { avatarComponent };
            } else if (cellType === "ActionText") {
                const { component: moreIconComponent } = await resolveCellFactory(MORE_ICON_COMPONENT_KEY);
                context = { moreIconComponent };
            } else if (cellType === "Input") {
                const { component: inputComponent } = await resolveCellFactory(INPUT_COMPONENT_KEY);
                context = { inputComponent };
            } else if (cellType === "Select") {
                const { component: selectComponent } = await resolveCellFactory(SELECT_COMPONENT_KEY);
                context = { selectComponent };
            }

            if (cellType === "Text" || Object.keys(context).some(k => context[k])) {
                for (const node of selection) {
                    let nodesToUpdate: SceneNode[] = [];
                    if (node.type === "FRAME" && node.layoutMode === "VERTICAL") {
                        nodesToUpdate = node.children.slice(await getHeaderOffset(node as FrameNode));
                        node.layoutSizingHorizontal = (cellType === "ActionText") ? "HUG" : "FILL";
                        node.counterAxisSizingMode = "FIXED";
                    } else if (node.type === "INSTANCE" || (node.type === "FRAME" && ["Text", "Tag", "Avatar", "ActionText", "Input", "Select"].includes(node.getPluginData("cellType")))) {
                        nodesToUpdate = [node];
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
                         cellFrame.layoutSizingHorizontal = (cellType === "ActionText") ? "HUG" : "FILL"; 
                         
                         if (cellType === "Text") {
                             const displayMode = cellFrame.getPluginData("textDisplayMode") || "ellipsis";
                             if (displayMode === "lineBreak") {
                                 cellFrame.counterAxisSizingMode = "AUTO";
                                 cellFrame.layoutSizingVertical = "HUG";
                             } else {
                                 cellFrame.counterAxisSizingMode = "FIXED";
                                 cellFrame.layoutSizingVertical = "FIXED";
                                 cellFrame.resize(cellFrame.width, 40);
                             }
                         } else {
                             cellFrame.layoutSizingVertical = "FIXED";
                         }
                         
                         cellFrame.layoutAlign = (cellType === "ActionText") ? "INHERIT" : "STRETCH"; 
                         
                         await customRenderer(cellFrame, originalText, context);
                         
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
                        
                        // Ensure layout settings for non-ActionText
                        if (cellType !== "ActionText") {
                             node.layoutSizingHorizontal = "FILL";
                        }
                    } else if (node.type === "INSTANCE" || (node.type === "FRAME" && ["Tag", "Avatar", "ActionText", "Input", "Select"].includes(node.getPluginData("cellType")))) {
                        nodesToUpdate = [node];
                    }

                    // Also ensure cells are FILL width if not ActionText
                    if (cellType !== "ActionText") {
                        for (const n of nodesToUpdate) {
                            if ("layoutSizingHorizontal" in n) {
                                (n as FrameNode | InstanceNode).layoutSizingHorizontal = "FILL";
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
                           t.characters = originalText || (currentCellType === "Avatar" ? "宋明杰" : "");
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
                } else {
                   // Fallback or nothing
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
  }

  if (message.type === "set_text_display_mode") {
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
  }

  if (message.type === "apply_to_column") {
    if (figma.currentPage.selection.length !== 1) {
      figma.notify("请选中一个作为模板的单元格");
      return;
    }
    const sourceCell = figma.currentPage.selection[0];
    if (sourceCell.type !== "INSTANCE") {
      figma.notify("选中的不是组件实例");
      return;
    }

    const columnFrame = findColumnFrame(sourceCell);
    if (!columnFrame) {
      figma.notify("未找到列容器");
      return;
    }

    const children = columnFrame.children;
    const header = children.length > 0 ? children[0] : null;

    // Determine if source is header
    const isSourceHeader = sourceCell === header;

    if (isSourceHeader) {
      figma.notify("不能将表头样式应用到整列");
      return;
    }

    let updateCount = 0;
 
     // Clone strategy for "Apply to Column"
     // We want to replicate the source cell exactly (variant, props, overrides maybe?)
     // The user said: "copy this component instead of just applying props"
     // and "originally hidden icon showed up" -> implying we need to keep overrides or exact state.
     
     // 1. We can clone the sourceCell.
     // 2. But we need to replace the target cells in the column layout.
     
     for (let i = 0; i < children.length; i++) {
       const target = children[i];
       // Skip header and source cell
       if (target === header || target === sourceCell) continue;
 
       if (target.type === "INSTANCE") {
          try {
             // Clone source
             const newCell = sourceCell.clone();
             
             // Insert new cell at same index
             columnFrame.insertChild(i, newCell);
             
             // Remove old cell
             target.remove();
             
             // Ensure layout props are preserved? 
             // Usually clone preserves layout props, but if the old cell had specific sizing...
             // The user said "all cells should be fill width initially".
             // Let's ensure the new cell is FILL width if the old one was or if it should be.
             if ("layoutSizingHorizontal" in newCell) {
                 newCell.layoutSizingHorizontal = "FILL";
             }
             
             updateCount++;
          } catch (e) {
             console.error("Failed to clone/replace cell", e);
          }
       }
     }
 
     figma.notify(`已将样式应用到 ${updateCount} 个单元格`);
  }

  if (message.type === "add_column") {
    const selection = figma.currentPage.selection;
    let table: FrameNode | null = null;
    if (selection.length > 0) {
      table = findTableFrameFromNode(selection[0] as any);
    }
    
    if (!table) {
      figma.notify("请先选中表格或表格内的元素");
      return;
    }

    try {
      await applyOperationToTable(table, {
        op: "add_cols",
        count: 1,
        position: "end"
      });
      figma.notify("已在最右侧添加一列");
    } catch (e: any) {
      figma.notify("添加列失败: " + e.message);
    }
    return;
  }

  if (message.type === "get_component_props") {
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
  }

  if (message.type === "set_table_size") {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) return;
    const table = findTableFrameFromNode(selection[0] as any);
    if (!table) return;

    const sizeMap = {
      mini: 32,
      default: 40,
      medium: 48,
      large: 56
    };
    const h = sizeMap[message.size];
    
    // Save current row height to table plugin data
    table.setPluginData("tableRowHeight", h.toString());
    
    const cols = getColumnFrames(table);
    for (const col of cols) {
       const offset = await getHeaderOffset(col);
       for (let i = offset; i < col.children.length; i++) {
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
  }

  if (message.type === "set_row_action") {
     const selection = figma.currentPage.selection;
     if (selection.length === 0) return;
     const table = findTableFrameFromNode(selection[0] as any);
     if (!table) return;
     
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
  }

  if (message.type === "set_table_switch") {
     // Update global state for future creations
     if (message.key in tableSwitchesState) {
       (tableSwitchesState as any)[message.key] = message.enabled;
     }

     const selection = figma.currentPage.selection;
     if (selection.length === 0) return;
     const table = findTableFrameFromNode(selection[0] as any);
     if (!table) return;

     // 保存到 Plugin Data
     table.setPluginData(`switch_${message.key}`, message.enabled ? "true" : "false");
     const container = table.parent;
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
                     container.appendChild(inst);
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
    }
  }

  if (message.type === "ai_create_table") {
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
          const newOrder = [...nonActionIndices, ...actionIndices];
          
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
    }
  }
};

