export type HeaderPropKeys = {
  filter: string[];
  sort: string[];
  search: string[];
  info: string[];
};

export const HEADER_COMPONENT_KEY = "3361bff9b5e21071cb4fb3b86caa40a6709674ac";
export const CELL_COMPONENT_KEY = "53fd7ebf6cd6ad47b84edc13d408902720712659";

export const HEADER_PROP_KEYS: HeaderPropKeys = {
  filter: ["Select 选择"],
  sort: ["ActionIcon 操作图标"],
  search: ["ActionText 操作文字"],
  info: ["Info", "提示"]
};

export type SharedComponentConfig = {
  displayName: string;
  group: string;
  description?: string;
  figma?: {
    role: string;
    componentKey: string;
  };
  props?: Record<string, unknown>;
  variants?: Array<Record<string, unknown>>;
};

export type InitialComponentEntry = {
  key: string;
  config: SharedComponentConfig;
};

export const initialComponents: InitialComponentEntry[] = [
  {
    key: "Header/Main",
    config: {
      displayName: "表头组件",
      group: "Header",
      description: "用于表格列首，支持筛选/排序/搜索等模式。",
      figma: {
        role: "header",
        componentKey: HEADER_COMPONENT_KEY
      },
      props: {
        propKeys: HEADER_PROP_KEYS
      }
    }
  },
  {
    key: "Cell/Set",
    config: {
      displayName: "单元格组件集（基础）",
      group: "Cell",
      description: "作为表格单元格的基础组件集合，用于不同类型的 Cell 变体。",
      figma: {
        role: "cell_set",
        componentKey: CELL_COMPONENT_KEY
      }
    }
  },
  {
    key: "Cell/Text",
    config: {
      displayName: "文本单元格",
      group: "Cell",
      description: "默认的文本单元格，仅展示主文案。",
      figma: {
        role: "cell",
        componentKey: CELL_COMPONENT_KEY
      },
      props: {
        cellType: "Text",
        enabled: true,
        align: "Left",
        toggles: {
          text: true,
          icon: false,
          state: false,
          tag: false,
          avatar: false,
          input: false,
          select: false,
          check: false,
          actionIcon: false,
          actionText: false,
          description: false
        }
      }
    }
  },
  {
    key: "Cell/Tag",
    config: {
      displayName: "标签单元格",
      group: "Cell",
      description: "主要用于展示状态/标签信息，例如成功、警告、失败等。",
      figma: {
        role: "cell",
        componentKey: CELL_COMPONENT_KEY
      },
      props: {
        cellType: "Tag",
        enabled: true,
        align: "Left",
        toggles: {
          text: false,
          icon: false,
          state: false,
          tag: true,
          avatar: false,
          input: false,
          select: false,
          check: false,
          actionIcon: false,
          actionText: false,
          description: false
        }
      }
    }
  },
  {
    key: "Cell/ActionIcon",
    config: {
      displayName: "操作图标单元格",
      group: "Cell",
      description: "右侧带操作图标，例如查看、更多等。",
      figma: {
        role: "cell",
        componentKey: CELL_COMPONENT_KEY
      },
      props: {
        cellType: "ActionIcon",
        enabled: true,
        align: "Right",
        toggles: {
          text: false,
          icon: true,
          state: false,
          tag: false,
          avatar: false,
          input: false,
          select: false,
          check: false,
          actionIcon: true,
          actionText: false,
          description: false
        }
      }
    }
  },
  {
    key: "Cell/ActionText",
    config: {
      displayName: "操作文字单元格",
      group: "Cell",
      description: "以文字形式承载操作（如“查看详情”、“配置”等）。",
      figma: {
        role: "cell",
        componentKey: CELL_COMPONENT_KEY
      },
      props: {
        cellType: "ActionText",
        enabled: true,
        align: "Right",
        toggles: {
          text: true,
          icon: false,
          state: false,
          tag: false,
          avatar: false,
          input: false,
          select: false,
          check: false,
          actionIcon: false,
          actionText: true,
          description: false
        }
      }
    }
  },
  {
    key: "Cell/Select",
    config: {
      displayName: "选择单元格",
      group: "Cell",
      description: "用于下拉选择/枚举选择的单元格形式。",
      figma: {
        role: "cell",
        componentKey: CELL_COMPONENT_KEY
      },
      props: {
        cellType: "Select",
        enabled: true,
        align: "Left",
        toggles: {
          text: true,
          icon: false,
          state: false,
          tag: false,
          avatar: false,
          input: true,
          select: true,
          check: false,
          actionIcon: false,
          actionText: false,
          description: false
        }
      }
    }
  },
  {
    key: "Cell/Description",
    config: {
      displayName: "带描述的单元格",
      group: "Cell",
      description: "主标题 + 次要描述文案，用于解释字段含义或补充信息。",
      figma: {
        role: "cell",
        componentKey: CELL_COMPONENT_KEY
      },
      props: {
        cellType: "Text",
        enabled: true,
        align: "Left",
        toggles: {
          text: true,
          icon: false,
          state: false,
          tag: false,
          avatar: false,
          input: false,
          select: false,
          check: false,
          actionIcon: false,
          actionText: false,
          description: true
        }
      }
    }
  },
  {
    key: "Cell/Avatar",
    config: {
      displayName: "头像单元格",
      group: "Cell",
      description: "包含头像的单元格样式。",
      figma: {
        role: "cell",
        componentKey: CELL_COMPONENT_KEY
      },
      props: {
        cellType: "Avatar",
        enabled: true,
        align: "Left",
        toggles: {
          text: true,
          icon: false,
          state: false,
          tag: false,
          avatar: true,
          input: false,
          select: false,
          check: false,
          actionIcon: false,
          actionText: false,
          description: false
        }
      }
    }
  }
];
