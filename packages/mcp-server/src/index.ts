import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnvFromFiles } from "./env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
loadEnvFromFiles({ rootDir: path.resolve(__dirname, "../../..") });

const server = new Server(
  { name: "mcp-figma-server", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

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

function resolveLlmConfig(overrides?: { baseUrl?: string; apiKey?: string; model?: string }) {
  const baseUrl = overrides?.baseUrl ?? getEnv("LLM_BASE_URL") ?? "https://api.openai.com/v1";
  const apiKey =
    overrides?.apiKey ?? getEnv("LLM_API_KEY") ?? getEnv("OPENAI_API_KEY") ?? getEnv("OPENAI_API_TOKEN");
  const model = overrides?.model ?? getEnv("LLM_MODEL") ?? "gpt-4o-mini";

  if (!apiKey) {
    throw new Error("缺少大模型 API Key：请设置环境变量 LLM_API_KEY（或 OPENAI_API_KEY）。");
  }

  return { baseUrl, apiKey, model };
}

async function openAiCompatibleChat(input: {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  system?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}) {
  if (typeof fetch !== "function") {
    throw new Error("当前 Node 环境不支持 fetch，请使用 Node 18+。");
  }

  const { baseUrl, apiKey: rawKey, model } = resolveLlmConfig({
    baseUrl: input.baseUrl,
    apiKey: input.apiKey,
    model: input.model
  });
  const apiKey = rawKey.trim();

  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const url = new URL("chat/completions", normalizedBaseUrl);
  const messages: Array<{ role: "system" | "user"; content: string }> = [];
  if (input.system) messages.push({ role: "system", content: input.system });
  messages.push({ role: "user", content: input.prompt });

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: /^Bearer /i.test(apiKey) ? apiKey : `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: input.temperature,
      max_tokens: input.maxTokens
    })
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`大模型请求失败(${res.status}): ${raw.slice(0, 800)}`);
  }

  let json: any;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(`大模型响应不是 JSON: ${raw.slice(0, 800)}`);
  }

  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error(`大模型响应缺少 message.content: ${raw.slice(0, 800)}`);
  }
  return content;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function toCozeApiBase(baseUrl?: string) {
  if (!baseUrl) return "https://api.coze.cn";
  try {
    const u = new URL(baseUrl);
    return u.origin;
  } catch {
    return "https://api.coze.cn";
  }
}

async function cozeWorkflowChat(input: {
  baseUrl?: string;
  apiKey?: string;
  workflowId?: string;
  userId?: string;
  system?: string;
  prompt: string;
  images?: { fileId: string; fileName?: string; url?: string }[];
}) {
  if (typeof fetch !== "function") {
    throw new Error("当前 Node 环境不支持 fetch，请使用 Node 18+。");
  }

  const rawKey = input.apiKey ?? getEnv("LLM_API_KEY") ?? getEnv("OPENAI_API_KEY") ?? getEnv("OPENAI_API_TOKEN");
  if (!rawKey) {
    throw new Error("缺少大模型 API Key：请设置环境变量 LLM_API_KEY（或 OPENAI_API_KEY）。");
  }
  const apiKey = rawKey.trim();

  const workflowId = input.workflowId ?? getEnv("COZE_WORKFLOW_ID") ?? "7595980726576152630"; // Default to the workflow ID provided by user
  if (!workflowId) {
    throw new Error("缺少 Coze Workflow ID：请设置环境变量 COZE_WORKFLOW_ID。");
  }

  const userId = input.userId ?? getEnv("COZE_USER_ID") ?? "mcp-user";
  const apiBase = toCozeApiBase(input.baseUrl ?? getEnv("LLM_BASE_URL"));

  const additional_messages: any[] = [];
  if (input.system) additional_messages.push({ role: "system", content: input.system, content_type: "text" });
  
  if (input.images && input.images.length > 0) {
    // Check if any image has a valid URL
    const hasUrl = input.images.some((img) => img && typeof img.url === "string" && img.url.trim());

    if (hasUrl) {
      // New URL-based logic for Coze
      const contentList: any[] = [{ type: "text", text: input.prompt }];
      for (const img of input.images) {
        if (!img || typeof img.url !== "string" || !img.url.trim()) continue;
        contentList.push({
          type: "image",
          image_url: { url: img.url }
        });
      }
      additional_messages.push({
        role: "user",
        content_type: "object_string",
        content: JSON.stringify(contentList),
        type: "question"
      });

    } else {
      // Fallback to file_id logic if no URLs (though user seems to use URLs now)
      const contentList: any[] = [{ type: "text", text: input.prompt }];
      for (const img of input.images) {
        if (!img || typeof img.fileId !== "string" || !img.fileId.trim()) continue;
        contentList.push({
          type: "image",
          file_id: img.fileId
        });
      }
      additional_messages.push({
        role: "user",
        content_type: "object_string",
        content: JSON.stringify(contentList),
        type: "question"
      });
    }
  } else {
    additional_messages.push({ role: "user", content: input.prompt, content_type: "text", type: "question" });
  }

  const workflowUrl = new URL("/v1/workflows/chat", apiBase);
  const response = await fetch(workflowUrl.toString(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: /^Bearer /i.test(apiKey) ? apiKey : `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      workflow_id: workflowId,
      additional_messages,
      parameters: {},
      ext: {
        bot_id: (input as any).botId ?? getEnv("LLM_MODEL") // Pass bot_id in ext for context
      }
    })
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`Workflow request failed (${response.status}): ${raw.slice(0, 800)}`);
  }

  // Handle SSE response
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Failed to get response reader for SSE stream");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let finalContent = "";
  let isCompleted = false;
  const debugEvents: string[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim() === "") continue;
        if (line.startsWith("event:")) {
             const eventName = line.slice(6).trim();
             if (debugEvents.length < 20) debugEvents.push(`Event: ${eventName}`);
             continue;
        }
        if (line.startsWith("data:")) {
            const dataStr = line.slice(5).trim();
            if (!dataStr) continue;
            
            try {
                const data = JSON.parse(dataStr);
                
                // Debug log
                if (debugEvents.length < 20) {
                    debugEvents.push(`Data type=${data.type}, role=${data.role}, content=${(data.content || "").slice(0, 20)}...`);
                }

                // Capture content from conversation.message.completed or answer
                if (data.type === "answer" || (data.role === "assistant" && data.type === "answer")) {
                    if (data.content && typeof data.content === "string") {
                         finalContent = data.content;
                    }
                }
                // Fallback for conversation.message.completed
                else if (data.type === "function_call" || data.type === "tool_response") {
                     // Ignore tool calls
                }
                else if (data.role === "assistant" && data.content && typeof data.content === "string" && data.type !== "verbose") {
                     // Potential fallback
                     if (!finalContent) finalContent = data.content;
                }
                
                if (data.status === "completed") {
                    isCompleted = true;
                }
            } catch (e) {
                // Ignore parse errors
            }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!finalContent) {
     throw new Error(`Workflow finished but no content was extracted. Debug trace: ${debugEvents.join("; ")}`);
  }

  return finalContent;
}

