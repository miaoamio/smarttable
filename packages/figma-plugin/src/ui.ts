import type { PluginToUiMessage, UiToPluginMessage, AiTableEnvelope, HeaderMode, ColumnType, AiTableSpec, TableContext } from "./shared/messages";
import { distributePrompt, type UploadedFileState } from "./promptDispatcher";
// import * as XLSX from "xlsx";
declare var XLSX: any;


// Global error handler to catch script loading errors
window.onerror = function(message, source, lineno, colno, error) {
  const el = document.getElementById("alert");
  const textEl = document.getElementById("alert-text");
  if (el && textEl) {
    el.style.display = "flex";
    el.style.opacity = "1";
    el.classList.add("alert-error");
    textEl.textContent = `Script Error: ${message}`;
  }
};

window.onunhandledrejection = function(event) {
  const el = document.getElementById("alert");
  const textEl = document.getElementById("alert-text");
  if (el && textEl) {
    el.style.display = "flex";
    el.style.opacity = "1";
    el.classList.add("alert-error");
    textEl.textContent = `Unhandled Rejection: ${event.reason}`;
  }
  console.error("Unhandled Rejection:", event.reason);
};

const init = function() {
  console.log("UI Script starting initialization...");
  try {
    if (typeof XLSX === 'undefined') {
      console.warn("XLSX variable is undefined, checking if it is available via import...");
      // In bundled environment, XLSX is an object from import
    }
    const globalCptable = (globalThis as any).cptable;
    const cptableRef = globalCptable ?? XLSX?.cptable;
    if (XLSX && typeof XLSX.set_cptable === "function" && cptableRef) {
      XLSX.set_cptable(cptableRef);
    } else if (XLSX && cptableRef && !XLSX.cptable) {
      XLSX.cptable = cptableRef;
    }
    console.log("XLSX check passed or warned.");

    const promptCreateInput = document.getElementById("prompt-create") as HTMLTextAreaElement;
const btnCreate = document.getElementById("btn-create") as HTMLButtonElement;
const promptEditInput = document.getElementById("prompt-edit") as HTMLTextAreaElement;
const btnEdit = document.getElementById("btn-edit") as HTMLButtonElement;
const btnAddCol = document.getElementById("btn-add-col") as HTMLButtonElement;
const loadingOverlay = document.getElementById("loading-overlay");
const cancelBtn = document.getElementById("btn-cancel") as HTMLButtonElement | null;
const btnCancelEdit = document.getElementById("btn-cancel-edit") as HTMLButtonElement | null;
const btnUploadCreate = document.getElementById("btn-upload") as HTMLButtonElement | null;
const btnUploadEdit = document.getElementById("btn-upload-edit") as HTMLButtonElement | null;

const rowCountSelectManual = document.getElementById("table-row-count-select-manual") as HTMLSelectElement;

const tableSizeSelect = document.getElementById("table-size-select") as HTMLSelectElement;
const tableRowActionSelect = document.getElementById("table-row-action-select") as HTMLSelectElement;
const switchPagination = document.getElementById("table-has-pagination") as HTMLInputElement;
const switchFilter = document.getElementById("table-has-filter") as HTMLInputElement;
const switchActions = document.getElementById("table-has-actions") as HTMLInputElement;
const switchTabs = document.getElementById("table-has-tabs") as HTMLInputElement;
const manualTablePanel = document.getElementById("manual-table-panel") as HTMLDivElement | null;
const manualColumnPanel = document.getElementById("manual-column-panel") as HTMLDivElement | null;
const columnHeaderSection = document.getElementById("column-header-section") as HTMLDivElement | null;
const cellActionsSection = document.getElementById("cell-actions-section") as HTMLDivElement | null;
const colWidthSelect = document.getElementById("column-width-select") as HTMLSelectElement;
const colWidthFixedBtn = document.getElementById("col-width-fixed") as HTMLButtonElement | null;
const colWidthHugBtn = document.getElementById("col-width-hug") as HTMLButtonElement | null;
const colWidthFillBtn = document.getElementById("col-width-fill") as HTMLButtonElement | null;
const alignLeftBtn = document.getElementById("align-left") as HTMLButtonElement | null;
const alignRightBtn = document.getElementById("align-right") as HTMLButtonElement | null;
const alignSection = document.getElementById("align-section") as HTMLDivElement | null;
const textDisplayModeSection = document.getElementById("text-display-mode-section") as HTMLDivElement | null;
const textDisplayModeSelect = document.getElementById("text-display-mode-select") as HTMLSelectElement | null;

const aiTabPanel = document.getElementById("tab-ai");
const manualTabPanel = document.getElementById("tab-manual");
const debugTabPanel = document.getElementById("tab-debug");
const aiEmptyPanel = document.getElementById("ai-empty-panel");
const aiEditPanel = document.getElementById("ai-edit-panel");
const manualEmptyPanel = document.getElementById("manual-empty-panel");
const manualEditPanel = document.getElementById("manual-edit-panel");
const tabButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".tab"));

    // 默认隐藏开发模式标签，仅在开发环境显示
    const debugTabBtn = tabButtons.find(btn => btn.dataset.tab === "debug");
    console.log("Debug tab button found:", !!debugTabBtn, "NODE_ENV:", process.env.NODE_ENV);
    if (debugTabBtn) {
      if (process.env.NODE_ENV === "production") {
        debugTabBtn.style.display = "none";
      } else {
        debugTabBtn.style.display = ""; // 移除 inline style，使用 CSS 默认显示
      }
    }

    console.log(`Found ${tabButtons.length} tab buttons.`);
    if (tabButtons.length === 0) {
      throw new Error("No tab buttons found (.tab). Check HTML structure.");
    }

    const gatewayUrlInput = document.getElementById("gateway-url") as HTMLInputElement;
    const gatewayTokenInput = document.getElementById("gateway-token") as HTMLInputElement;

    // TODO: 修改为正式的线上网关地址
    const DEFAULT_GATEWAY = "https://smartable-nine.vercel.app";

    console.log("Using gateway:", DEFAULT_GATEWAY);

    // Set default gateway URL
    if (gatewayUrlInput) {
      gatewayUrlInput.value = DEFAULT_GATEWAY;
    }

const headerTypeSelect = document.getElementById("header-type-select") as HTMLSelectElement;
const cellTypeSelect = document.getElementById("cell-type-select") as HTMLSelectElement;
const applyToColumnBtn = document.getElementById("apply-to-column");

const componentKeyInput = document.getElementById("component-key") as HTMLInputElement;
const pluginDataOutput = document.getElementById("plugin-data-output") as HTMLDivElement;
const getPropsBtn = document.getElementById("get-props");
const btnOneClickCreate = document.getElementById("btn-one-click-create");
const propsOutput = document.getElementById("props-output");
const outputEl = document.getElementById("output");
const alertEl = document.getElementById("alert") as HTMLDivElement | null;
const alertTextEl = document.getElementById("alert-text") as HTMLSpanElement | null;
const btnCopyError = document.getElementById("btn-copy-error") as HTMLButtonElement | null;
const selectionLabelEl = document.getElementById("selection-label") as HTMLDivElement | null;
const selectionLabelEditEl = document.getElementById("selection-status-edit") as HTMLDivElement | null;
const loadingDescEl = document.querySelector(".loading-desc") as HTMLDivElement | null;
let alertTimer: number | null = null;
let latestTableContext: TableContext | null = null;
let latestSelectionKind: "table" | "column" | "cell" | "filter" | "button_group" | "tabs" | "pagination" | null = null;
let latestSelectionLabel: string | null = null;
let latestSelectionCell: { row: number; col: number } | null = null;
let latestSelectionColumn: number | null = null;
let hasSelection = false;
let currentRequestSeq = 0;
let currentLoadingButton: HTMLButtonElement | null = null;

function updateCreateBtnEnabled() {
  if (!btnCreate) return;
  const val = promptCreateInput?.value?.trim() ?? "";
  const hasAttachments = createAttachments && createAttachments.length > 0;
  const shouldDisable = (val.length === 0 && !hasAttachments) || currentLoadingButton === btnCreate;
  btnCreate.disabled = shouldDisable;
}

if (btnCopyError) {
    btnCopyError.onclick = () => {
      if (alertTextEl && alertTextEl.textContent) {
        const text = alertTextEl.textContent;
        const tempTextarea = document.createElement("textarea");
        tempTextarea.value = text;
        document.body.appendChild(tempTextarea);
        tempTextarea.select();
        try {
          document.execCommand("copy");
          const oldText = btnCopyError.textContent;
          btnCopyError.textContent = "已复制";
          setTimeout(() => {
            btnCopyError.textContent = oldText;
          }, 2000);
        } catch (err) {
          console.error("Failed to copy text: ", err);
        }
        document.body.removeChild(tempTextarea);
      }
    };
  }

  function showAlert(type: "success" | "error", msg: string) {
  if (!alertEl || !alertTextEl) return;
  if (alertTimer !== null) {
    window.clearTimeout(alertTimer);
    alertTimer = null;
  }
  alertTextEl.style.whiteSpace = "pre-wrap";
  alertTextEl.style.wordBreak = "break-all";
  alertTextEl.textContent = msg;
  alertEl.style.display = "flex";
  alertEl.style.opacity = "1";
  alertEl.classList.remove("alert-success", "alert-error");
  if (type === "success") {
    alertEl.classList.add("alert-success");
    alertTimer = window.setTimeout(() => {
      alertEl!.style.opacity = "0";
      window.setTimeout(() => {
        hideAlert();
        alertTimer = null;
      }, 300);
    }, 3000);
  } else {
    alertEl.classList.add("alert-error");
  }
}

