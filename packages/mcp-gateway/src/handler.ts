import http from "node:http";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import * as XLSX from "xlsx";
import jschardet from "jschardet";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolResultSchema, ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";

import { initialComponents } from "./component-config.js";
import prisma from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  let origin = req.headers.origin;
  if (origin === "null") origin = undefined;

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

async function initComponents() {
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
      const dbConfigs = await (prisma.componentConfig as any).findMany();
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

const adminPageHtml = fs.readFileSync(path.resolve(__dirname, "../../src/index.ts"), "utf8")
  .split("const adminPageHtml = `")[1]
  .split("`;")[0];

export async function handle(req: http.IncomingMessage, res: http.ServerResponse) {
  try {
    await initComponents();
    
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

    if ((req.method === "GET" || req.method === "HEAD") && (url.pathname === "/admin" || url.pathname === "/admin/components")) {
      if (req.method === "HEAD") {
        res.statusCode = 200;
        res.setHeader("content-type", "text/html; charset=utf-8");
        res.end();
        return;
      }
      // Note: In Vercel, reading from index.ts might fail if it's not bundled.
      // For now, we'll hardcode a simple loader or use the existing HTML from index.ts if bundled correctly.
      // But a better way is to move the HTML to a shared constant or file.
      sendHtml(req, res, 200, adminPageHtml);
      return;
    }

    const auth = authenticate(req);
    if (!auth.ok) {
      sendJson(req, res, auth.status, { error: auth.error });
      return;
    }

    if (req.method === "GET" && url.pathname === "/admin/stats") {
      if (!process.env.DATABASE_URL) {
        sendJson(req, res, 200, { totalCalls: 0, failCount: 0, avgLatency: 0, recentCalls: [], toolDistribution: {}, errorDistribution: [], message: "Database not configured" });
        return;
      }
      try {
        const totalCalls = await prisma.callLog.count();
        const failCount = await prisma.callLog.count({ where: { status: "FAIL" } });
        const avgLatencyResult = await prisma.callLog.aggregate({ _avg: { latency: true } });
        const recentCalls = await prisma.callLog.findMany({ take: 20, orderBy: { createdAt: "desc" } });
        const distribution = await prisma.callLog.groupBy({ by: ['action'], _count: { _all: true } });
        const toolDistribution = distribution.reduce((acc: any, curr) => { acc[curr.action] = curr._count._all; return acc; }, {});
        const errorAgg = await prisma.callLog.groupBy({ where: { status: "FAIL", errorMsg: { not: null } }, by: ['errorMsg'], _count: { _all: true }, _max: { createdAt: true } });
        const errorDistribution = errorAgg.map(curr => ({ message: curr.errorMsg, count: curr._count._all, lastSeen: curr._max.createdAt })).sort((a, b) => b.count - a.count);

        sendJson(req, res, 200, { totalCalls, failCount, avgLatency: Math.round(avgLatencyResult._avg.latency || 0), recentCalls, toolDistribution, errorDistribution });
      } catch (e: any) {
        sendJson(req, res, 500, { error: "Failed to fetch stats", message: e.message });
      }
      return;
    }

    const rateKey = getClientKey(req, auth.subject);
    if (!allowRequest(rateKey)) {
      sendJson(req, res, 429, { error: "rate_limited" });
      return;
    }

    if (req.method === "POST" && url.pathname === "/parse-excel") {
      let body: any;
      try { body = await readJson(req); } catch (e: any) {
        sendJson(req, res, e?.message === "request_body_too_large" ? 413 : 400, { error: e?.message });
        return;
      }
      const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : "upload.xlsx";
      let data = typeof body?.data === "string" ? body.data.trim() : "";
      if (!data) { sendJson(req, res, 400, { error: "missing_data" }); return; }
      const commaIdx = data.indexOf(",");
      if (commaIdx >= 0) data = data.slice(commaIdx + 1);

      const startTime = Date.now();
      try {
        const buf = Buffer.from(data, "base64");
        let wb: XLSX.WorkBook;
        if (name.toLowerCase().endsWith(".csv")) {
          const detected = jschardet.detect(buf);
          const encoding = detected.encoding === "GB2312" ? "GBK" : detected.encoding;
          wb = XLSX.read(buf, { type: "buffer", codepage: encoding === "GBK" ? 936 : 65001 });
        } else {
          wb = XLSX.read(buf, { type: "buffer" });
        }
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        await logCall({ action: "parse-excel", status: "OK", latency: Date.now() - startTime });
        sendJson(req, res, 200, { rows });
      } catch (e: any) {
        await logCall({ action: "parse-excel", status: "FAIL", latency: Date.now() - startTime, errorMsg: e.message });
        sendJson(req, res, 500, { error: "parse_failed", message: e.message });
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/components") {
      sendJson(req, res, 200, { items: Array.from(components.values()) });
      return;
    }

    if (req.method === "POST" && url.pathname === "/components") {
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

    if (req.method === "GET" && url.pathname === "/tools") {
      const client = await getMcp();
      const tools = await client.request({ method: "tools/list" }, ListToolsResultSchema);
      sendJson(req, res, 200, tools);
      return;
    }

    const toolMatch = url.pathname.match(/^\/tools\/([^/]+)$/);
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
    sendJson(req, res, 500, { error: "handler_crash", message: e.message });
  }
}
