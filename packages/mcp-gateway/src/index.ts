import http from "node:http";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import * as XLSX from "xlsx";
import jschardet from "jschardet";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolResultSchema, ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";

import { loadEnvFromFiles } from "./env.js";
import { initialComponents } from "./component-config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverScript = path.resolve(__dirname, "../../mcp-server/dist/index.js");

loadEnvFromFiles({ rootDir: path.resolve(__dirname, "../../..") });

const copiedEnv: Record<string, string> = {};
for (const [k, v] of Object.entries(process.env)) {
  if (typeof v === "string") copiedEnv[k] = v;
}

const transport = new StdioClientTransport({ command: process.execPath, args: [serverScript], env: copiedEnv });

const mcp = new Client({ name: "mcp-figma-gateway", version: "0.1.0" }, { capabilities: {} });
await mcp.connect(transport);

function getEnv(name: string) {
  const v = process.env[name];
  if (typeof v !== "string") return undefined;
  let s = v.trim();
  if (!s) return undefined;
  if (s.startsWith("`") && s.endsWith("`") && s.length >= 2) s = s.slice(1, -1).trim();
  if (s.startsWith("\"") && s.endsWith("\"") && s.length >= 2) s = s.slice(1, -1).trim();
  if (s.startsWith("'") && s.endsWith("'") && s.length >= 2) s = s.slice(1, -1).trim();
  return s || undefined;
}