function hideAlert() {
  if (!alertEl) return;
  alertEl.style.display = "none";
  alertEl.style.opacity = "0";
  alertEl.classList.remove("alert-success", "alert-error");
}

function setOutput(msg: string) {
  if (outputEl) {
    outputEl.textContent = msg;
  }
}

function updatePanels() {
  if (!aiEmptyPanel || !aiEditPanel || !manualEmptyPanel || !manualEditPanel) return;
  if (hasSelection) {
    aiEmptyPanel.classList.add("hidden");
    aiEditPanel.classList.remove("hidden");
    manualEmptyPanel.classList.add("hidden");
    manualEditPanel.classList.remove("hidden");
  } else {
    aiEmptyPanel.classList.remove("hidden");
    aiEditPanel.classList.add("hidden");
    manualEmptyPanel.classList.remove("hidden");
    manualEditPanel.classList.add("hidden");
  }
}

function updateSelectionLabel(
  kind?: "table" | "column" | "cell" | "filter" | "button_group" | "tabs" | "pagination",
  label?: string,
  cell?: { row: number; col: number },
  column?: number
) {
  latestSelectionKind = kind ?? null;
  latestSelectionLabel = label ?? null;
  latestSelectionCell = cell ?? null;
  latestSelectionColumn = column ?? null;
  if (selectionLabelEl) {
    if (!kind || !label) {
      selectionLabelEl.textContent = "";
      selectionLabelEl.style.display = "none";
    } else {
      selectionLabelEl.textContent = label;
      selectionLabelEl.style.display = "block";
    }
  }
  if (selectionLabelEditEl) {
    if (!kind || !label) {
      selectionLabelEditEl.textContent = "";
      selectionLabelEditEl.style.display = "none";
    } else {
      selectionLabelEditEl.textContent = label;
      selectionLabelEditEl.style.display = "block";
    }
  }
}

function updateManualSubPanel(kind?: "table" | "column" | "cell" | "filter" | "button_group" | "tabs" | "pagination") {
  if (!manualTablePanel || !manualColumnPanel) return;
  if (kind === "column" || kind === "cell") {
    manualTablePanel.classList.add("hidden");
    manualColumnPanel.classList.remove("hidden");
    if (columnHeaderSection && cellActionsSection) {
      if (kind === "column") {
        columnHeaderSection.classList.remove("hidden");
        cellActionsSection.classList.add("hidden");
      } else {
        columnHeaderSection.classList.add("hidden");
        cellActionsSection.classList.remove("hidden");
      }
    }
  } else {
    manualTablePanel.classList.remove("hidden");
    manualColumnPanel.classList.add("hidden");
  }
}

function updateAiTabLabel(v: boolean) {
  const aiTab = document.querySelector<HTMLButtonElement>('.tab[data-tab="ai"]');
  if (aiTab) {
    aiTab.textContent = v ? "AI 修改" : "AI 生成";
  }
}

function setActiveTab(tab: "ai" | "manual" | "debug") {
  console.log(`Setting active tab to: ${tab}`);
  tabButtons.forEach((btn) => {
    const key = btn.dataset.tab === tab ? "add" : "remove";
    btn.classList[key]("active");
  });
  if (aiTabPanel && manualTabPanel && debugTabPanel) {
    aiTabPanel.classList.remove("active");
    manualTabPanel.classList.remove("active");
    debugTabPanel.classList.remove("active");
    if (tab === "ai") aiTabPanel.classList.add("active");
    else if (tab === "manual") manualTabPanel.classList.add("active");
    else debugTabPanel.classList.add("active");
  } else {
    console.error("Tab panels not found!", { aiTabPanel, manualTabPanel, debugTabPanel });
  }
}

function getGatewayBaseUrl() {
  const v = gatewayUrlInput?.value?.trim();
  const DEFAULT_GATEWAY = "https://smartable-nine.vercel.app";
  return (v && v.length > 0 ? v : DEFAULT_GATEWAY).replace(/\/$/, "");
}

function getGatewayAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = gatewayTokenInput?.value?.trim();
  if (token) headers.authorization = `Bearer ${token.replace(/^Bearer\s+/i, "")}`;
  return headers;
}

const TABLE_ICON_SVG = `<div style="width: 100%; height: 100%; background: white; display: flex; align-items: center; justify-content: center; border-radius: 4px;">
  <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M32.0034 2.58603C31.6283 2.21096 31.1196 2.00024 30.5892 2.00024H8C6.89543 2.00024 6 2.89568 6 4.00024V44.0002C6 45.1048 6.89543 46.0002 8 46.0002H40C41.1046 46.0002 42 45.1048 42 44.0002V13.411C42 12.8806 41.7893 12.3719 41.4142 11.9968L32.0034 2.58603Z" fill="#309256"/>
  <path d="M42 13.4993H32.4995C31.3949 13.4993 30.4995 12.6038 30.4995 11.4993V2.00024H30.5892C31.1196 2.00024 31.6283 2.21096 32.0034 2.58603L41.4142 11.9968C41.7893 12.3719 42 12.8806 42 13.411V13.4993Z" fill="#2A814B"/>
  <g filter="url(#filter0_d_22_27024)">
  <g filter="url(#filter1_d_22_27024)">
  <path d="M32.1852 19.2916H33.5895C33.8655 19.2917 34.0895 19.5155 34.0895 19.7916V36.2057C34.0895 36.4817 33.8655 36.7056 33.5895 36.7057H32.1803C32.1741 36.7059 32.168 36.7076 32.1617 36.7076H15.4547C15.4485 36.7076 15.4423 36.7059 15.4362 36.7057H14.4108C14.1346 36.7057 13.9108 36.4818 13.9108 36.2057V19.7916C13.9108 19.5155 14.1346 19.2916 14.4108 19.2916H15.4342C15.441 19.2913 15.4479 19.2896 15.4547 19.2896H32.1647C32.1716 19.2896 32.1784 19.2913 32.1852 19.2916ZM16.611 34.0074H22.651V29.3482H16.611V34.0074ZM25.3502 34.0074H31.3893V29.3482H25.3502V34.0074ZM16.611 26.648H22.651V21.9898H16.611V26.648ZM25.3502 26.648H31.3893V21.9898H25.3502V26.648Z" fill="white"/>
  </g>
  </g>
  <defs>
  <filter id="filter0_d_22_27024" x="5.91077" y="13.2896" width="36.1787" height="33.418" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
  <feFlood flood-opacity="0" result="BackgroundImageFix"/>
  <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
  <feOffset dy="2"/>
  <feGaussianBlur stdDeviation="4"/>
  <feComposite in2="hardAlpha" operator="out"/>
  <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/>
  <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_22_27024"/>
  <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_22_27024" result="shape"/>
  </filter>
  <filter id="filter1_d_22_27024" x="5.91077" y="13.2896" width="36.1787" height="33.418" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
  <feFlood flood-opacity="0" result="BackgroundImageFix"/>
  <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
  <feOffset dy="2"/>
  <feGaussianBlur stdDeviation="4"/>
  <feComposite in2="hardAlpha" operator="out"/>
  <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/>
  <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_22_27024"/>
  <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_22_27024" result="shape"/>
  </filter>
  </defs>
  </svg>
</div>`;

type UploadTarget = "create" | "edit";

let createAttachments: UploadedFileState[] = [];
let editAttachments: UploadedFileState[] = [];

function getAttachments(target: UploadTarget): UploadedFileState[] {
  return target === "create" ? createAttachments : editAttachments;
}

function setAttachments(target: UploadTarget, list: UploadedFileState[]) {
  if (target === "create") {
    createAttachments = list;
  } else {
    editAttachments = list;
  }
}

