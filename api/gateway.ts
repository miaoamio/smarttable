import { handle } from "../packages/mcp-gateway/src/handler.js";
// Force bundling of SDK
import "@modelcontextprotocol/sdk";

export default async function handler(req: any, res: any) {
  // Simple CORS for preflight and errors
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("access-control-allow-origin", origin);
    res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS,DELETE");
    res.setHeader("access-control-allow-headers", "content-type, authorization");
    res.setHeader("vary", "origin");
  } else {
    res.setHeader("access-control-allow-origin", "*");
  }

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    return await handle(req, res);
  } catch (e: any) {
    console.error("Gateway Error:", e);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ 
      error: "gateway_error", 
      message: e.message,
      stack: e.stack,
      code: e.code,
      path: e.path,
      cwd: process.cwd()
    }, null, 2));
  }
}