const corsOrigins = (getEnv("CORS_ORIGINS") ?? "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const authToken = getEnv("GATEWAY_AUTH_TOKEN");
const jwtSecret = getEnv("GATEWAY_JWT_SECRET");
const maxBodyBytes = Number(getEnv("MAX_BODY_BYTES") ?? "10485760");
const rateLimitPerMinute = Number(getEnv("RATE_LIMIT_PER_MIN") ?? "120");
const port = Number(process.env.PORT ?? 8787);

const llmKeyLen = (
  getEnv("LLM_API_KEY") ??
  ""
).length;
const authMode = authToken ? "token" : jwtSecret ? "jwt" : "none";
console.log(
  JSON.stringify({
    service: "mcp-gateway",
    port,
    authMode,
    corsOrigins,
    rateLimitPerMinute,
    maxBodyBytes,
    llm: {
      baseUrl: getEnv("LLM_BASE_URL"),
      model: getEnv("LLM_MODEL"),
      apiKeyLen: llmKeyLen
    }
  })
);

function withCors(req: http.IncomingMessage, res: http.ServerResponse) {
  let origin = req.headers.origin;
  if (origin === "null") {
    origin = undefined;
  }

  const allowAll = corsOrigins.includes("*");

  if (allowAll || !origin) {
    res.setHeader("access-control-allow-origin", "*");
  } else if (origin && corsOrigins.includes(origin as string)) {
    res.setHeader("access-control-allow-origin", origin);
    res.setHeader("vary", "origin");
  }

  res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS,DELETE");
  res.setHeader("access-control-allow-headers", "content-type, authorization, x-requested-with");
}

function sendJson(req: http.IncomingMessage, res: http.ServerResponse, status: number, body: unknown) {
  withCors(req, res);
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function sendHtml(req: http.IncomingMessage, res: http.ServerResponse, status: number, body: string) {
  withCors(req, res);
  res.statusCode = status;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.end(body);
}

function base64UrlDecode(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function verifyJwtHs256(token: string, secret: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false as const, error: "invalid_token_format" };
  const [headerB64, payloadB64, sigB64] = parts;

  let headerJson: any;
  let payloadJson: any;
  try {
    headerJson = JSON.parse(base64UrlDecode(headerB64));
    payloadJson = JSON.parse(base64UrlDecode(payloadB64));
  } catch {
    return { ok: false as const, error: "invalid_token_json" };
  }

  if (headerJson?.alg !== "HS256") return { ok: false as const, error: "unsupported_alg" };

  const data = `${headerB64}.${payloadB64}`;
  const expected = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  if (expected !== sigB64) return { ok: false as const, error: "bad_signature" };

  const now = Math.floor(Date.now() / 1000);
  if (typeof payloadJson?.exp === "number" && payloadJson.exp < now) {
    return { ok: false as const, error: "token_expired" };
  }

  const sub = typeof payloadJson?.sub === "string" ? payloadJson.sub : undefined;
  return { ok: true as const, sub };
}

function parseBearer(req: http.IncomingMessage) {
  const h = req.headers.authorization;
  if (typeof h !== "string") return undefined;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : undefined;
}

function authenticate(req: http.IncomingMessage) {
  if (!authToken && !jwtSecret) return { ok: true as const, subject: "anonymous" };
  const token = parseBearer(req);
  if (!token) return { ok: false as const, status: 401 as const, error: "missing_authorization" };

  if (authToken) {
    if (token !== authToken) return { ok: false as const, status: 403 as const, error: "invalid_token" };
    return { ok: true as const, subject: "static" };
  }

  if (jwtSecret) {
    const v = verifyJwtHs256(token, jwtSecret);
    if (!v.ok) return { ok: false as const, status: 403 as const, error: v.error };
    return { ok: true as const, subject: v.sub ?? "jwt" };
  }

  return { ok: false as const, status: 403 as const, error: "invalid_auth_config" };
}

function getClientKey(req: http.IncomingMessage, subject: string) {
  const fwd = req.headers["x-forwarded-for"];
  const ip =
    (typeof fwd === "string" ? fwd.split(",")[0]?.trim() : undefined) ??
    req.socket.remoteAddress ??
    "unknown";
  return `${subject}:${ip}`;
}

const rate = new Map<string, { windowStartMs: number; count: number }>();
function allowRequest(key: string) {
  if (!Number.isFinite(rateLimitPerMinute) || rateLimitPerMinute <= 0) return true;
  const now = Date.now();
  const windowMs = 60_000;
  const cur = rate.get(key);
  if (!cur || now - cur.windowStartMs >= windowMs) {
    rate.set(key, { windowStartMs: now, count: 1 });
    return true;
  }
  if (cur.count >= rateLimitPerMinute) return false;
  cur.count += 1;
  return true;
}

type ComponentDefinition = {
  key: string;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

const components = new Map<string, ComponentDefinition>();

for (const entry of initialComponents) {
  const now = new Date().toISOString();
  if (!components.has(entry.key)) {
    const def: ComponentDefinition = {
      key: entry.key,
      config: entry.config as Record<string, unknown>,
      createdAt: now,
      updatedAt: now
    };
    components.set(entry.key, def);
  }
}

const adminPageHtml = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>组件管理后台</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;padding:16px;background:#0b1020;color:#e5e7eb}
h1{font-size:20px;margin:0 0 12px}
.toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px}
input,textarea,button{font:inherit}
input,textarea{background:#020617;border:1px solid #1f2937;border-radius:4px;color:#e5e7eb;padding:6px 8px}
textarea{width:100%;min-height:120px;resize:vertical}
button{border:none;border-radius:4px;padding:6px 12px;background:#2563eb;color:#f9fafb;cursor:pointer}
button.secondary{background:#111827}
button.danger{background:#b91c1c}
button:disabled{opacity:.6;cursor:default}
table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}
th,td{border-bottom:1px solid #1f2937;padding:6px 8px;text-align:left;vertical-align:top}
th{background:#020617}
tr:hover td{background:#020617}
.key-cell{font-family:Menlo,monospace;font-size:12px}
.config-snippet{max-width:280px;white-space:pre-wrap;word-break:break-all}
.status{margin-top:8px;font-size:12px;color:#9ca3af}
.layout{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,3fr);gap:12px}
@media (max-width:900px){.layout{grid-template-columns:1fr}}
</style>
</head>
<body>
<h1>组件管理后台</h1>
<div class="toolbar">
<button id="reload-btn" type="button">刷新列表</button>
<span style="flex:1"></span>
<label style="display:flex;align-items:center;gap:4px;font-size:12px;color:#9ca3af">
Token:
<input id="token-input" type="password" placeholder="可选，如配置了 GATEWAY_AUTH_TOKEN" style="min-width:220px">
</label>
<button id="save-token-btn" type="button" class="secondary">保存 Token</button>
</div>
<div class="layout">
<div>
<table>
<thead>
<tr>
<th style="width:32%">Key</th>
<th style="width:40%">配置摘要</th>
<th>时间</th>
<th style="width:100px">操作</th>
</tr>
</thead>
<tbody id="components-body"></tbody>
</table>
</div>
<div>
<div style="margin-bottom:8px;font-size:13px">编辑组件</div>
<div style="display:flex;flex-direction:column;gap:6px">
<input id="edit-key" placeholder="组件 key，例如：Cell/NumberRight">
<textarea id="edit-config" placeholder='组件配置 JSON，例如:
{
  "displayName": "数字右对齐单元格",
  "group": "Cell",
  "props": {
    "cell_type": "number",
    "cell_align": "right"
  }
}'></textarea>
<div style="display:flex;gap:8px;justify-content:flex-end">
<button id="create-update-btn" type="button">创建/更新组件</button>
<button id="delete-btn" type="button" class="danger">删除当前组件</button>
</div>
</div>
<div id="status" class="status"></div>
</div>
</div>
<script>
var tokenStorageKey="mcp_gateway_token";
var tokenInput=document.getElementById("token-input");
var saveTokenBtn=document.getElementById("save-token-btn");
var reloadBtn=document.getElementById("reload-btn");
var bodyEl=document.getElementById("components-body");
var editKey=document.getElementById("edit-key");
var editConfig=document.getElementById("edit-config");
var createUpdateBtn=document.getElementById("create-update-btn");
var deleteBtn=document.getElementById("delete-btn");
var statusEl=document.getElementById("status");
function getToken(){try{return window.localStorage.getItem(tokenStorageKey)||"";}catch(e){return"";}}
function setToken(v){try{window.localStorage.setItem(tokenStorageKey,v||"");}catch(e){}}
function applyTokenToInput(){var t=getToken();if(tokenInput)tokenInput.value=t;}
function setStatus(msg){if(statusEl)statusEl.textContent=msg||"";}
function getAuthHeaders(){var t=tokenInput?tokenInput.value.trim():"";var h={};if(t)h.authorization="Bearer "+t;return h;}
function formatConfigSnippet(obj){try{return JSON.stringify(obj); }catch(e){return String(obj);}}
function renderList(items){if(!bodyEl)return;bodyEl.innerHTML="";if(!items||!items.length){var tr=document.createElement("tr");var td=document.createElement("td");td.colSpan=4;td.textContent="暂无组件定义";td.style.color="#6b7280";tr.appendChild(td);bodyEl.appendChild(tr);return;}items.forEach(function(item){var tr=document.createElement("tr");var tdKey=document.createElement("td");tdKey.className="key-cell";tdKey.textContent=item.key;var tdCfg=document.createElement("td");tdCfg.className="config-snippet";tdCfg.textContent=formatConfigSnippet(item.config);var tdTime=document.createElement("td");tdTime.innerHTML="<div>创建: "+(item.createdAt||"")+"</div><div>更新: "+(item.updatedAt||"")+"</div>";tdTime.style.fontSize="11px";tdTime.style.color="#9ca3af";var tdOps=document.createElement("td");var editBtn=document.createElement("button");editBtn.type="button";editBtn.textContent="编辑";editBtn.className="secondary";editBtn.onclick=function(){if(editKey)editKey.value=item.key;if(editConfig)editConfig.value=formatConfigSnippet(item.config);};var delBtn=document.createElement("button");delBtn.type="button";delBtn.textContent="删除";delBtn.className="danger";delBtn.style.marginLeft="4px";delBtn.onclick=function(){if(!confirm("确定删除组件 "+item.key+" ?"))return;deleteComponent(item.key);};tdOps.appendChild(editBtn);tdOps.appendChild(delBtn);tr.appendChild(tdKey);tr.appendChild(tdCfg);tr.appendChild(tdTime);tr.appendChild(tdOps);bodyEl.appendChild(tr);});}
function loadComponents(){setStatus("加载组件列表中...");var headers=getAuthHeaders();fetch("/components",{headers:headers}).then(function(res){if(!res.ok){return res.json().catch(function(){return{}}).then(function(j){throw new Error(j&&j.error?j.error:res.statusText);});}return res.json();}).then(function(json){renderList(json.items||[]);setStatus("已加载组件 "+(json.items?json.items.length:0)+" 个");}).catch(function(err){setStatus("加载失败: "+err.message);});}
function createOrUpdateComponent(){if(!editKey||!editConfig){return;}var key=editKey.value.trim();var raw=editConfig.value.trim();if(!key){setStatus("请填写组件 key");return;}if(!raw){setStatus("请填写配置 JSON");return;}var cfg;try{cfg=JSON.parse(raw);}catch(e){setStatus("配置 JSON 解析失败: "+e.message);return;}setStatus("提交中...");var headers=getAuthHeaders();headers["content-type"]="application/json";fetch("/components",{method:"POST",headers:headers,body:JSON.stringify({key:key,config:cfg})}).then(function(res){return res.json().catch(function(){return{}}).then(function(json){if(!res.ok){throw new Error(json&&json.error?json.error:res.statusText);}return json;});}).then(function(json){setStatus("保存成功: "+json.key);loadComponents();}).catch(function(err){setStatus("保存失败: "+err.message);});}
function deleteComponent(key){var headers=getAuthHeaders();fetch("/components/"+encodeURIComponent(key),{method:"DELETE",headers:headers}).then(function(res){if(res.status===204){setStatus("已删除组件 "+key);loadComponents();return;}return res.json().catch(function(){return{}}).then(function(json){throw new Error(json&&json.error?json.error:res.statusText);});}).catch(function(err){setStatus("删除失败: "+err.message);});}
if(saveTokenBtn&&tokenInput){saveTokenBtn.onclick=function(){setToken(tokenInput.value.trim());setStatus("Token 已保存，仅保存在本地浏览器");};}
if(reloadBtn){reloadBtn.onclick=function(){loadComponents();};}
if(createUpdateBtn){createUpdateBtn.onclick=function(){createOrUpdateComponent();};}
if(deleteBtn){deleteBtn.onclick=function(){if(!editKey)return;var key=editKey.value.trim();if(!key){setStatus("请先在左侧选择组件或填写 key");return;}if(!confirm("确定删除组件 "+key+" ?"))return;deleteComponent(key);};}
applyTokenToInput();
loadComponents();
</script>
</body>
</html>`;

function readJson(req: http.IncomingMessage) {
  return new Promise<unknown>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    req.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (Number.isFinite(maxBodyBytes) && maxBodyBytes > 0 && bytes > maxBodyBytes) {
        reject(new Error("request_body_too_large"));
        req.destroy();
        return;
      }
      chunks.push(Buffer.from(chunk));
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8").trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {
  if (!req.url) {
    sendJson(req, res, 400, { error: "missing_url" });
    return;
  }

  if (req.method === "OPTIONS") {
    withCors(req, res);
    res.statusCode = 200;
    res.setHeader("content-length", "0");
    res.end();
    return;
  }

  const url = new URL(req.url, "http://localhost");

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(req, res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && (url.pathname === "/admin" || url.pathname === "/admin/components")) {
    sendHtml(req, res, 200, adminPageHtml);
    return;
  }

  const auth = authenticate(req);
  if (!auth.ok) {
    sendJson(req, res, auth.status, { error: auth.error });
    return;
  }
  const rateKey = getClientKey(req, auth.subject);
  if (!allowRequest(rateKey)) {
    sendJson(req, res, 429, { error: "rate_limited" });
    return;
  }

  if (req.method === "POST" && url.pathname === "/parse-excel") {
    let body: any;
    try {
      body = await readJson(req);
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : String(e);
      sendJson(req, res, msg === "request_body_too_large" ? 413 : 400, { error: msg });
      return;
    }

    const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : "upload.xlsx";
    let data = typeof body?.data === "string" ? body.data.trim() : "";
    if (!data) {
      sendJson(req, res, 400, { error: "missing_data" });
      return;
    }
    const commaIdx = data.indexOf(",");
    if (commaIdx >= 0) data = data.slice(commaIdx + 1);

    let buf: Buffer;
    try {
      buf = Buffer.from(data, "base64");
    } catch (e: any) {
      sendJson(req, res, 400, { error: "invalid_base64" });
      return;
    }

    try {
      let wb: XLSX.WorkBook;
      const isCSV = name.toLowerCase().endsWith(".csv");
      
      if (isCSV) {
        // For CSV, try to detect encoding
        const detected = jschardet.detect(buf);
        const encoding = detected.encoding === "GB2312" ? "GBK" : detected.encoding;
        
        // Map common encodings to codepages
        const cpMap: Record<string, number> = {
          "UTF-8": 65001,
          "GBK": 936,
          "GB2312": 936,
          "GB18030": 54936,
          "windows-1252": 1252,
          "UTF-16LE": 1200,
          "UTF-16BE": 1201,
          "Big5": 950,
          "Shift_JIS": 932
        };
        
        const codepage = cpMap[encoding] || 65001;
        wb = XLSX.read(buf, { type: "buffer", codepage });
      } else {
        // For Excel files, they are usually self-describing or ZIP
        wb = XLSX.read(buf, { type: "buffer" });
      }

      const sheetName = wb.SheetNames[0];
      if (!sheetName) {
        sendJson(req, res, 400, { error: "empty_workbook" });
        return;
      }
      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];

      // Clean data: remove completely empty rows and trim strings
      const cleanData = rows
        .map(row => (Array.isArray(row) ? row : []).map(cell => cell == null ? "" : String(cell).trim()))
        .filter(row => row.some(cell => cell !== ""));

      if (cleanData.length === 0) {
        sendJson(req, res, 400, { error: "empty_table" });
        return;
      }

      const headers = cleanData[0];
      const allBody = cleanData.slice(1);
      
      sendJson(req, res, 200, {
        headers,
        data: allBody,
        rowCount: allBody.length,
        colCount: headers.length,
        sheetName
      });
    } catch (e: any) {
      sendJson(req, res, 500, { error: "parse_failed", message: e?.message });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/files/upload") {
    let body: any;
    try {
      body = await readJson(req);
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : String(e);
      sendJson(req, res, msg === "request_body_too_large" ? 413 : 400, { error: msg });
      return;
    }

    const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : "upload.png";
    const type =
      typeof body?.type === "string" && body.type.trim() ? body.type.trim() : "application/octet-stream";
    let data = typeof body?.data === "string" ? body.data.trim() : "";
    if (!data) {
      sendJson(req, res, 400, { error: "missing_data" });
      return;
    }
    const commaIdx = data.indexOf(",");
    if (commaIdx >= 0) data = data.slice(commaIdx + 1);

    let buf: Buffer;
    try {
      buf = Buffer.from(data, "base64");
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : String(e);
      sendJson(req, res, 400, { error: "invalid_base64", message: msg });
      return;
    }

    const rawKey = getEnv("LLM_API_KEY");
    if (!rawKey) {
      sendJson(req, res, 500, { error: "missing_llm_api_key" });
      return;
    }
    const apiKey = rawKey.trim();

    const base = getEnv("LLM_BASE_URL");
    let apiBase = "https://api.coze.cn";
    if (base) {
      try {
        const u = new URL(base);
        apiBase = u.origin;
      } catch {
      }
    }

    try {
      const uint8 = new Uint8Array(buf);
      const blob = new Blob([uint8], { type });
      const form = new FormData();
      form.append("file", blob, name);

      const uploadUrl = new URL("/v1/files/upload", apiBase);
      const upstream = await fetch(uploadUrl.toString(), {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey.replace(/^Bearer\s+/i, "")}`
        },
        body: form
      });
      const raw = await upstream.text();

      let json: any;
      try {
        json = JSON.parse(raw);
      } catch {
        sendJson(req, res, 502, { error: "coze_not_json", body: raw.slice(0, 800) });
        return;
      }

      if (!upstream.ok || (typeof json?.code === "number" && json.code !== 0)) {
        const msg = typeof json?.msg === "string" ? json.msg : upstream.statusText;
        sendJson(req, res, 502, { error: "coze_upload_failed", message: msg });
        return;
      }

      sendJson(req, res, 200, json);
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : String(e);
      sendJson(req, res, 500, { error: "upload_proxy_error", message: msg });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/components") {
    const all = Array.from(components.values());
    sendJson(req, res, 200, { items: all });
    return;
  }

  if (req.method === "POST" && url.pathname === "/components") {
    let body: any;
    try {
      body = await readJson(req);
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : String(e);
      sendJson(req, res, msg === "request_body_too_large" ? 413 : 400, { error: msg });
      return;
    }

    const key = typeof body?.key === "string" ? body.key.trim() : "";
    if (!key) {
      sendJson(req, res, 400, { error: "missing_key" });
      return;
    }

    const rawConfig = body?.config ?? body?.props ?? {};
    if (typeof rawConfig !== "object" || rawConfig === null || Array.isArray(rawConfig)) {
      sendJson(req, res, 400, { error: "invalid_config" });
      return;
    }

    const now = new Date().toISOString();
    const existing = components.get(key);
    const createdAt = existing?.createdAt ?? now;
    const def: ComponentDefinition = {
      key,
      config: rawConfig as Record<string, unknown>,
      createdAt,
      updatedAt: now
    };
    components.set(key, def);
    sendJson(req, res, existing ? 200 : 201, def);
    return;
  }

  const componentMatch = url.pathname.match(/^\/components\/([^/]+)$/);
  if (componentMatch) {
    const key = decodeURIComponent(componentMatch[1]);

    if (req.method === "GET") {
      const def = components.get(key);
      if (!def) {
        sendJson(req, res, 404, { error: "not_found" });
        return;
      }
      sendJson(req, res, 200, def);
      return;
    }

    if (req.method === "DELETE") {
      const existed = components.delete(key);
      if (!existed) {
        sendJson(req, res, 404, { error: "not_found" });
        return;
      }
      sendJson(req, res, 204, {});
      return;
    }
  }

  if (req.method === "GET" && url.pathname === "/tools") {
    const tools = await mcp.request({ method: "tools/list" }, ListToolsResultSchema);
    sendJson(req, res, 200, tools);
    return;
  }

  const toolMatch = url.pathname.match(/^\/tools\/([^/]+)$/);
  if (req.method === "POST" && toolMatch) {
    const toolName = decodeURIComponent(toolMatch[1]);
    let args: Record<string, unknown> = {};
    try {
      const body = (await readJson(req)) as {
        args?: Record<string, unknown>;
        arguments?: Record<string, unknown>;
      };
      args = body.args ?? body.arguments ?? {};
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : String(e);
      sendJson(req, res, msg === "request_body_too_large" ? 413 : 400, { error: msg });
      return;
    }

    try {
      const result = await mcp.request(
        {
          method: "tools/call",
          params: {
            name: toolName,
            arguments: args
          }
        },
        CallToolResultSchema,
        { timeout: 300000 }
      );

      const text = result.content
        .map((c: any) => (c.type === "text" ? c.text : ""))
        .filter(Boolean)
        .join("\n");

      sendJson(req, res, 200, { text, raw: result });
      return;
    } catch (e: any) {
      sendJson(req, res, 500, { error: e?.message ? String(e.message) : String(e) });
      return;
    }
  }

  sendJson(req, res, 404, { error: "not_found" });
});

server.listen(port);