function renderAttachmentPreview(target: UploadTarget) {
  const textarea = target === "create" ? promptCreateInput : promptEditInput;
  if (!textarea) return;
  const shell = textarea.closest(".textarea-shell") as HTMLElement | null;
  if (!shell) return;

  const containerId = target === "create" ? "image-preview-list" : "image-preview-list-edit";
  let container = document.getElementById(containerId) as HTMLDivElement | null;
  
  if (!container) {
    // Fallback if ID not found
    container = shell.querySelector<HTMLDivElement>(".image-preview");
    if (!container) {
      container = document.createElement("div");
      container.className = "image-preview";
      // Insert before upload-area if possible, otherwise after textarea
      const uploadArea = shell.querySelector(".upload-area");
      if (uploadArea) {
        shell.insertBefore(container, uploadArea);
      } else {
        shell.appendChild(container);
      }
    }
  }
  const attachments = getAttachments(target);
  if (!attachments || attachments.length === 0) {
    container.innerHTML = "";
    container.style.display = "none";
    return;
  }

  container.style.display = "flex";
  container.style.gap = "8px";
  container.innerHTML = "";

  attachments.forEach((state, index) => {
    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    wrapper.style.width = "72px";
    wrapper.style.height = "72px";
    wrapper.style.borderRadius = "8px";
    wrapper.style.overflow = "hidden";
    wrapper.style.flexShrink = "0";
    wrapper.style.border = "1px solid #e5e7eb"; // Add light gray border

    if (state.type === "image") {
      const img = document.createElement("img");
      img.src = state.previewUrl;
      img.alt = state.fileName;
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      img.style.display = "block";
      wrapper.appendChild(img);
    } else {
      // Render table icon
      const iconWrapper = document.createElement("div");
      iconWrapper.style.width = "100%";
      iconWrapper.style.height = "100%";
      iconWrapper.style.display = "flex";
      iconWrapper.style.alignItems = "center";
      iconWrapper.style.justifyContent = "center";
      iconWrapper.style.backgroundColor = "#f0fdf4"; // Light green background
      iconWrapper.innerHTML = TABLE_ICON_SVG;
      wrapper.appendChild(iconWrapper);
    }

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "×";
    closeBtn.style.position = "absolute";
    closeBtn.style.top = "4px";
    closeBtn.style.right = "4px";
    closeBtn.style.width = "16px";
    closeBtn.style.height = "16px";
    closeBtn.style.border = "none";
    closeBtn.style.borderRadius = "999px";
    closeBtn.style.padding = "0";
    closeBtn.style.fontSize = "11px";
    closeBtn.style.lineHeight = "16px";
    closeBtn.style.textAlign = "center";
    closeBtn.style.background = "rgba(0,0,0,0.6)";
    closeBtn.style.color = "#fff";
    closeBtn.style.cursor = "pointer";

    closeBtn.addEventListener("click", () => {
      URL.revokeObjectURL(state.previewUrl);
      const current = getAttachments(target);
      const next = current.filter((_, i) => i !== index);
      setAttachments(target, next);
      renderAttachmentPreview(target);
    });

    if (state.loading) {
      const overlay = document.createElement("div");
      overlay.style.position = "absolute";
      overlay.style.inset = "0";
      overlay.style.backgroundColor = "rgba(0,0,0,0.5)";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
      
      const spinner = document.createElement("div");
      spinner.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><style>.spinner_ajPY{transform-origin:center;animation:spinner_AtaB .75s infinite linear}@keyframes spinner_AtaB{100%{transform:rotate(360deg)}}</style><path d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".25"/><path d="M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z" class="spinner_ajPY" fill="#fff"/></svg>`;
      
      overlay.appendChild(spinner);
      wrapper.appendChild(overlay);
      wrapper.appendChild(closeBtn); // Still allow closing while loading? Maybe.
    } else {
      wrapper.appendChild(closeBtn);
    }
    
    container!.appendChild(wrapper);
  });

  if (target === "create") {
    updateCreateBtnEnabled();
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("读取文件失败"));
    reader.readAsDataURL(file);
  });
}

async function uploadImageToCoze(file: File, target: UploadTarget) {
  if (!file.type.startsWith("image/")) {
    showAlert("error", "只支持图片文件（PNG、JPG 等）。");
    return;
  }

  const currentAttachments = getAttachments(target);
  if (currentAttachments.length >= 3) {
    showAlert("error", "最多只能上传 3 个附件。");
    return;
  }

  // Optimistic UI: Show loading state immediately
  const tempUrl = URL.createObjectURL(file);
  const tempState: UploadedFileState = {
    fileId: "", // Placeholder
    fileName: file.name,
    previewUrl: tempUrl,
    loading: true,
    type: "image"
  };

  const next = currentAttachments.concat([tempState]);
  setAttachments(target, next);
  renderAttachmentPreview(target);

  try {
    const baseUrl = getGatewayBaseUrl();
    const headers = getGatewayAuthHeaders();
    headers["content-type"] = "application/json";

    const dataUrl = await fileToDataUrl(file);

    const res = await fetchWithTimeout(`${baseUrl}/files/upload`, {
      method: "POST",
      headers,
      timeout: 30000, // 30 seconds for image upload
      body: JSON.stringify({
        name: file.name,
        type: file.type,
        data: dataUrl
      })
    });

    const raw = await res.text();
    let json: any;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new Error(`上传响应不是 JSON: ${raw.slice(0, 200)}`);
    }
    if (!res.ok || (typeof json?.code === "number" && json.code !== 0)) {
      const msg = typeof json?.msg === "string" ? json.msg : res.statusText;
      throw new Error(`上传失败(${res.status}): ${msg}`);
    }

    const fileId = json?.data?.id || json?.data?.file_id;
    if (!fileId || typeof fileId !== "string") {
      throw new Error("上传成功但缺少 file_id");
    }

    // Success: Update state to remove loading
    const latest = getAttachments(target);
    const updated = latest.map((item) => {
      if (item.previewUrl === tempUrl) {
        return Object.assign({}, item, { fileId: fileId, loading: false });
      }
      return item;
    });
    setAttachments(target, updated);
    renderAttachmentPreview(target);
  } catch (e: any) {
    // Failure: Remove the temp image
    const latest = getAttachments(target);
    const updated = latest.filter((item) => item.previewUrl !== tempUrl);
    setAttachments(target, updated);
    renderAttachmentPreview(target);
    URL.revokeObjectURL(tempUrl);

    const msg = e?.message ? String(e.message) : "上传失败";
    showAlert("error", msg);
  }
}

async function fetchWithTimeout(url: string, options: RequestInit & { timeout?: number } = {}) {
  // 增加默认超时到 120s，因为 AI 生成复杂表格可能非常慢
  const { timeout = 120000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => {
    console.warn(`Fetch aborted due to timeout (${timeout}ms): ${url}`);
    controller.abort();
  }, timeout);
  try {
    const response = await fetch(url, Object.assign({}, options, {
      signal: controller.signal
    }));
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function loadCellTypeOptions() {
  if (!cellTypeSelect) return;
  cellTypeSelect.innerHTML = "";

  const options: { value: string; label: string }[] = [
    { value: "Text", label: "Text 文字" },
    { value: "Tag", label: "Tag 标签" },
    { value: "State", label: "State 状态" },
    { value: "Avatar", label: "Avatar 头像" },
    { value: "Input", label: "Input 输入" },
    { value: "Select", label: "Select 选择" },
    { value: "ActionIcon", label: "ActionIcon 操作图标" },
    { value: "ActionText", label: "ActionText 操作文字" }
  ];

  try {
    const baseUrl = getGatewayBaseUrl();
    const headers = getGatewayAuthHeaders();
    // 3 seconds timeout for background check
    await fetchWithTimeout(`${baseUrl}/components`, { headers, timeout: 3000 }).catch(() => {});
  } catch {}

  for (const opt of options) {
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.label;
    cellTypeSelect.appendChild(o);
  }
}

let progressTimer: number | null = null;

function setFakeProgress(hasImage: boolean) {
  if (progressTimer !== null) {
    clearInterval(progressTimer);
    progressTimer = null;
  }

  const steps = hasImage
    ? [
        { time: 0, text: "正在上传并分析图片..." },
        { time: 2000, text: "正在OCR读取图片中的文字..." },
        { time: 6000, text: "正在理解表格结构..." },
        { time: 12000, text: "AI 正在生成最终表格..." },
        { time: 25000, text: "处理较复杂，请耐心等待..." }
      ]
    : [
        { time: 0, text: "正在分析需求..." },
        { time: 3000, text: "AI 正在规划表格结构..." },
        { time: 8000, text: "正在生成数据..." },
        { time: 15000, text: "即将完成..." }
      ];

  const startTime = Date.now();
  
  // Set initial text
  if (loadingDescEl) loadingDescEl.textContent = steps[0].text;
  setOutput(steps[0].text);

  progressTimer = window.setInterval(() => {
    const elapsed = Date.now() - startTime;
    // Find the last step that matches the elapsed time
    let currentStep = steps[0];
    for (let i = steps.length - 1; i >= 0; i--) {
      if (elapsed >= steps[i].time) {
        currentStep = steps[i];
        break;
      }
    }
    
    if (loadingDescEl && loadingDescEl.textContent !== currentStep.text) {
      loadingDescEl.textContent = currentStep.text;
      setOutput(currentStep.text);
    }
  }, 500);
}

function stopFakeProgress() {
  if (progressTimer !== null) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
}

function resetLoadingState() {
  stopFakeProgress();
  if (currentLoadingButton) {
    currentLoadingButton.disabled = false;
    currentLoadingButton.textContent = currentLoadingButton.dataset.originalText || "AI 生成表格";
    currentLoadingButton = null;
  }
  // Ensure buttons are re-enabled
  if (btnCreate) {
    btnCreate.disabled = false;
    if (btnCreate.dataset.originalText && btnCreate.textContent !== btnCreate.dataset.originalText) {
      btnCreate.textContent = btnCreate.dataset.originalText;
    }
  }
  if (btnEdit) {
    btnEdit.disabled = false;
    if (btnEdit.dataset.originalText && btnEdit.textContent !== btnEdit.dataset.originalText) {
      btnEdit.textContent = btnEdit.dataset.originalText;
    }
  }

  if (loadingOverlay) loadingOverlay.classList.add("hidden");

  if (cancelBtn && cancelBtn.parentElement) (cancelBtn.parentElement as HTMLElement).style.display = "none";
  if (btnCancelEdit && btnCancelEdit.parentElement) (btnCancelEdit.parentElement as HTMLElement).style.display = "none";

  updateCreateBtnEnabled();
}

function setLoading(btn: HTMLButtonElement, isLoading: boolean, text: string = "AI 生成表格", hasImage: boolean = false) {
  if (isLoading) {
    currentLoadingButton = btn;
    btn.disabled = true;
    btn.dataset.originalText = btn.textContent || text;
    
    setFakeProgress(hasImage);

    if (btn === btnCreate) {
      if (cancelBtn && cancelBtn.parentElement) (cancelBtn.parentElement as HTMLElement).style.display = "block";
    } else if (btn === btnEdit) {
      if (btnCancelEdit && btnCancelEdit.parentElement) (btnCancelEdit.parentElement as HTMLElement).style.display = "block";
    }

    if (loadingOverlay) loadingOverlay.classList.remove("hidden");
  } else {
    resetLoadingState();
  }
}

tableSizeSelect?.addEventListener("change", () => {
  const size = tableSizeSelect.value as "mini" | "default" | "medium" | "large";
  post({ type: "set_table_size", size });
});

tableRowActionSelect?.addEventListener("change", () => {
  const action = tableRowActionSelect.value as "none" | "multiple" | "single" | "drag" | "expand" | "switch";
  post({ type: "set_row_action", action });
});

rowCountSelectManual?.addEventListener("change", () => {
  const rows = parseInt(rowCountSelectManual.value) || 5;
  post({ type: "set_table_rows", rows });
});

switchPagination?.addEventListener("change", () => {
  post({ type: "set_table_switch", key: "pagination", enabled: switchPagination.checked });
});

switchFilter?.addEventListener("change", () => {
  post({ type: "set_table_switch", key: "filter", enabled: switchFilter.checked });
});

switchActions?.addEventListener("change", () => {
  post({ type: "set_table_switch", key: "actions", enabled: switchActions.checked });
});

switchTabs?.addEventListener("change", () => {
  post({ type: "set_table_switch", key: "tabs", enabled: switchTabs.checked });
});

function post(msg: UiToPluginMessage) {
  parent.postMessage({ pluginMessage: msg }, "*");
}

function extractJsonText(raw: string) {
  const s = raw.trim();
  // 改进：即使 markdown 块不在开头也能找到它
  const match = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) {
    return match[1].trim();
  }
  return s;
}

function extractAllJsonObjects(raw: string): string[] {
  const s = raw.trim();
  const result: string[] = [];
  let inString = false;
  let escaped = false;
  let depth = 0;
  let start = -1;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        result.push(s.slice(start, i + 1).trim());
        start = -1;
      } else if (depth < 0) {
        // 容错：忽略多余的闭合括号
        depth = 0;
      }
    }
  }

  // Handle truncated JSON: if we're still inside an object when the string ends
  if (depth > 0 && start !== -1) {
    let truncated = s.slice(start).trim();
    // Proactively try to close the JSON structure
    let closure = "";
    for (let d = 0; d < depth; d++) {
      closure += "}";
    }
    
    // Also check if we're inside a string
    if (inString) {
      truncated += '"';
    }
    
    result.push(truncated + closure);
  }

  return result;
}

function tryParseTruncatedJson(s: string): any {
  try {
    return JSON.parse(s);
  } catch (e) {
    let repaired = s.trim();
    
    // 容错：如果末尾有多余的闭合括号，尝试移除它们
    while (repaired.endsWith("}") && !repaired.startsWith("{")) {
        repaired = repaired.slice(0, -1).trim();
    }
    
    // Count braces and brackets
    let openBraces = (repaired.match(/\{/g) || []).length;
    let closeBraces = (repaired.match(/\}/g) || []).length;
    let openBrackets = (repaired.match(/\[/g) || []).length;
    let closeBrackets = (repaired.match(/\]/g) || []).length;
    
    // 移除末尾非法逗号
    repaired = repaired.replace(/,\s*$/, "");
    
    // 自动闭合
    while (openBrackets > closeBrackets) {
      repaired += "]";
      closeBrackets++;
    }
    while (openBraces > closeBraces) {
      repaired += "}";
      closeBraces++;
    }
    
    // 再次尝试：如果闭合括号过多，尝试逐个移除末尾的 } 直到解析成功
    let attempt = repaired;
    while (attempt.endsWith("}")) {
        try {
            return JSON.parse(attempt);
        } catch {
            attempt = attempt.slice(0, -1).trim();
        }
    }
    
    return null;
  }
}

function isHeaderMode(v: any): v is HeaderMode {
  return v === "none" || v === "filter" || v === "sort" || v === "search";
}

function isColumnType(v: any): v is ColumnType {
  return (
    v === "Text" ||
    v === "Icon" ||
    v === "State" ||
    v === "Tag" ||
    v === "Input" ||
    v === "Avatar" ||
    v === "Select" ||
    v === "ActionIcon" ||
    v === "ActionText" ||
    v === "Button" ||
    v === "Link" ||
    v === "Badge" ||
    v === "Checkbox" ||
    v === "Radio" ||
    v === "Switch" ||
    v === "Progress" ||
    v === "Rating" ||
    v === "Slider" ||
    v === "Stepper" ||
    v === "Textarea" ||
    v === "TimePicker" ||
    v === "DatePicker" ||
    v === "Upload"
  );
}

function coerceStringCell(v: any) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function isDefaultColumnHeader(v: any): boolean {
  if (typeof v !== "string") return false;
  const s = v.trim();
  return /^默认列\d+$/.test(s);
}

function normalizeRows(value: any, fallback = 10): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function isNumericTitle(title: string): boolean {
  if (typeof title !== "string") return false;
  const t = title.toLowerCase();
  return /(qps|qpm|tps|pv|uv|count|次数|数量|金额|时长|延迟|耗时|cpu|内存)/.test(t);
}

function sampleCellValue(title: string, type: ColumnType | string, r: number, c: number): string {
  const idx = (r * 7 + c * 3) % 1000;
  if (type === "Number" || isNumericTitle(title)) {
    return String(400 + (idx % 1600));
  }
  if (type === "Avatar") {
    const names = ["张也明", "吴清海", "马林溪", "赵素雅", "秦瑞鑫", "左思昭", "王荣", "万子涵", "梁苏", "林群生"];
    return names[(r + c) % names.length];
  }
  if (type === "Tag") {
    const tags = ["成功", "失败", "进行中", "待定", "已完成", "High", "Medium", "Low"];
    return tags[(r + c) % tags.length];
  }
  const t = (title || "").toLowerCase();
  if (t === "psm") {
    const ch = String.fromCharCode(97 + (r % 26));
    return `data.monitor.service_${ch}`;
  }
  if (t === "vdc") {
    const list = ["bj", "sh", "gz", "hz", "sz"];
    return `vdc-${list[(r + c) % list.length]}`;
  }
  if (/版本/.test(title)) {
    return `v${1 + (r % 3)}.${(c % 5)}.${(r + c) % 10}`;
  }
  return `示例值${r + 1}-${c + 1}`;
}

function normalizeData(rows: number, cols: number, raw: any, columns?: { title: string; type: ColumnType }[]): string[][] {
  const arr = Array.isArray(raw) ? raw : [];
  const sourceLen = arr.length;
  
  // Get desired row count from UI if not explicitly provided or if we want to override
  // In most cases, 'rows' parameter already comes from the envelope which is influenced by our prompt
  // However, for safety and consistency with "loop content" requirement:
  const out: string[][] = [];
  for (let r = 0; r < rows; r++) {
    let srcRow: any[] | undefined;
    if (sourceLen > 0) {
      // Loop existing data if rows exceed source length (Requirement: 若当前数据不足，则在同一列中循环使用内容)
      srcRow = Array.isArray(arr[r % sourceLen]) ? arr[r % sourceLen] : undefined;
    }

    const newRow: string[] = [];
    for (let c = 0; c < cols; c++) {
      if (srcRow) {
        // If the row exists (or is looped), use its value
        const v = coerceStringCell(srcRow[c]);
        newRow.push(v);
      } else {
        // Only if no data provided at all, use sample values
        const title = columns?.[c]?.title ?? "";
        const type = columns?.[c]?.type ?? "Text";
        newRow.push(sampleCellValue(title, type, r, c));
      }
    }
    out.push(newRow);
  }
  return out;
}

function coerceLegacyToEnvelope(obj: any): AiTableEnvelope {
  if (typeof obj === "string") {
    try {
      const parsed = JSON.parse(obj);
      return coerceLegacyToEnvelope(parsed);
    } catch {
      // fall through
    }
  }

  if (Array.isArray(obj) && obj.length > 0) {
    return coerceLegacyToEnvelope(obj[0]);
  }

  if (obj && typeof obj === "object" && "envelope" in obj) {
    return coerceLegacyToEnvelope((obj as any).envelope);
  }

  // 改进：处理嵌套的 schema
  if (obj && obj.schema && obj.schema.schema && typeof obj.schema.schema === "object") {
    return coerceLegacyToEnvelope(Object.assign({}, obj, { schema: obj.schema.schema }));
  }

  if (obj && String(obj.intent).toLowerCase() === "create") {
    const s = (obj as any).schema ?? {};
    const cols = normalizeRows(s.cols, Array.isArray(s.columns) ? s.columns.length : (Array.isArray(s.data) && s.data.length > 0 ? s.data[0].length : 3));
    const rows = normalizeRows(s.rows, Array.isArray(s.data) ? s.data.length : 10);
    const rawCols: any[] = Array.isArray(s.columns) ? s.columns : Array.from({ length: cols }, () => ({}));
    const columns = rawCols.slice(0, cols).map((c, i) => ({
      id: typeof c?.id === "string" ? c.id : `col_${i + 1}`,
      title: typeof c?.title === "string" ? c.title : "",
      type: isColumnType(c?.type) ? (c.type as ColumnType) : (String(c?.type).toLowerCase() === "number" ? "Text" : "Text"),
      header: isHeaderMode(c?.header) ? (c.header as HeaderMode) : "none"
    }));
    const data = normalizeData(rows, cols, s.data, columns.map((c) => ({ title: c.title, type: c.type as ColumnType })));
    const rowAction = s.rowAction;
    const config = s.config;
    return { intent: "create", schema: { rows, cols, columns, data, rowAction, config } };
  }
  if (obj && String(obj.intent).toLowerCase() === "edit") {
    const res = obj as AiTableEnvelope;
    res.intent = "edit";
    return res;
  }

  if (obj && obj.schema && typeof obj.schema === "object") {
    return coerceLegacyToEnvelope({ intent: "create", schema: obj.schema });
  }

  if (
    obj &&
    Number.isFinite(obj.rows) &&
    Number.isFinite(obj.cols) &&
    Array.isArray(obj.columns) &&
    Array.isArray(obj.data)
  ) {
    const cols = normalizeRows(obj.cols, Array.isArray(obj.columns) ? obj.columns.length : 3);
    const rows = normalizeRows(obj.rows, Array.isArray(obj.data) ? obj.data.length : 10);
    const rawCols: any[] = Array.isArray(obj.columns) ? obj.columns : Array.from({ length: cols }, () => ({}));
    const columns = rawCols.slice(0, cols).map((c, i) => ({
      id: typeof c?.id === "string" ? c.id : `col_${i + 1}`,
      title: typeof c?.title === "string" ? c.title : "",
      type: isColumnType(c?.type) ? (c.type as ColumnType) : "Text",
      header: isHeaderMode(c?.header) ? (c.header as HeaderMode) : "none"
    }));
    const data = normalizeData(rows, cols, obj.data, columns.map((c) => ({ title: c.title, type: c.type as ColumnType })));
    return { intent: "create", schema: { rows, cols, columns, data } };
  }

  if (obj && Number.isFinite(obj.rows) && Number.isFinite(obj.cols) && Array.isArray(obj.headers) && Array.isArray(obj.data)) {
    const cols = normalizeRows(obj.cols, Array.isArray(obj.headers) ? obj.headers.length : 3);
    const rows = normalizeRows(obj.rows, 10);
    const headers: string[] = obj.headers.map(String);
    const columns = headers.slice(0, cols).map((title, i) => ({ id: `col_${i + 1}`, title, type: "Text" as ColumnType, header: "none" as HeaderMode }));
    const data: string[][] = normalizeData(rows, cols, obj.data, columns.map((c) => ({ title: c.title, type: c.type as ColumnType })));
    return {
      intent: "create",
      schema: {
        rows,
        cols,
        columns,
        data
      }
    };
  }

  if (obj && Number.isFinite(obj.rowCount) && Array.isArray(obj.columns) && Array.isArray(obj.data)) {
    const rows = normalizeRows(obj.rowCount, 10);
    const columnsRaw: any[] = obj.columns;

    const meaningfulIndexes = columnsRaw
      .map((c, i) => ({ i, header: typeof c?.header === "string" ? c.header : "" }))
      .filter((x) => !isDefaultColumnHeader(x.header));

    const indexList =
      meaningfulIndexes.length > 0 && meaningfulIndexes.length < columnsRaw.length
        ? meaningfulIndexes.map((x) => x.i)
        : columnsRaw.map((_, i) => i);

    const cols = indexList.length;

    const columns = indexList.map((idx, logicalIndex) => {
      const c = columnsRaw[idx] ?? {};
      const title = typeof c?.header === "string" ? c.header : "";
      const rawType = c?.figmaCellType;
      const type = isColumnType(rawType) ? (rawType as ColumnType) : "Text";
      const header = isHeaderMode(c?.headerMode) ? (c.headerMode as HeaderMode) : (rawType === "Number" ? "sort" : "none");
      return { id: `col_${logicalIndex + 1}`, title, type, header };
    });

    const headersByIdx = indexList.map((idx) => {
      const c = columnsRaw[idx] ?? {};
      return typeof c?.header === "string" ? c.header : "";
    });
    const legacyRows = Array.isArray(obj.data) ? obj.data : [];
    const mapped = legacyRows.map((row: any) => {
      if (Array.isArray(row)) {
        return indexList.map((idx) => coerceStringCell(row[idx]));
      } else if (row && typeof row === "object") {
        return headersByIdx.map((h) => coerceStringCell((row as any)[h]));
      } else {
        return [];
      }
    });
    const data: string[][] = normalizeData(rows, cols, mapped, columns.map((c) => ({ title: c.title, type: c.type })));

    return { intent: "create", schema: { rows, cols, columns, data } };
  }

  throw new Error("无法识别 AI 返回结构");
}

function parseEnvelopeFromText(raw: string): AiTableEnvelope {
  const body = extractJsonText(raw);
  const segments = extractAllJsonObjects(body);
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    try {
      const obj = tryParseTruncatedJson(seg);
      if (!obj) continue;
      if (typeof obj === "object" && ((obj as any).name === "FunctionCallPlugin" || (obj as any).name === "FunctionCall")) {
        continue;
      }
      const env = coerceLegacyToEnvelope(obj);
      return env;
    } catch {
    }
  }
  throw new Error("无法识别 AI 返回结构");
}

// Debug tab is now a dedicated panel; no toggle needed.


async function handleAiGeneration(prompt: string, isEdit: boolean, btn: HTMLButtonElement) {
  const requestId = ++currentRequestSeq;
  const DEFAULT_GATEWAY = process.env.NODE_ENV === "production" 
    ? "https://smartable-nine.vercel.app" 
    : "http://localhost:8787";
  const gatewayUrl = gatewayUrlInput?.value?.trim() || DEFAULT_GATEWAY;
  const gatewayToken = gatewayTokenInput?.value?.trim() ?? "";

  hideAlert();
  const attachments = getAttachments(isEdit ? "edit" : "create");
  
  // Distinguish between images and tables
  const imageAttachments = attachments.filter(a => a.type === "image");
  
  const hasImages = imageAttachments.length > 0;

  setLoading(btn, true, undefined, hasImages);
  setOutput("正在请求 AI 生成/编辑 Envelope...");

  const selectedRowCount = parseInt(rowCountSelectManual?.value) || 5;

  try {
    const userPrompt = distributePrompt(
      prompt,
      isEdit,
      attachments,
      latestSelectionLabel || "未选中",
      latestTableContext,
      selectedRowCount,
      latestSelectionKind || undefined,
      latestSelectionCell || undefined,
      latestSelectionColumn ?? undefined
    );

    // 调试日志：确认发送给 LLM 的 prompt
    const debugPrompt = `=== SENDING PROMPT ===\n${userPrompt}\n\n=== WAITING FOR RESPONSE ===`;
    console.log(debugPrompt);
    // Also show in debug tab output
    if (propsOutput) {
        propsOutput.textContent = debugPrompt;
        propsOutput.style.display = "block";
    }

    const headers: Record<string, string> = { "content-type": "application/json" };
    if (gatewayToken) headers.authorization = `Bearer ${gatewayToken.replace(/^Bearer\s+/i, "")}`;
  
    let res: Response;
    try {
      res = await fetchWithTimeout(`${gatewayUrl.replace(/\/$/, "")}/tools/llm_chat`, {
        method: "POST",
        headers,
        timeout: 120000, // 120 seconds for AI generation
        body: JSON.stringify({
          args: {
            system: undefined,
            prompt: userPrompt,
            images:
              imageAttachments.length > 0
                ? imageAttachments.map((img) => ({
                    fileId: img.fileId,
                    fileName: img.fileName,
                    url: img.url
                  }))
                : undefined,
            temperature: 0.1, // Lower temperature for more deterministic JSON
            maxTokens: 2000   // Increase token limit for complex edits
          }
        })
      });
    } catch (e: any) {
      if (e.name === "AbortError" || (e.message && e.message.includes("abort"))) {
        throw new Error("请求超时 (120s)。生成 10 行数据且包含图片识别可能需要较长时间，请尝试减少行数或稍后再试。");
      }
      throw e;
    }

    let json: any;
    const rawText = await res.text();
    if (requestId !== currentRequestSeq) {
      return;
    }

    try {
      json = JSON.parse(rawText);
    } catch (e) {
      if (!res.ok) {
        const msg = `网关请求失败 (${res.status}): ${res.statusText || "服务器超时或发生错误"}`;
        setOutput(msg);
        showAlert("error", msg);
        setLoading(btn, false);
        return;
      }
      throw new Error(`无法解析网关响应: ${rawText.slice(0, 200)}`);
    }

    if (!res.ok) {
      const msg = `网关请求失败: ${json?.error ? String(json.error) : res.statusText}`;
      setOutput(msg);
      showAlert("error", msg);
      setLoading(btn, false);
      return;
    }
    if (json?.error) {
      const msg = `AI 请求失败: ${String(json.error)}`;
      setOutput(msg);
      showAlert("error", msg);
      setLoading(btn, false);
      return;
    }

    const text = typeof json?.text === "string" ? json.text : "";
    let parsed: AiTableEnvelope;
    try {
      parsed = parseEnvelopeFromText(text);
    } catch (e: any) {
      const toolPattern = /"FunctionCallPlugin"|"FunctionCall"|OCRhuoshanban-general_ocr/;
      if (text && toolPattern.test(text)) {
        if (requestId === currentRequestSeq) {
          const msg = "识别图片中的文字中，请稍后在 Coze 中确认 Bot 已返回表格 JSON，然后重新点击生成。";
          setOutput(msg);
          showAlert("success", "识别图片中的文字中");
          setLoading(btn, false);
        }
        return;
      }
      const snippet = text ? text.slice(0, 1000) : "";
      const extra = snippet ? `\n\nAI 原始输出片段:\n${snippet}${text.length > 1000 ? "..." : ""}` : "";
      throw new Error(`${e?.message ? String(e.message) : String(e)}${extra}`);
    }

    if (!isEdit && parsed.intent !== "create") {
      throw new Error(`期望 intent=create，但模型返回了 ${parsed.intent}。`);
    }
    if (isEdit && parsed.intent !== "edit") {
      throw new Error(`期望 intent=edit，但模型返回了 ${parsed.intent}。`);
    }

    if (parsed.intent === "create") {
      setOutput(`Envelope(create) 已生成，正在创建并填充表格...`);
      // Debug output
      console.log("Create Envelope:", JSON.stringify(parsed, null, 2));
      if (propsOutput) {
          const prev = propsOutput.textContent || "";
          propsOutput.textContent = `${prev}\n\n=== AI RESPONSE (Create) ===\n${JSON.stringify(parsed, null, 2)}`;
      }
      post({ type: "ai_apply_envelope", envelope: parsed });
      setLoading(btn, false);
    } else if (parsed.intent === "edit") {
      setOutput(`Envelope(edit) 已生成，正在应用增量变更...`);
      // Debug output - show in UI for verification
      const debugMsg = JSON.stringify(parsed, null, 2);
      console.log("Edit Envelope:", debugMsg);
      // Temporarily show in props output for user to see
      if (propsOutput) {
          const prev = propsOutput.textContent || "";
          propsOutput.textContent = `${prev}\n\n=== AI RESPONSE (Edit) ===\n${debugMsg}`;
          propsOutput.style.display = "block";
      }
      post({ type: "ai_apply_envelope", envelope: parsed });
      setLoading(btn, false);
    } else {
      throw new Error("Envelope intent 非法");
    }
  } catch (e: any) {
    if (requestId !== currentRequestSeq) {
      return;
    }
    const msg = `AI 生成失败: ${e?.message ? String(e.message) : String(e)}`;
    setOutput(msg);
    showAlert("error", msg);
    setLoading(btn, false);
  }
}

btnCreate?.addEventListener("click", () => {
  const prompt = promptCreateInput?.value?.trim() ?? "";
  handleAiGeneration(prompt, false, btnCreate);
});

promptCreateInput?.addEventListener("input", () => {
  updateCreateBtnEnabled();
});

btnEdit?.addEventListener("click", () => {
  const prompt = promptEditInput?.value?.trim() ?? "";
  handleAiGeneration(prompt, true, btnEdit);
});

btnAddCol?.addEventListener("click", () => {
  post({ type: "add_column" });
});


// Header Type Change
headerTypeSelect?.addEventListener("change", () => {
  const val = headerTypeSelect.value;
  // Map dropdown values to HeaderMode
  let mode: HeaderMode = "none";
  if (val === "Filter") mode = "filter";
  else if (val === "Sort") mode = "sort";
  else if (val === "Search") mode = "search";
  else if (val === "Info") mode = "info";
  
  post({ type: "set_header_mode", mode });
});

// Cell Type Change
cellTypeSelect?.addEventListener("change", () => {
  const val = cellTypeSelect.value;
  post({ type: "set_cell_type", cellType: val });
});

// Text Display Mode Change
 textDisplayModeSelect?.addEventListener("change", () => {
   const val = textDisplayModeSelect.value;
   post({ type: "set_text_display_mode", mode: val as "ellipsis" | "lineBreak" });
 });

// Column Width Change
colWidthSelect?.addEventListener("change", () => {
  let mode: "Fixed" | "Fill" | "Hug" = "Fixed";
  if (colWidthSelect.value === "FILL") mode = "Fill";
  else if (colWidthSelect.value === "HUG") mode = "Hug";
  post({ type: "set_col_width", mode });
});

function setColWidthMode(mode: "FIXED" | "FILL" | "HUG", emitEvent = true) {
  if (!colWidthSelect) return;
  colWidthSelect.value = mode;
  if (emitEvent) {
    const evt = new Event("change");
    colWidthSelect.dispatchEvent(evt);
  }
  if (colWidthFixedBtn && colWidthFillBtn && colWidthHugBtn) {
    colWidthFixedBtn.classList.toggle("active", mode === "FIXED");
    colWidthHugBtn.classList.toggle("active", mode === "HUG");
    colWidthFillBtn.classList.toggle("active", mode === "FILL");
  }
}

colWidthFixedBtn?.addEventListener("click", () => {
  setColWidthMode("FIXED");
});

colWidthHugBtn?.addEventListener("click", () => {
  setColWidthMode("HUG");
});

colWidthFillBtn?.addEventListener("click", () => {
  setColWidthMode("FILL");
});

function setAlignActive(target: HTMLButtonElement | null) {
  const all = [alignLeftBtn, alignRightBtn];
  for (const btn of all) {
    if (!btn) continue;
    if (btn === target) btn.classList.add("active");
    else btn.classList.remove("active");
  }
}

alignLeftBtn?.addEventListener("click", () => {
  setAlignActive(alignLeftBtn);
  post({ type: "set_cell_align", align: "left" });
});

alignRightBtn?.addEventListener("click", () => {
  setAlignActive(alignRightBtn);
  post({ type: "set_cell_align", align: "right" });
});

applyToColumnBtn?.addEventListener("click", () => {
  post({ type: "apply_to_column" });
});

function setupImageUpload() {
  if (btnUploadCreate && promptCreateInput) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (file) {
        uploadImageToCoze(file, "create");
      }
      input.value = "";
    });
    document.body.appendChild(input);

    btnUploadCreate.addEventListener("click", () => {
      input.click();
    });

    promptCreateInput.addEventListener("paste", (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file && file.type.startsWith("image/")) {
            e.preventDefault();
            uploadImageToCoze(file, "create");
            break;
          }
        }
      }
    });
  }

  if (btnUploadEdit && promptEditInput) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (file) {
        uploadImageToCoze(file, "edit");
      }
      input.value = "";
    });
    document.body.appendChild(input);

    btnUploadEdit.addEventListener("click", () => {
      input.click();
    });

    promptEditInput.addEventListener("paste", (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file && file.type.startsWith("image/")) {
            e.preventDefault();
            uploadImageToCoze(file, "edit");
            break;
          }
        }
      }
    });
  }
}

async function handleExcelFile(file: File, target: UploadTarget) {
  const currentAttachments = getAttachments(target);
  if (currentAttachments.length >= 3) {
    showAlert("error", "最多只能上传 3 个附件。");
    return;
  }

  // Optimistic UI
  const tempId = Math.random().toString(36).slice(2);
  const tempState: UploadedFileState = {
    fileId: tempId,
    fileName: file.name,
    previewUrl: "", // No URL needed for table icon rendering
    loading: true,
    type: "table"
  };

  const next = currentAttachments.concat([tempState]);
  setAttachments(target, next);
  renderAttachmentPreview(target);

  try {
      const buffer = await file.arrayBuffer();
      const binary = new Uint8Array(buffer);
      
      // Log magic number for debugging
      const magic = Array.from(binary.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join(' ').toUpperCase();
      console.log(`File: ${file.name}, Size: ${file.size} bytes, Magic: ${magic}`);

      let wb;
      const isXLSX = magic.startsWith("50 4B"); // ZIP/XLSX
      const isXLS = magic.startsWith("D0 CF");  // Old XLS (97-2003)
      const isCSV = file.name.toLowerCase().endsWith(".csv") || magic.startsWith("22") || magic.startsWith("49 44"); // " (quote) or ID (ID/IDN)
      const isUTF16LE = magic.startsWith("FF FE"); // UTF-16LE BOM
      const isUTF16BE = magic.startsWith("FE FF"); // UTF-16BE BOM
      const isUTF8BOM = magic.startsWith("EF BB BF"); // UTF-8 BOM
      const isHTML = magic.startsWith("3C 21") || magic.startsWith("3C 68") || magic.startsWith("3C 3F"); // <! or <h or <?
      const headBytes = binary.slice(0, 2048);
      let zeroCount = 0;
      let lineBreakCount = 0;
      let delimiterCount = 0;
      for (let i = 0; i < headBytes.length; i++) {
        const b = headBytes[i];
        if (b === 0) zeroCount++;
        if (b === 0x0A || b === 0x0D) lineBreakCount++;
        if (b === 0x2C || b === 0x09 || b === 0x3B) delimiterCount++;
      }
      const zeroRatio = headBytes.length > 0 ? zeroCount / headBytes.length : 1;
      const isLikelyText = !isXLSX && !isXLS && !isHTML && zeroRatio < 0.05 && lineBreakCount > 0 && delimiterCount > 2;

      console.log(`[File Probe] Name: ${file.name}, Magic: ${magic}, isXLS: ${isXLS}, isCSV: ${isCSV}, isHTML: ${isHTML}, isLikelyText: ${isLikelyText}, size: ${file.size}`);

      const getWorkbookScore = (workbook: any): { score: number, chineseCount: number, garbledCount: number } => {
        try {
          const firstSheetName = workbook.SheetNames[0];
          if (!firstSheetName) return { score: -100, chineseCount: 0, garbledCount: 0 };
          const firstSheet = workbook.Sheets[firstSheetName];
          let garbledCount = 0;
          let chineseCount = 0;
          let rareChineseCount = 0;
          
          // 扩大采样范围到 20 行 10 列
          const range = XLSX.utils.decode_range(firstSheet['!ref'] || 'A1:J20');
          const maxR = Math.min(range.e.r, 20);
          const maxC = Math.min(range.e.c, 10);
          
          for (let r = range.s.r; r <= maxR; r++) {
            for (let c = range.s.c; c <= maxC; c++) {
              const cell = firstSheet[XLSX.utils.encode_cell({r, c})];
              if (cell && typeof cell.v === 'string' && cell.v.trim().length > 0) {
                const val = cell.v;
                
                // 更加精准的乱码检测：统计 \uFFFD (替换字符) 和 \u0000 (空字节) 的出现次数
                const garbledMatch = val.match(/[\uFFFD\u0000]/g);
                if (garbledMatch) garbledCount += garbledMatch.length;
                
                // 常用汉字
                const commonChineseMatch = val.match(/[\u4e00-\u9fa5]/g);
                if (commonChineseMatch) chineseCount += commonChineseMatch.length;
                
                // 生僻汉字：权重降低，避免误伤
                const rareChineseMatch = val.match(/[\u3400-\u4DBF\u20000-\u2A6DF\u9FA6-\u9FFF]/g);
                if (rareChineseMatch) rareChineseCount += rareChineseMatch.length;
              }
            }
          }
          
          // 优化评分算法：乱码扣分加重，生僻字扣分减弱
          let score = chineseCount * 10 - rareChineseCount * 5 - garbledCount * 50;
          
          if (garbledCount === 0 && chineseCount > 0) {
            score += 1000; // 纯净的中文文本给予大幅加分
          }
          return { score, chineseCount, garbledCount };
        } catch (e) {
          return { score: -999, chineseCount: 0, garbledCount: 999 };
        }
      };

      const tryReadWithEncoding = (buf: Uint8Array, cp: number | string): { workbook: any, score: number, chineseCount: number, garbledCount: number } => {
        try {
          const readOptions: any = { type: "array" };
          if (cp !== "auto") {
            readOptions.codepage = typeof cp === 'string' ? parseInt(cp) : cp;
          }
          
          const workbook = XLSX.read(buf, readOptions);
          const scoreInfo = getWorkbookScore(workbook);
          let score = scoreInfo.score;
          if ((cp === "auto" || cp === 65001) && scoreInfo.garbledCount === 0 && scoreInfo.chineseCount > 0) {
            score += 500;
          }
          return { workbook, score, chineseCount: scoreInfo.chineseCount, garbledCount: scoreInfo.garbledCount };
        } catch (e) {
          return { workbook: null, score: -999, chineseCount: 0, garbledCount: 999 };
        }
      };

      const encodings = [
        { name: 'UTF-8', cp: 65001 },
        { name: 'GBK', cp: 936 },
        { name: 'GB18030', cp: 54936 },
        { name: 'UTF-16LE', cp: 1200 },
        { name: 'UTF-16BE', cp: 1201 },
        { name: 'Big5', cp: 950 },
        { name: 'Shift-JIS', cp: 932 }
      ];

      const selectWorkbookByEncoding = (buf: Uint8Array) => {
        const candidates = encodings.slice();
        const uint8View = buf;
        let nullCount = 0;
        for (let i = 1; i < Math.min(uint8View.length, 1000); i += 2) {
          if (uint8View[i] === 0) nullCount++;
        }
        if (nullCount > 50) {
          const leIdx = candidates.findIndex(e => e.name === 'UTF-16LE');
          if (leIdx > -1) {
            const [le] = candidates.splice(leIdx, 1);
            candidates.unshift(le);
          }
        }

        let bestEnc = candidates[0];
        let bestRes = tryReadWithEncoding(buf, bestEnc.cp);
        for (let i = 1; i < candidates.length; i++) {
          const res = tryReadWithEncoding(buf, candidates[i].cp);
          console.log(`[Probe] ${candidates[i].name}: Score ${res.score}, Chinese ${res.chineseCount}, Garbled ${res.garbledCount}`);
          // 如果分数更高，或者当前分数虽然相等但之前的最佳选择是负分且当前编码是 UTF-8/GBK 等更通用的编码
          if (res.score > bestRes.score) {
            bestRes = res;
            bestEnc = candidates[i];
          } else if (res.score === bestRes.score && bestRes.score < 0) {
             // 倾向于选择 GBK，因为很多乱码文件其实是 GBK
             if (candidates[i].name === 'GBK') {
                bestRes = res;
                bestEnc = candidates[i];
             }
          }
        }
        console.log(`[Final Decision] Using ${bestEnc.name}, score ${bestRes.score}, chinese ${bestRes.chineseCount}, garbled ${bestRes.garbledCount}`);
        return { workbook: bestRes.workbook, encoding: bestEnc, score: bestRes.score };
      };

      try {
        if (isXLSX || isXLS) {
          console.log(isXLSX ? "Standard XLSX" : "Legacy XLS (97-2003)");
          wb = XLSX.read(binary, { type: "array" });
          const scoreInfo = getWorkbookScore(wb);
          console.log(`[Workbook Score] initial score ${scoreInfo.score}, chinese ${scoreInfo.chineseCount}, garbled ${scoreInfo.garbledCount}`);
          
          // 只有当分数极低，且不是标准的 XLSX 时，才尝试切换编码（防止 XLSX 误判）
          if (scoreInfo.score < -500 && !isXLSX) {
            const picked = selectWorkbookByEncoding(binary);
            if (picked.workbook && picked.score > scoreInfo.score) {
              wb = picked.workbook;
              console.log(`[Workbook Retry] switched encoding to ${picked.encoding.name}`);
            }
          }
        } else if (isCSV) {
          console.log("CSV detected, starting encoding detection...");
          if (isUTF8BOM) {
            wb = XLSX.read(binary, { type: "array", codepage: 65001 });
          } else if (isUTF16LE) {
            wb = XLSX.read(binary, { type: "array", codepage: 1200 });
          } else if (isUTF16BE) {
            wb = XLSX.read(binary, { type: "array", codepage: 1201 });
          } else {
            const picked = selectWorkbookByEncoding(binary);
            wb = picked.workbook || XLSX.read(binary, { type: "array" });
          }
        } else if (isUTF8BOM) {
          console.log("UTF-8 with BOM detected");
          wb = XLSX.read(binary, { type: "array", codepage: 65001 });
        } else if (isUTF16LE) {
          console.log("UTF-16LE with BOM detected");
          wb = XLSX.read(binary, { type: "array", codepage: 1200 });
        } else if (isUTF16BE) {
          console.log("UTF-16BE with BOM detected");
          wb = XLSX.read(binary, { type: "array", codepage: 1201 });
        } else if (isHTML) {
          console.log("HTML/XML table detected");
          wb = XLSX.read(binary, { type: "array" });
        } else if (isLikelyText) {
          const picked = selectWorkbookByEncoding(binary);
          wb = picked.workbook || XLSX.read(binary, { type: "array" });
        } else {
          const picked = selectWorkbookByEncoding(binary);
          wb = picked.workbook || XLSX.read(binary, { type: "array" });
        }
      } catch (e) {
        console.error("Parse failed:", e);
        wb = XLSX.read(binary, { type: "array" });
      }
    const sheetName = wb.SheetNames[0];
      if (wb.SheetNames.length > 1) {
        console.warn(`File has multiple sheets: ${wb.SheetNames.join(", ")}. Using the first one: ${sheetName}`);
        showAlert("success", `检测到多个工作表，已默认读取第一个：${sheetName}`);
      }
      const sheet = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as string[][];
      const headerRow = data[0] || [];
      const sampleRows = data.slice(1, 4);
      const preview = { headers: headerRow, sample: sampleRows };
      console.log(`Parsed ${file.name}: rows ${data.length}, cols ${headerRow.length}`);
      console.log(`[Parsed Preview]`, preview);
      if (data && data.length > 0) {
      // Clean data: remove completely empty rows
      const cleanData = data
        .map(row => (row || []).map(cell => cell == null ? "" : String(cell).trim()))
        .filter(row => row.some(cell => cell !== ""));

      if (cleanData.length === 0) throw new Error("表格内容为空");

      const headers = cleanData[0];
      const allBody = cleanData.slice(1);
      
      // 1. 限制原始数据参考最多 15 行，避免 prompt 过长
      const limitedBody = allBody.slice(0, 15);
      
      // 2. 获取用户选择的行数，用于生成最终展示数据
      const selectedRowCount = parseInt(rowCountSelectManual?.value) || 5;

      // 3. 构造展示用的数据：如果上传的数据多于选择的行数，截取；如果少于，循环
      const typicalBody: string[][] = [];
      if (limitedBody.length > 0) {
        for (let i = 0; i < selectedRowCount; i++) {
          typicalBody.push(limitedBody[i % limitedBody.length]);
        }
      }

      const rows = typicalBody.length;
      const cols = headers.length;
      
      const spec: AiTableSpec = {
        rows,
        cols,
        headers,
        data: typicalBody
      };
      
      // Success
      const latest = getAttachments(target);
      const updated = latest.map((item) => {
        if (item.fileId === tempId) {
          return Object.assign({}, item, { loading: false, data: spec });
        }
        return item;
      });
      setAttachments(target, updated);
      renderAttachmentPreview(target);
      
      const msg = `成功解析表格 (已按设定行数 ${selectedRowCount} 提取数据): ${rows}行 x ${cols}列`;
      setOutput(msg);
    } else {
      throw new Error("表格内容为空");
    }
  } catch (e) {
    // Failure
    const latest = getAttachments(target);
    const updated = latest.filter((item) => item.fileId !== tempId);
    setAttachments(target, updated);
    renderAttachmentPreview(target);
    
    const msg = "解析表格失败: " + String(e);
    setOutput(msg);
    showAlert("error", msg);
  }
}

function setupExcelUpload() {
  console.log("Setting up Excel upload...");
  const setup = (btnId: string, target: UploadTarget) => {
    const btn = document.getElementById(btnId) as HTMLButtonElement | null;
    if (btn) {
      if (btn.dataset.uploadInitialized === "true") {
        console.log(`Upload button ${btnId} already initialized.`);
        return;
      }
      btn.dataset.uploadInitialized = "true";

      console.log(`Found Excel upload button: ${btnId}`);
      
      // Use a consistent ID for the input to avoid duplicates if re-run
      const inputId = `input-${btnId}`;
      let input = document.getElementById(inputId) as HTMLInputElement;
      
      if (!input) {
        input = document.createElement("input");
        input.id = inputId;
        input.type = "file";
        input.accept = ".xlsx, .xls, .csv";
        input.style.display = "none";
        document.body.appendChild(input);
      }

      // Use onchange assignment to avoid stacking listeners
      input.onchange = () => {
        console.log(`File selected for ${btnId}`);
        const file = input.files && input.files[0];
        if (file) {
          handleExcelFile(file, target);
        }
        input.value = "";
      };

      btn.addEventListener("click", (e) => {
        e.preventDefault(); // Prevent default button behavior
        e.stopPropagation(); // Stop propagation
        console.log(`Button clicked: ${btnId}`);
        input.click();
      });
    } else {
      console.warn(`Excel upload button not found: ${btnId}`);
    }
  };

  setup("btn-upload-excel", "create");
  setup("btn-upload-excel-edit", "edit");
}

cancelBtn?.addEventListener("click", () => {
  if (!currentLoadingButton) return;
  currentRequestSeq++;
  const msg = "已取消生成。";
  setOutput(msg);
  showAlert("error", msg);
  setLoading(currentLoadingButton, false);
});

btnCancelEdit?.addEventListener("click", () => {
  if (!currentLoadingButton) return;
  currentRequestSeq++;
  const msg = "已取消修改。";
  setOutput(msg);
  showAlert("error", msg);
  setLoading(currentLoadingButton, false);
});

// Get Props
getPropsBtn?.addEventListener("click", () => {
  if (propsOutput) {
    propsOutput.style.display = "block";
    propsOutput.innerText = "Reading...";
  }
  const key = componentKeyInput?.value?.trim();
  post({ type: "get_component_props", key } as any);
});

// One-click create subscription table
btnOneClickCreate?.addEventListener("click", () => {
  const subscriptionData = {
    "intent": "create",
    "schema": {
      "rows": 10,
      "cols": 8,
      "columns": [
        { "id": "col_1", "title": "订阅策略ID", "type": "Text", "header": "none" },
        { "id": "col_2", "title": "订阅策略名", "type": "Text", "header": "none" },
        { "id": "col_3", "title": "订阅节点列表/类型", "type": "Text", "header": "none" },
        { "id": "col_4", "title": "订阅节点列表", "type": "Text", "header": "none" },
        { "id": "col_5", "title": "订阅节点类型", "type": "Text", "header": "none" },
        { "id": "col_6", "title": "订阅配置人", "type": "Avatar", "header": "none" },
        { "id": "col_7", "title": "变更类型", "type": "Tag", "header": "none" },
        { "id": "col_8", "title": "操作", "type": "ActionText", "header": "none" }
      ],
      "data": [
        [ "68f789bc9...", "剪C商业化PSM Changes", "订阅节点列表", "影像|商业化|服务树节点服务树服务...", "包含子节点", "宋明杰", "创建 +3", "查看 编辑 删除" ],
        [ "68f789bc9...", "剪C商业化PSM Changes", "订阅节点列表", "|影像|商业化|服务树节点服务树服务...+4", "包含子节点+3", "宋明杰", "创建 +3", "查看 编辑 删除" ],
        [ "68f789bc9...", "剪C商业化PSM Changes", "订阅节点列表", "|影像|商业化|服务树节点服务树服务...", "包含子节点+3", "宋明杰", "创建 +3", "查看 编辑 删除" ],
        [ "68f789bc9...", "剪C商业化PSM Changes", "订阅节点列表", "|影像|商业化|服务树节点服务树服务树服务...", "包含子节点", "宋明杰", "创建 迁移 +3", "查看 编辑 删除" ],
        [ "68f789bc9...", "剪C商业化PSM Changes", "订阅节点列表", "|影像|商业化|服务树节点服务树服务树服务...", "包含子节点+3", "宋明杰", "迁移", "查看 编辑 删除" ],
        [ "68f789bc9...", "剪C商业化PSM Changes", "订阅节点列表", "|影像|商业化", "包含子节点+3", "宋明杰", "迁移", "查看 编辑 删除" ],
        [ "68f789bc9...", "剪C商业化PSM Changes", "订阅节点列表", "|影像|商业化", "包含子节点", "宋明杰", "迁移", "查看 编辑 删除" ],
        [ "68f789bc9...", "剪C商业化PSM Changes", "订阅节点列表", "|影像|商业化", "包含子节点", "宋明杰", "创建 +3", "查看 编辑 删除" ],
        [ "68f789bc9...", "剪C商业化PSM Changes", "订阅节点列表", "|影像|商业化", "包含子节点", "宋明杰", "创建 +3", "查看 编辑 删除" ],
        [ "68f789bc9...", "剪C商业化PSM Changes", "订阅节点列表", "影像商业化", "包含子节点", "宋明杰", "创建", "查看 编辑 删除" ]
      ]
    }
  };

  try {
    const envelope = coerceLegacyToEnvelope(subscriptionData);
    setOutput("正在一键创建订阅表格...");
    post({ type: "ai_apply_envelope", envelope });
  } catch (e: any) {
    showAlert("error", "一键生成失败: " + e.message);
  }
});

tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const data = btn.dataset.tab || "ai";
      console.log(`Tab clicked: ${data}`);
      const tab = data === "manual" ? "manual" : data === "debug" ? "debug" : "ai";
      setActiveTab(tab);
    });
  });

updatePanels();
setActiveTab("ai");
updateAiTabLabel(false);
updateCreateBtnEnabled();
setupImageUpload();
setupExcelUpload();

window.onmessage = (event) => {
  const msg = event.data.pluginMessage as PluginToUiMessage;
  if (!msg) return;

  if (msg.type === "selection") {
    latestTableContext = msg.tableContext ?? null;
    hasSelection = !!msg.selectionKind;
    updateAiTabLabel(hasSelection);
    if (msg.componentKey && componentKeyInput) {
      componentKeyInput.value = msg.componentKey;
    }
    updatePanels();
    updateSelectionLabel(msg.selectionKind, msg.selectionLabel, msg.selectionCell, msg.selectionColumn);
    updateManualSubPanel(msg.selectionKind);
    const currentTab = document.querySelector(".tab.active")?.getAttribute("data-tab");
    if ((msg.tableContext || msg.isSmartTable) && currentTab !== "debug") {
      setActiveTab("manual");
    }

    if (msg.tableSize && tableSizeSelect) {
      tableSizeSelect.value = msg.tableSize;
    }
    if (msg.rowAction && tableRowActionSelect) {
      // Normalize old values to new ones if necessary
      let val = msg.rowAction;
      if (val === "Checkbox") val = "multiple";
      if (val === "Radio") val = "single";
      if (val === "Switch") val = "switch";
      if (val === "Drag") val = "drag";
      if (val === "Expand") val = "expand";
      
      tableRowActionSelect.value = val;
    }
    if (msg.headerMode && headerTypeSelect) {
      if (msg.headerMode === "filter") headerTypeSelect.value = "Filter";
      else if (msg.headerMode === "sort") headerTypeSelect.value = "Sort";
      else if (msg.headerMode === "search") headerTypeSelect.value = "Search";
      else if (msg.headerMode === "info") headerTypeSelect.value = "Info";
      else headerTypeSelect.value = "None";
    }
    if (msg.tableSwitches) {
      if (switchPagination) switchPagination.checked = msg.tableSwitches.pagination;
      if (switchFilter) switchFilter.checked = msg.tableSwitches.filter;
      if (switchActions) switchActions.checked = msg.tableSwitches.actions;
      if (switchTabs) switchTabs.checked = msg.tableSwitches.tabs;
    }
    
    if (msg.colWidthMode) {
      setColWidthMode(msg.colWidthMode, false);
    }
    if (msg.cellType && cellTypeSelect) {
      cellTypeSelect.value = msg.cellType;
    }
    if (msg.cellAlign) {
       setAlignActive(msg.cellAlign === "left" ? alignLeftBtn : alignRightBtn);
    }
    
    // Update section visibility based on cell type
    const isText = msg.cellType === "Text";
    if (alignSection) {
      if (isText) alignSection.classList.remove("hidden");
      else alignSection.classList.add("hidden");
    }
    if (textDisplayModeSection) {
      if (isText) textDisplayModeSection.classList.remove("hidden");
      else textDisplayModeSection.classList.add("hidden");
    }
    
    // Update display mode select value if provided in plugin data
    if (msg.pluginData && msg.pluginData.textDisplayMode && textDisplayModeSelect) {
      textDisplayModeSelect.value = msg.pluginData.textDisplayMode;
    }
    
    if (pluginDataOutput) {
      if (msg.pluginData && Object.keys(msg.pluginData).length > 0) {
        pluginDataOutput.textContent = JSON.stringify(msg.pluginData, null, 2);
      } else {
        pluginDataOutput.textContent = "无数据";
      }
    }
  } else if (msg.type === "component_props") {
    if (propsOutput) {
      propsOutput.textContent = JSON.stringify(msg.props, null, 2);
      propsOutput.style.display = "block";
    }
  } else if (msg.type === "error") {
    const text = `错误: ${msg.message}`;
    setOutput(text);
    showAlert("error", text);
    if (propsOutput && propsOutput.style.display === "block") {
      propsOutput.textContent = text;
    }
    resetLoadingState();
  } else if (msg.type === "status") {
    setOutput(msg.message);
  } else if (msg.type === "table_created") {
    const text = `成功生成表格 ${msg.rows}x${msg.cols}`;
    setOutput(text);
    showAlert("success", text);
    resetLoadingState();
  } else if (msg.type === "edit_completed") {
    const text = "表格修改完成";
    setOutput(text);
    showAlert("success", text);
    resetLoadingState();
  } else if (msg.type === "ai_apply_envelope_done") {
    resetLoadingState();
  }
};
  // Start initialization immediately
  setupExcelUpload();
  loadCellTypeOptions();
  } catch (err: any) {
    const el = document.getElementById("alert");
    const textEl = document.getElementById("alert-text");
    if (el && textEl) {
      el.style.display = "flex";
      el.style.opacity = "1";
      el.classList.add("alert-error");
      textEl.textContent = `Initialization Error: ${err.message}`;
    }
    console.error(err);
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