async function cozeBotChat(input: {
  baseUrl?: string;
  apiKey?: string;
  botId?: string;
  userId?: string;
  system?: string;
  prompt: string;
  images?: { fileId: string; fileName?: string; url?: string }[];
}) {
    // Redirect to workflow chat logic
    return cozeWorkflowChat({
        baseUrl: input.baseUrl,
        apiKey: input.apiKey,
        userId: input.userId,
        system: input.system,
        prompt: input.prompt,
        images: input.images,
        // We don't pass botId to workflow function as strictly required param, but it uses env or input
        // Reuse botId as it might be passed in request
    });
}


function shouldFallbackToCoze(err: unknown, baseUrl?: string) {
  const s = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
  if (!/大模型请求失败\(404\)/.test(s)) return false;
  if (typeof baseUrl !== "string") return false;
  return /coze\./i.test(baseUrl);
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "echo",
        description: "Echo input text",
        inputSchema: {
          type: "object",
          properties: {
            message: { type: "string" }
          },
          required: ["message"]
        }
      },
      {
        name: "llm_chat",
        description: "Call a chat completion and return text",
        inputSchema: {
          type: "object",
          properties: {
            prompt: { type: "string" },
            system: { type: "string" },
            model: { type: "string" },
            baseUrl: { type: "string" },
            apiKey: { type: "string" },
            temperature: { type: "number" },
            maxTokens: { type: "number" }
          },
          required: ["prompt"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  const toolName = request.params.name;
  const args = (request.params.arguments ?? {}) as Record<string, unknown>;

  if (toolName === "echo") {
    const message = typeof args.message === "string" ? args.message : "";
    return { content: [{ type: "text", text: message }] };
  }

  if (toolName === "llm_chat") {
    const schema = z.object({
      prompt: z.string().min(1),
      system: z.string().optional(),
      model: z.string().optional(),
      baseUrl: z.string().optional(),
      apiKey: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().int().positive().optional()
    });
    const parsed = schema.parse(args);

    const rawImages = Array.isArray((args as any).images) ? (args as any).images : undefined;
    const images = rawImages
      ? (rawImages as any[])
          .map((it) => {
            if (!it) return null;
            if (typeof it === "string") return { fileId: it };
            if (typeof it.fileId === "string") {
              return {
                fileId: it.fileId,
                fileName: typeof it.fileName === "string" ? it.fileName : undefined,
                url: typeof it.url === "string" ? it.url : undefined
              };
            }
            if (typeof it.file_id === "string") {
              return {
                fileId: it.file_id,
                fileName: typeof it.name === "string" ? it.name : undefined,
                url: typeof it.url === "string" ? it.url : undefined
              };
            }
            return null;
          })
          .filter((x): x is { fileId: string; fileName?: string; url?: string } => !!x)
      : undefined;

    let text: string;
    try {
      text = await openAiCompatibleChat({
        prompt: parsed.prompt,
        system: parsed.system,
        model: parsed.model,
        baseUrl: parsed.baseUrl,
        apiKey: parsed.apiKey,
        temperature: parsed.temperature,
        maxTokens: parsed.maxTokens
      });
    } catch (e) {
      const baseUrl = parsed.baseUrl ?? getEnv("LLM_BASE_URL");
      if (!shouldFallbackToCoze(e, baseUrl)) throw e;
      text = await cozeBotChat({
        prompt: parsed.prompt,
        system: parsed.system,
        botId: parsed.model ?? getEnv("LLM_MODEL"),
        baseUrl,
        apiKey: parsed.apiKey ?? getEnv("LLM_API_KEY") ?? getEnv("OPENAI_API_KEY") ?? getEnv("OPENAI_API_TOKEN"),
        images
      });
    }

    return { content: [{ type: "text", text }] };
  }

  return { content: [{ type: "text", text: `Unknown tool: ${toolName}` }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
