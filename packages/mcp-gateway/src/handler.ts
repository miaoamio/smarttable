import * as http from "node:http";
import path from "node:path";
import crypto from "node:crypto";

import * as XLSX from "xlsx";
import jschardet from "jschardet";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolResultSchema, ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";

import { initialComponents } from "./component-config.js";
import prisma from "./db.js";

let mcpClient: Client | null = null;
let mcpConnecting: Promise<Client> | null = null;

async function getMcp(): Promise<Client> {
  if (mcpClient) return mcpClient;
  if (mcpConnecting) return mcpConnecting;
  
  const serverScript = path.resolve(process.cwd(), "packages/mcp-server/dist/index.js");
  
  const copiedEnv: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === "string") copiedEnv[k] = v;
  }
  
  const transport = new StdioClientTransport({ 
    command: process.execPath, 
    args: [serverScript], 
    env: copiedEnv 
  });

  mcpConnecting = (async () => {
    const client = new Client({ name: "mcp-figma-gateway", version: "0.1.0" }, { capabilities: {} });
    await client.connect(transport);
    mcpClient = client;
    return client;
  })();
  return mcpConnecting;
}

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
const maxBodyBytes = Number(getEnv("MAX_BODY_BYTES") ?? "104857600"); // 100MB default
const rateLimitPerMinute = Number(getEnv("RATE_LIMIT_PER_MIN") ?? "120");

function withCors(req: http.IncomingMessage, res: http.ServerResponse) {
  const origin = req.headers.origin;
  const allowAll = corsOrigins.includes("*");
  
  if (origin && origin !== "null") {
    if (allowAll || corsOrigins.includes(origin)) {
      res.setHeader("access-control-allow-origin", origin);
      res.setHeader("access-control-allow-credentials", "true");
      res.setHeader("vary", "Origin");
    } else {
      res.setHeader("access-control-allow-origin", "null");
    }
  } else {
    res.setHeader("access-control-allow-origin", "*");
  }

  res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS, DELETE");
  res.setHeader("access-control-allow-headers", "Content-Type, Authorization, X-Requested-With");
  res.setHeader("access-control-max-age", "86400");
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
  res.setHeader("cache-control", "no-store, no-cache, must-revalidate");
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
  // 1. Check for Basic Auth (Traditional browser popup login)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Basic ")) {
    try {
      const credentials = Buffer.from(authHeader.split(" ")[1], "base64").toString();
      const [user, pass] = credentials.split(":");
      // Use environment variables for admin credentials if available, fallback to defaults
      const adminUser = process.env.ADMIN_USER || "admin";
      const adminPass = process.env.ADMIN_PASSWORD || "ved@123";
      if (user === adminUser && pass === adminPass) {
        return { ok: true as const, subject: "admin" };
      }
    } catch (e) {
      // ignore decode errors
    }
  }

  // 2. Check for Token/JWT (Existing logic for plugin/API)
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
  const ip = (typeof fwd === "string" ? fwd.split(",")[0]?.trim() : undefined) ?? req.socket.remoteAddress ?? "unknown";
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
let componentsInitialized = false;
let initPromise: Promise<void> | null = null;

async function initComponents() {
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    if (componentsInitialized) return;
    
    // Fallback for initialComponents
    for (const entry of initialComponents) {
      const now = new Date().toISOString();
      if (!components.has(entry.key)) {
        components.set(entry.key, {
          key: entry.key,
          config: entry.config as Record<string, unknown>,
          createdAt: now,
          updatedAt: now
        });
      }
    }

    // Load from DB if available
    if (process.env.DATABASE_URL) {
      try {
        console.log("Loading component configs from database...");
        const dbConfigs = await (prisma.componentConfig as any).findMany();
        console.log(`Loaded ${dbConfigs.length} configs from database.`);
        for (const dbCfg of dbConfigs) {
          components.set(dbCfg.configKey, {
            key: dbCfg.configKey,
            config: {
              ...((dbCfg.props as any) || {}),
              figma: {
                ...((dbCfg.props as any)?.figma || {}),
                componentKey: dbCfg.figmaKey
              },
              variants: dbCfg.variants
            },
            createdAt: new Date().toISOString(),
            updatedAt: dbCfg.updatedAt.toISOString()
          });
        }
      } catch (e) {
        console.error("Failed to load configs from database:", e);
      }
    }
    componentsInitialized = true;
  })();

  return initPromise;
}

