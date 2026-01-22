export type ColumnType =
  | "Text"
  | "Icon"
  | "State"
  | "Tag"
  | "Input"
  | "Avatar"
  | "Select"
  | "ActionIcon"
  | "ActionText"
  | "Button"
  | "Link"
  | "Badge"
  | "Checkbox"
  | "Radio"
  | "Switch"
  | "Progress"
  | "Rating"
  | "Slider"
  | "Stepper"
  | "Textarea"
  | "TimePicker"
  | "DatePicker"
  | "Upload";

export type HeaderMode = "none" | "filter" | "sort" | "search";

export interface AiTableSpec {
  rows: number;
  cols: number;
  headers: string[];
  data: string[][];
  rowAction?: "Checkbox" | "Radio" | "Drag" | "Expand" | "Switch";
  columns?: ColumnSpec[];
}

export interface ColumnSpec {
  id: string;
  title: string;
  type: ColumnType;
  header: HeaderMode;
  width?: "FIXED" | "FILL";
  align?: "left" | "center" | "right";
}

export interface TableSchema {
  rows: number;
  cols: number;
  columns: ColumnSpec[];
  data: string[][];
  rowAction?: "Checkbox" | "Radio" | "Drag" | "Expand" | "Switch";
  config?: TableAuxConfig;
}

export interface TableAuxConfig {
  tabs?: { label: string }[];
  filters?: { label: string; type: "select" | "input" | "search" }[];
  buttons?: { label: string; type: "primary" | "secondary" | "outline" | "text" }[];
  pagination?: boolean;
}

export type TableOperation =
  | { op: "update_cell"; row: number; col: number; value: string }
  | { op: "add_rows"; count: number; position?: "start" | "end" | number }
  | { op: "insert_row"; index: number; data: string[] }
  | { op: "remove_rows"; indexes: number[] }
  | { op: "delete_row"; index: number }
  | { op: "add_cols"; count: number; position?: "start" | "end" | number; columns?: Partial<ColumnSpec>[] }
  | { op: "insert_col"; index: number; column: ColumnSpec; data: string[] }
  | { op: "remove_cols"; indexes: number[] }
  | { op: "delete_col"; index: number }
  | { op: "rename_column"; index: number; title: string }
  | { op: "rename_col"; index: number; title: string }
  | { op: "set_column_type"; index: number; type: ColumnType }
  | { op: "set_header"; index: number; header: HeaderMode }
  | { op: "set_column_width"; index: number; width: "FIXED" | "FILL" }
  | { op: "set_column_align"; index: number; align: "left" | "center" | "right" }
  | { op: "fill_column"; col: number; values: string[] }
  | { op: "translate"; lang: string }
  | { op: "update_filters"; items: { label: string; type: "select" | "input" | "search" }[] }
  | { op: "update_tabs"; items: { label: string }[] }
  | { op: "update_buttons"; items: { label: string; type: "primary" | "secondary" | "outline" | "text" }[] };

export interface TablePatch {
  operations: TableOperation[];
}

export type AiTableEnvelope =
  | { intent: "create"; schema: TableSchema }
  | { intent: "edit"; patch: TablePatch };

export type UiToPluginMessage =
  | { type: "create_table"; rows: number; cols: number; cellType: string }
  | { type: "ai_create_table"; spec: AiTableSpec }
  | { type: "ai_apply_envelope"; envelope: AiTableEnvelope }
  | { type: "update_component_key"; key: string }
  | { type: "set_col_width"; mode: "Fixed" | "Fill" }
  | { type: "set_header_props"; props: { filter: boolean; sort: boolean; search: boolean } }
  | { type: "set_cell_type"; cellType: string }
  | { type: "set_cell_align"; align: "left" | "center" | "right" }
  | { type: "set_text_display_mode"; mode: "ellipsis" | "lineBreak" }
  | { type: "apply_to_column" }
  | { type: "apply_row_height" }
  | { type: "add_column" }
  | { type: "get_component_props" }
  | { type: "set_table_size"; size: "mini" | "default" | "medium" | "large" }
  | { type: "set_row_action"; action: "none" | "multiple" | "single" | "drag" | "expand" | "switch" }
  | { type: "set_table_switch"; key: "pagination" | "filter" | "actions" | "tabs"; enabled: boolean }
  | { type: "ping" };

export interface TableContext {
  rows: number;
  cols: number;
  headers: string[];
  rowAction?: "Checkbox" | "Radio" | "Drag" | "Expand" | "Switch";
  config?: TableAuxConfig;
}

export type PluginToUiMessage =
  | {
      type: "selection";
      count: number;
      componentKey?: string;
      headerMode?: HeaderMode;
      tableContext?: TableContext;
      isSmartTable?: boolean;
      selectionKind?:
        | "table"
        | "column"
        | "cell"
        | "filter"
        | "button_group"
        | "tabs"
        | "pagination";
      selectionLabel?: string;
      tableSize?: string;
      rowAction?: string;
      tableSwitches?: {
        pagination: boolean;
        filter: boolean;
        actions: boolean;
        tabs: boolean;
      };
      colWidthMode?: "FIXED" | "FILL";
      cellType?: string;
      cellAlign?: "left" | "center" | "right";
      pluginData?: Record<string, string>;
    }
  | { type: "component_props"; props: any }
  | { type: "table_created"; rows: number; cols: number }
  | { type: "edit_completed" }
  | { type: "ai_apply_envelope_done" }
  | { type: "error"; message: string }
  | { type: "status"; message: string };