async function logCall(data: {
  userId?: string;
  action: string;
  status: string;
  latency: number;
  prompt?: string;
  llmResponse?: any;
  errorMsg?: string;
}) {
  try {
    if (!process.env.DATABASE_URL) return;
    await prisma.callLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        status: data.status,
        latency: data.latency,
        prompt: data.prompt,
        llmResponse: data.llmResponse,
        errorMsg: data.errorMsg
      }
    });
  } catch (e) {
    console.error("Failed to log call:", e);
  }
}

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

const adminPageHtml = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>VED UI Agent 管理中心</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
:root {
  --bg-color: #ffffff;
  --secondary-bg: #f7f7f8;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --border-color: #e5e7eb;
  --accent-color: #10a37f; /* OpenAI green */
  --accent-hover: #1a7f64;
  --danger-color: #ef4444;
}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;margin:0;padding:0;background:var(--secondary-bg);color:var(--text-primary);line-height:1.5}
.header{background:var(--bg-color);border-bottom:1px solid var(--border-color);padding:12px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10}
.header h1{font-size:16px;font-weight:600;margin:0;display:flex;align-items:center;gap:10px}
.header h1 svg{color:var(--accent-color)}
.container{max-width:1100px;margin:32px auto;padding:0 24px}
.tabs{display:flex;gap:24px;margin-bottom:32px;border-bottom:1px solid var(--border-color)}
.tab{padding:8px 4px 12px;cursor:pointer;font-size:14px;color:var(--text-secondary);font-weight:500;border-bottom:2px solid transparent;transition:all 0.2s}
.tab.active{color:var(--text-primary);border-bottom-color:var(--text-primary)}
.tab:hover:not(.active){color:var(--text-primary)}
.toolbar{display:flex;gap:12px;align-items:center}
input,textarea,button{font:inherit;outline:none}
input,textarea{background:var(--bg-color);border:1px solid var(--border-color);border-radius:8px;color:var(--text-primary);padding:8px 12px;font-size:14px;transition:border-color 0.2s}
input:focus,textarea:focus{border-color:var(--accent-color)}
textarea{width:100%;min-height:200px;resize:vertical;font-family:Menlo,monospace;font-size:13px}
button{border:1px solid transparent;border-radius:8px;padding:8px 16px;font-size:14px;font-weight:500;cursor:pointer;transition:all 0.2s;display:inline-flex;align-items:center;justify-content:center;gap:6px}
button.primary{background:var(--text-primary);color:white}
button.primary:hover{background:#374151}
button.secondary{background:var(--bg-color);border-color:var(--border-color);color:var(--text-primary)}
button.secondary:hover{background:var(--secondary-bg)}
button.danger{background:white;border-color:#fee2e2;color:var(--danger-color)}
button.danger:hover{background:#fef2f2}
button:disabled{opacity:.5;cursor:not-allowed}
.card{background:var(--bg-color);border:1px solid var(--border-color);border-radius:12px;padding:24px;margin-bottom:24px;box-shadow:0 1px 2px rgba(0,0,0,0.05)}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;margin-bottom:32px}
.stat-item{background:var(--bg-color);padding:20px;border-radius:12px;border:1px solid var(--border-color);box-shadow:0 1px 2px rgba(0,0,0,0.05)}
.stat-label{font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em}
.stat-value{font-size:28px;font-weight:700;color:var(--text-primary);margin-top:8px}
table{width:100%;border-collapse:separate;border-spacing:0;margin-top:8px}
th,td{padding:12px 16px;text-align:left;font-size:14px;border-bottom:1px solid var(--border-color)}
th{background:var(--secondary-bg);color:var(--text-secondary);font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.05em}
tr:last-child td{border-bottom:none}
.key-cell{font-family:Menlo,monospace;font-size:13px;font-weight:600;color:var(--accent-color)}
.config-snippet{max-width:300px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13px;color:var(--text-secondary);font-family:Menlo,monospace}
.tag{padding:2px 8px;border-radius:9999px;font-size:12px;font-weight:500}
.tag-success{background:#d1fae5;color:#065f46}
.tag-fail{background:#fee2e2;color:#991b1b}
.layout{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1.8fr);gap:24px}
@media (max-width:900px){.layout{grid-template-columns:1fr}}
.hidden{display:none}
.status-msg{margin-top:12px;font-size:13px;padding:8px 12px;border-radius:6px}
.status-success{background:#f0fdf4;color:#166534;border:1px solid #bbf7d0}
.status-error{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}
</style>
</head>
<body>
<header class="header">
  <h1>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM12 4C16.4183 4 20 7.58172 20 12C20 16.4183 16.4183 20 12 20C7.58172 20 4 16.4183 4 12C4 7.58172 7.58172 4 12 4ZM11 7V11H7V13H11V17H13V13H17V11H13V7H11Z" fill="currentColor"/></svg>
    VED UI Agent 管理中心
  </h1>
</header>

<div class="container">
  <div class="tabs">
    <div class="tab active" data-target="stats-section">运行统计</div>
    <div class="tab" data-target="configs-section">组件配置</div>
  </div>

  <div id="stats-section">
    <div class="stats-grid">
      <div class="stat-item">
        <div class="stat-label">Total Users</div>
        <div id="stat-users" class="stat-value">-</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Plugin Launches</div>
        <div id="stat-launches" class="stat-value">-</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Create Table</div>
        <div id="stat-create-count" class="stat-value">-</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Avg Create Time</div>
        <div id="stat-create-time" class="stat-value">-</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Modify Table</div>
        <div id="stat-modify-count" class="stat-value">-</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Avg Modify Time</div>
        <div id="stat-modify-time" class="stat-value">-</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Failures</div>
        <div id="stat-fails" class="stat-value" style="color:var(--danger-color)">-</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Success Rate</div>
        <div id="stat-rate" class="stat-value">-</div>
      </div>
    </div>

    <div class="layout">
      <div class="card">
        <div style="font-weight:600;margin-bottom:20px;font-size:15px">Feature Distribution</div>
        <div id="distribution-container"></div>
      </div>
      <div class="card">
        <div style="font-weight:600;margin-bottom:20px;font-size:15px">Recent Activity</div>
        <div style="overflow-x:auto">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Status</th>
                <th>Latency</th>
              </tr>
            </thead>
            <tbody id="logs-body"></tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="card" id="error-agg-card" style="margin-top:24px">
      <div style="font-weight:600;margin-bottom:20px;font-size:15px">Aggregated Errors</div>
      <div style="overflow-x:auto">
        <table>
          <thead>
            <tr>
              <th>Error Message</th>
              <th style="width:80px">Count</th>
              <th style="width:150px">Last Seen</th>
            </tr>
          </thead>
          <tbody id="errors-body"></tbody>
        </table>
      </div>
    </div>
  </div>

  <div id="configs-section" class="hidden">
    <div class="layout">
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <div style="font-weight:600;font-size:15px">Registered Components</div>
          <button id="reload-btn" class="secondary" style="padding:4px 10px;font-size:12px">Refresh</button>
        </div>
        <div style="overflow-x:auto">
          <table>
            <thead>
              <tr>
                <th>Key</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="components-body"></tbody>
          </table>
        </div>
      </div>
      <div class="card">
        <div style="font-weight:600;margin-bottom:20px;font-size:15px">Edit Configuration</div>
        <div style="display:flex;flex-direction:column;gap:16px">
          <div>
            <label style="display:block;font-size:13px;font-weight:500;margin-bottom:6px">Component Key</label>
            <input id="edit-key" style="width:100%;box-sizing:border-box" placeholder="e.g. Cell/Tag">
          </div>
          <div>
            <label style="display:block;font-size:13px;font-weight:500;margin-bottom:6px">Figma Component Key</label>
            <input id="edit-figma-key" style="width:100%;box-sizing:border-box" placeholder="Unique Figma Key">
          </div>
          <div>
            <label style="display:block;font-size:13px;font-weight:500;margin-bottom:6px">Display States (Variants - JSON)</label>
            <textarea id="edit-variants" spellcheck="false" style="min-height:100px" placeholder='[ { "property": "value" }, ... ]'></textarea>
          </div>
          <div>
            <label style="display:block;font-size:13px;font-weight:500;margin-bottom:6px">Configuration (Props - JSON)</label>
            <textarea id="edit-config" spellcheck="false" style="min-height:150px" placeholder='{ "displayName": "...", "props": { ... } }'></textarea>
          </div>
          <div style="display:flex;gap:12px;justify-content:flex-end">
            <button id="delete-btn" class="danger">Delete</button>
            <button id="create-update-btn" class="primary">Save Changes</button>
          </div>
          <div id="status" class="status-msg hidden"></div>
        </div>
      </div>
    </div>
  </div>
</div>

<script>
var reloadBtn=document.getElementById("reload-btn");
var bodyEl=document.getElementById("components-body");
var logsBody=document.getElementById("logs-body");
var errorsBody=document.getElementById("errors-body");
var editKey=document.getElementById("edit-key");
var editFigmaKey=document.getElementById("edit-figma-key");
var editVariants=document.getElementById("edit-variants");
var editConfig=document.getElementById("edit-config");
var createUpdateBtn=document.getElementById("create-update-btn");
var deleteBtn=document.getElementById("delete-btn");
var statusEl=document.getElementById("status");

// Tabs logic
document.querySelectorAll(".tab").forEach(tab => {
  tab.onclick = function() {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    this.classList.add("active");
    const target = this.getAttribute("data-target");
    document.getElementById("stats-section").classList.add("hidden");
    document.getElementById("configs-section").classList.add("hidden");
    document.getElementById(target).classList.remove("hidden");
    if(target === "stats-section") loadStats();
    if(target === "configs-section") loadComponents();
  };
});

function setStatus(msg, type){
  if(!statusEl) return;
  statusEl.textContent=msg||"";
  statusEl.className = "status-msg " + (type === "error" ? "status-error" : "status-success");
  statusEl.classList.toggle("hidden", !msg);
}

function loadStats() {
  fetch("/admin/stats")
    .then(res => {
      if(res.status === 401) {
        window.location.reload();
        return;
      }
      return res.json().catch(err => {
        console.error("Failed to parse JSON:", err);
        throw new Error("Invalid JSON response from server");
      });
    })
    .then(data => {
      if(!data) return;
      if(data.error) { setStatus(data.error, "error"); return; }
      
      renderLogs(data.recentCalls || []);
      renderDistribution(data.toolDistribution || {});
      renderErrors(data.errorDistribution || []);
      
      // Update summary counters
      document.getElementById("stat-users").textContent = data.userCount || 0;
      document.getElementById("stat-launches").textContent = data.launchCount || 0;
      document.getElementById("stat-create-count").textContent = data.createCount || 0;
      document.getElementById("stat-create-time").textContent = (data.avgCreateTime || 0) + "ms";
      document.getElementById("stat-modify-count").textContent = data.modifyCount || 0;
      document.getElementById("stat-modify-time").textContent = (data.avgModifyTime || 0) + "ms";
      document.getElementById("stat-fails").textContent = data.failCount || 0;
      
      const total = data.totalCalls || 0;
      const rate = total > 0 ? (((total - data.failCount) / total) * 100).toFixed(1) : "100";
      document.getElementById("stat-rate").textContent = rate + "%";
    })
    .catch(err => {
      console.error("Fetch stats failed:", err);
      setStatus("Failed to load stats: " + err.message, "error");
    });
}

function renderErrors(errors) {
  if(!errorsBody) return;
  errorsBody.innerHTML = "";
  if(errors.length === 0) {
    errorsBody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-secondary);padding:20px">No errors recorded</td></tr>';
    return;
  }
  errors.forEach(err => {
      var tr = document.createElement("tr");
      tr.innerHTML = " \
        <td style='font-family:Menlo,monospace;font-size:12px;color:var(--danger-color);word-break:break-all'>" + err.message + "</td> \
        <td style='font-weight:600;text-align:center'>" + err.count + "</td> \
        <td style='color:var(--text-secondary);font-size:12px'>" + new Date(err.lastSeen).toLocaleString() + "</td> \
      ";
      errorsBody.appendChild(tr);
    });
}

function renderLogs(logs) {
  if(!logsBody) return;
  logsBody.innerHTML = "";
  logs.forEach(log => {
    var tr = document.createElement("tr");
    tr.innerHTML = \`
      <td style="color:var(--text-secondary);font-size:12px">\${new Date(log.createdAt).toLocaleTimeString()}</td>
      <td style="font-weight:500;font-size:13px">\${log.action.replace('TOOL_CALL:', '')}</td>
      <td><span class="tag \${log.status==='SUCCESS' || log.status==='OK' ?'tag-success':'tag-fail'}">\${log.status}</span></td>
      <td style="font-size:13px">\${log.latency}ms</td>
    \`;
    logsBody.appendChild(tr);
  });
}

function renderDistribution(dist) {
  const container = document.getElementById("distribution-container");
  if(!container) return;
  container.innerHTML = "";
  const entries = Object.entries(dist).sort((a,b) => (b[1]) - (a[1]));
  const max = entries.length > 0 ? entries[0][1] : 1;
  
  entries.forEach(([action, count]) => {
    const barWidth = Math.max(5, (count / max) * 100);
    const div = document.createElement("div");
    div.style.marginBottom = "16px";
    div.innerHTML = \`
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
        <span style="font-weight:500">\${action.replace('TOOL_CALL:', '')}</span>
        <span style="color:var(--text-secondary)">\${count}</span>
      </div>
      <div style="height:6px;background:var(--secondary-bg);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:\${barWidth}%;background:var(--accent-color);border-radius:3px"></div>
      </div>
    \`;
    container.appendChild(div);
  });
}

function renderList(items){
  if(!bodyEl)return;
  bodyEl.innerHTML="";
  items.forEach(function(item){
    var tr=document.createElement("tr");
    tr.innerHTML = \`
      <td class="key-cell">\${item.key}</td>
      <td style="text-align:right">
        <button class="secondary" style="padding:4px 10px;font-size:12px" onclick="editItem('\${item.key}', \${JSON.stringify(item.config).replace(/"/g, '&quot;')})">Edit</button>
      </td>
    \`;
    bodyEl.appendChild(tr);
  });
}

window.editItem = function(key, config) {
  editKey.value = key;
  editFigmaKey.value = config.figma?.componentKey || "";
  editVariants.value = JSON.stringify(config.variants || [], null, 2);
  // Clean up config for general props display
  const displayConfig = {...config};
  delete displayConfig.variants;
  editConfig.value = JSON.stringify(displayConfig, null, 2);
  document.getElementById("configs-section").scrollIntoView({behavior: "smooth"});
};

function loadComponents(){
  fetch("/components").then(res => {
    if(res.status === 401) {
      window.location.reload();
      return;
    }
    return res.json();
  }).then(json => {
    if(!json) return;
    renderList(json.items||[]);
  });
}

function createOrUpdateComponent(){
  var key=editKey.value.trim();
  var figmaKey=editFigmaKey.value.trim();
  var variantsRaw=editVariants.value.trim();
  var configRaw=editConfig.value.trim();
  if(!key || !configRaw) return;
  try{
    var cfg=JSON.parse(configRaw);
    cfg.variants = variantsRaw ? JSON.parse(variantsRaw) : [];
    if (figmaKey) {
      cfg.figma = cfg.figma || {};
      cfg.figma.componentKey = figmaKey;
    }
    setStatus("Saving...");
    fetch("/components",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({key:key,config:cfg})})
      .then(res => res.json())
      .then(() => { setStatus("Saved successfully"); loadComponents(); });
  }catch(e){ setStatus("Invalid JSON: "+e.message, "error"); }
}

function deleteComponent(){
  var key=editKey.value.trim();
  if(!key || !confirm("Delete this component?")) return;
  fetch("/components/"+encodeURIComponent(key),{method:"DELETE"}).then(() => {
    setStatus("Deleted successfully");
    loadComponents();
    editKey.value = "";
    editConfig.value = "";
  });
}

reloadBtn.onclick=loadComponents;
createUpdateBtn.onclick=createOrUpdateComponent;
deleteBtn.onclick=deleteComponent;
loadStats();
</script>
</body>
</html>`;

export async function handle(req: http.IncomingMessage, res: http.ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost");
    const pathName = url.pathname.replace(/\/$/, "") || "/";

    if (req.method === "OPTIONS") {
      withCors(req, res);
      res.statusCode = 200;
      res.setHeader("content-length", "0");
      res.end();
      return;
    }

    if (req.method === "GET" && pathName === "/health") {
      sendJson(req, res, 200, { ok: true });
      return;
    }

    if (pathName === "/log" && req.method === "POST") {
      withCors(req, res);
      let body: any;
      try { body = await readJson(req); } catch (e: any) {
        sendJson(req, res, 400, { error: "invalid_body" });
        return;
      }
      const { userId, action, status, latency, errorMsg, prompt, llmResponse } = body;
      if (!action) { sendJson(req, res, 400, { error: "missing_action" }); return; }
      
      console.log(`Received log: action=${action}, status=${status}, latency=${latency}, userId=${userId}`);
      
      try {
        await logCall({
          userId: userId || "anonymous",
          action,
          status: status || "OK",
          latency: Number(latency) || 0,
          errorMsg,
          prompt: typeof prompt === 'string' ? prompt : (prompt ? JSON.stringify(prompt) : undefined),
          llmResponse: llmResponse ? (typeof llmResponse === 'string' ? llmResponse : JSON.stringify(llmResponse)) : undefined
        });
      } catch (err) {
        console.error("logCall failed:", err);
      }

      sendJson(req, res, 200, { ok: true });
      return;
    }

    if ((req.method === "GET" || req.method === "HEAD") && (pathName === "/admin" || pathName === "/admin/components")) {
      const auth = authenticate(req);
      if (!auth.ok) {
        withCors(req, res);
        res.statusCode = 401;
        res.setHeader("WWW-Authenticate", 'Basic realm="VED UI Agent Admin"');
        res.setHeader("content-type", "text/plain; charset=utf-8");
        res.end("Unauthorized");
        return;
      }

      if (req.method === "HEAD") {
        res.statusCode = 200;
        res.setHeader("content-type", "text/html; charset=utf-8");
        res.end();
        return;
      }

      if (pathName === "/admin/components") {
        sendHtml(req, res, 200, adminPageHtml.replace('data-target="stats-section">', 'data-target="stats-section" class="tab">').replace('data-target="configs-section">', 'data-target="configs-section" class="tab active">').replace('id="stats-section">', 'id="stats-section" class="hidden">').replace('id="configs-section" class="hidden">', 'id="configs-section">'));
        return;
      }

      sendHtml(req, res, 200, adminPageHtml);
      return;
    }

    const auth = authenticate(req);
    if (!auth.ok) {
      sendJson(req, res, auth.status, { error: auth.error });
      return;
    }

    if (req.method === "GET" && pathName === "/admin/stats") {
      if (!process.env.DATABASE_URL) {
        console.warn("DATABASE_URL not set, returning empty stats");
        sendJson(req, res, 200, { 
          totalCalls: 0, 
          failCount: 0, 
          avgLatency: 0, 
          recentCalls: [], 
          toolDistribution: {}, 
          errorDistribution: [], 
          userCount: 0,
          launchCount: 0,
          createCount: 0,
          avgCreateTime: 0,
          modifyCount: 0,
          avgModifyTime: 0,
          message: "Database not configured" 
        });
        return;
      }
      try {
        console.log("Fetching stats from database...");
        
        // Use a more robust way to fetch stats, catching individual failures if needed
        const statsPromises = [
          prisma.callLog.count().catch((err: any) => { console.error("Error counting totalCalls:", err); return 0; }),
          prisma.callLog.count({ where: { status: "FAIL" } }).catch((err: any) => { console.error("Error counting failCount:", err); return 0; }),
          prisma.callLog.aggregate({ _avg: { latency: true } }).catch((err: any) => { console.error("Error aggregating latency:", err); return { _avg: { latency: 0 } }; }),
          prisma.callLog.findMany({ take: 20, orderBy: { createdAt: "desc" } }).catch((err: any) => { console.error("Error fetching recentCalls:", err); return []; }),
          prisma.callLog.groupBy({ by: ["action"], _count: { _all: true } }).catch((err: any) => { console.error("Error grouping by action:", err); return []; }),
          prisma.callLog.groupBy({ 
            where: { status: "FAIL", errorMsg: { not: null } }, 
            by: ["errorMsg"], 
            _count: { _all: true }, 
            _max: { createdAt: true } 
          }).catch((err: any) => { console.error("Error grouping errors:", err); return []; }),
          prisma.callLog.groupBy({ by: ["userId"] }).then((r: any[]) => r.length).catch((err: any) => { console.error("Error counting users:", err); return 0; }),
          prisma.callLog.count({ where: { action: "PLUGIN_LAUNCH" } }).catch((err: any) => { console.error("Error counting launches:", err); return 0; }),
          prisma.callLog.aggregate({ where: { action: "CREATE_TABLE", status: "OK" }, _avg: { latency: true }, _count: { _all: true } }).catch((err: any) => { console.error("Error aggregating createStats:", err); return { _avg: { latency: 0 }, _count: { _all: 0 } }; }),
          prisma.callLog.aggregate({ where: { action: "MODIFY_TABLE", status: "OK" }, _avg: { latency: true }, _count: { _all: true } }).catch((err: any) => { console.error("Error aggregating modifyStats:", err); return { _avg: { latency: 0 }, _count: { _all: 0 } }; })
        ];

        const [
          totalCalls,
          failCount,
          avgLatencyResult,
          recentCalls,
          distribution,
          errorList,
          userCount,
          launchCount,
          createStats,
          modifyStats
        ] = await Promise.all(statsPromises);

        console.log("Stats fetched successfully.");
        const errorDistribution = (errorList as any[]).map((curr: any) => ({ 
          message: curr.errorMsg, 
          count: curr._count._all, 
          lastSeen: curr._max.createdAt 
        })).sort((a: any, b: any) => b.count - a.count);

        sendJson(req, res, 200, {
          totalCalls,
          failCount,
          avgLatency: Math.round((avgLatencyResult as any)._avg?.latency || 0),
          recentCalls,
          toolDistribution: Object.fromEntries((distribution as any[]).map((d: any) => [d.action, d._count._all])),
          errorDistribution,
          userCount,
          launchCount,
          createCount: (createStats as any)._count?._all || 0,
          avgCreateTime: Math.round((createStats as any)._avg?.latency || 0),
          modifyCount: (modifyStats as any)._count?._all || 0,
          avgModifyTime: Math.round((modifyStats as any)._avg?.latency || 0)
        });
      } catch (e: any) {
        console.error("Failed to fetch stats:", e);
        sendJson(req, res, 500, { error: "db_error", message: e.message });
      }
      return;
    }

    const rateKey = getClientKey(req, auth.subject);
    if (!allowRequest(rateKey)) {
      sendJson(req, res, 429, { error: "rate_limited" });
      return;
    }

    if (req.method === "POST" && pathName === "/parse-excel") {
      let body: any;
      try { body = await readJson(req); } catch (e: any) {
        sendJson(req, res, e?.message === "request_body_too_large" ? 413 : 400, { error: e?.message });
        return;
      }
      const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : "upload.xlsx";
      let base64Data = typeof body?.data === "string" ? body.data.trim() : "";
      if (!base64Data) { sendJson(req, res, 400, { error: "missing_data" }); return; }
      const commaIdx = base64Data.indexOf(",");
      if (commaIdx >= 0) base64Data = base64Data.slice(commaIdx + 1);

      const startTime = Date.now();
      try {
        const buf = Buffer.from(base64Data, "base64");
        let wb: XLSX.WorkBook;
        if (name.toLowerCase().endsWith(".csv")) {
          const detected = jschardet.detect(buf);
          const encoding = detected.encoding === "GB2312" ? "GBK" : detected.encoding;
          wb = XLSX.read(buf, { type: "buffer", codepage: encoding === "GBK" ? 936 : 65001 });
        } else {
          wb = XLSX.read(buf, { type: "buffer" });
        }
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const allData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        let headers: string[] = [];
        let data: any[][] = [];
        
        if (allData.length > 0) {
          headers = allData[0].map(h => String(h || ""));
          data = allData.slice(1);
        }

        await logCall({ action: "parse-excel", status: "OK", latency: Date.now() - startTime });
        sendJson(req, res, 200, { 
          headers, 
          data, 
          rowCount: data.length, 
          colCount: headers.length,
          sheetName: wb.SheetNames[0]
        });
      } catch (e: any) {
        await logCall({ action: "parse-excel", status: "FAIL", latency: Date.now() - startTime, errorMsg: e.message });
        sendJson(req, res, 500, { error: "parse_failed", message: e.message });
      }
      return;
    }

    if (req.method === "POST" && pathName === "/files/upload") {
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

      const startTime = Date.now();
      let buf: Buffer;
      try {
        buf = Buffer.from(data, "base64");
      } catch (e: any) {
        const msg = e?.message ? String(e.message) : String(e);
        await logCall({
          action: "FILE_UPLOAD",
          status: "FAIL",
          latency: Date.now() - startTime,
          errorMsg: `Invalid Base64: ${msg}`
        });
        sendJson(req, res, 400, { error: "invalid_base64", message: msg });
        return;
      }

      const rawKey = getEnv("LLM_API_KEY");
      if (!rawKey) {
        await logCall({
          action: "FILE_UPLOAD",
          status: "FAIL",
          latency: Date.now() - startTime,
          errorMsg: "Missing LLM_API_KEY"
        });
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
          throw new Error(`Upstream returned non-JSON: ${raw.slice(0, 100)}`);
        }

        if (!upstream.ok || (typeof json?.code === "number" && json.code !== 0)) {
          const msg = typeof json?.msg === "string" ? json.msg : upstream.statusText;
          throw new Error(msg);
        }

        await logCall({
          action: "FILE_UPLOAD",
          status: "SUCCESS",
          latency: Date.now() - startTime,
          prompt: `File: ${name}, Type: ${type}, Size: ${buf.length}`
        });

        sendJson(req, res, 200, json);
      } catch (e: any) {
        const msg = e?.message ? String(e.message) : String(e);
        await logCall({
          action: "FILE_UPLOAD",
          status: "FAIL",
          latency: Date.now() - startTime,
          errorMsg: msg
        });
        sendJson(req, res, 500, { error: "upload_proxy_error", message: msg });
      }
      return;
    }

    if (req.method === "GET" && pathName === "/components") {
      await initComponents();
      sendJson(req, res, 200, { items: Array.from(components.values()) });
      return;
    }

    if (req.method === "POST" && pathName === "/components") {
      await initComponents();
      let body: any = await readJson(req);
      const key = body?.key?.trim();
      if (!key) { sendJson(req, res, 400, { error: "missing_key" }); return; }
      const figmaKey = body?.figmaKey?.trim() || "";
      const variants = body?.variants || [];
      const props = body?.props || {};
      const displayName = body?.displayName || key;

      if (process.env.DATABASE_URL) {
        await (prisma.componentConfig as any).upsert({
          where: { configKey: key },
          update: { displayName, figmaKey, variants, props, updatedAt: new Date() },
          create: { configKey: key, displayName, figmaKey, variants, props }
        });
      }
      const def = { key, config: { ...props, figma: { componentKey: figmaKey }, variants }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      components.set(key, def);
      sendJson(req, res, 200, def);
      return;
    }

    const componentMatch = pathName.match(/^\/components\/([^/]+)$/);
    if (componentMatch) {
      await initComponents();
      const key = decodeURIComponent(componentMatch[1]);
      if (req.method === "GET") {
        const def = components.get(key);
        if (!def) { sendJson(req, res, 404, { error: "not_found" }); return; }
        sendJson(req, res, 200, def);
        return;
      }
      if (req.method === "DELETE") {
        const existed = components.delete(key);
        if (!existed) { sendJson(req, res, 404, { error: "not_found" }); return; }
        if (process.env.DATABASE_URL) {
          try { await (prisma.componentConfig as any).delete({ where: { configKey: key } }); } catch (e) {}
        }
        sendJson(req, res, 204, {});
        return;
      }
    }

    if (req.method === "GET" && pathName === "/tools") {
      const client = await getMcp();
      const tools = await client.request({ method: "tools/list" }, ListToolsResultSchema);
      sendJson(req, res, 200, tools);
      return;
    }

    const toolMatch = pathName.match(/^\/tools\/([^/]+)$/);
    if (req.method === "POST" && toolMatch) {
      const toolName = decodeURIComponent(toolMatch[1]);
      const body = (await readJson(req)) as any;
      const args = body.args ?? body.arguments ?? {};
      const startTime = Date.now();
      try {
        const client = await getMcp();
        const result = await client.request({ method: "tools/call", params: { name: toolName, arguments: args } }, CallToolResultSchema, { timeout: 300000 });
        const text = result.content.map((c: any) => c.text || "").join("\n");
        await logCall({ action: toolName, status: "OK", latency: Date.now() - startTime, prompt: JSON.stringify(args), llmResponse: result });
        sendJson(req, res, 200, { text, raw: result });
      } catch (e: any) {
        await logCall({ action: toolName, status: "FAIL", latency: Date.now() - startTime, prompt: JSON.stringify(args), errorMsg: e.message });
        sendJson(req, res, 500, { error: e.message });
      }
      return;
    }

    sendJson(req, res, 404, { error: "not_found" });
  } catch (e: any) {
    console.error("[Gateway Error]", e);
    sendJson(req, res, 500, { error: "handler_crash", message: e.message });
  }
}
