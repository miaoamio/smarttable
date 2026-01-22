export class Agent {
    config;
    conversationId;
    chatId;
    constructor(config) {
        this.config = config;
    }
    /**
     * Main entry point: Run the agent loop until a final answer is received.
     */
    async run(initialPrompt, images) {
        let additionalMessages = this.buildInitialMessages(initialPrompt, images);
        let turnCount = 0;
        const maxTurns = this.config.maxTurns ?? 10;
        // We reuse conversationId if already set, or let Coze create one
        // chatId changes every turn (new request)
        while (turnCount < maxTurns) {
            turnCount++;
            if (this.config.debug)
                console.log(`[Agent] Turn ${turnCount} start`);
            // 1. Call Coze Chat API
            // If we have a conversationId, we attach it.
            const chatResult = await this.callCozeChat(additionalMessages);
            // Update IDs
            this.chatId = chatResult.id;
            this.conversationId = chatResult.conversation_id;
            // 2. Poll for terminal status
            const statusResult = await this.pollStatus(this.conversationId, this.chatId);
            // 3. Handle Status
            if (statusResult.status === "requires_action") {
                const toolCalls = statusResult.required_action?.submit_tool_outputs?.tool_calls;
                if (toolCalls) {
                    if (this.config.debug)
                        console.log(`[Agent] Tool calls required: ${toolCalls.length}`);
                    const toolOutputs = await this.executePlugins(toolCalls);
                    await this.submitToolOutputs(toolOutputs);
                    // After submission, we need to POLL again for the SAME chat_id
                    // So we continue the inner logic, or just let the loop restart?
                    // Standard Coze v3: submit_tool_outputs resumes the chat. 
                    // We should wait for it to complete HERE.
                    const finalStatus = await this.pollStatus(this.conversationId, this.chatId);
                    if (finalStatus.status === "completed") {
                        // Fall through to completion handling
                    }
                    else {
                        // If failed or requires_action again (loop), handle it?
                        // For simplicity, let's treat "requires_action -> submit -> completed" as one turn.
                        // If it needs MORE tools, we can loop recursively or just break and let the outer loop handle?
                        // Actually, polling loop handles transitions.
                        // If finalStatus is completed, we are good.
                    }
                }
            }
            // Check final status after potential tool handling
            // We fetch the latest status again just to be sure (or reuse finalStatus)
            const endStatus = await this.pollStatus(this.conversationId, this.chatId);
            if (endStatus.status === "completed") {
                const messages = await this.fetchMessages();
                const lastMsg = messages[messages.length - 1];
                // 4. Check for "FunctionCallPlugin" message (Legacy/Fallback)
                const functionCall = this.parseFunctionCallMessage(lastMsg);
                if (functionCall) {
                    if (this.config.debug)
                        console.log(`[Agent] Found FunctionCallPlugin message: ${functionCall.name}`);
                    const result = await this.executeLocalPlugin({
                        id: functionCall.tool_call_id || "unknown",
                        name: functionCall.name,
                        arguments: functionCall.parameters || {}
                    });
                    // 5. Round-trip: Send result as NEW message
                    const toolMsg = {
                        role: "user",
                        content: `Tool Output for ${functionCall.name}: ${JSON.stringify(result.content)}. Please continue.`,
                        content_type: "text"
                    };
                    // Prepare for next turn
                    additionalMessages = [toolMsg];
                    continue; // Loop again with new message
                }
                // 6. Final Answer
                return this.extractAnswer(messages);
            }
            if (endStatus.status === "failed") {
                throw new Error(`Coze Chat failed: ${JSON.stringify(endStatus.last_error || "unknown")}`);
            }
            // If we are here, maybe cancelled or unknown?
            if (this.config.debug)
                console.log(`[Agent] Turn ended with status: ${endStatus.status}`);
            break;
        }
        throw new Error("Max turns reached or conversation ended unexpectedly");
    }
    buildInitialMessages(prompt, images) {
        const additional_messages = [];
        if (images && images.length > 0) {
            const hasUrl = images.some((img) => img && typeof img.url === "string" && img.url.trim());
            if (hasUrl) {
                const contentList = [];
                contentList.push({
                    content_type: "text",
                    content: { text: prompt, image_url: null, file_url: null }
                });
                for (const img of images) {
                    if (!img)
                        continue;
                    if (typeof img.url === "string" && img.url.trim()) {
                        contentList.push({
                            content_type: "image",
                            content: {
                                text: "",
                                image_url: { url: img.url, name: img.fileName || "image.png" },
                                file_url: null
                            }
                        });
                    }
                }
                additional_messages.push({
                    role: "user",
                    content_type: "object_string",
                    content: JSON.stringify(contentList),
                    type: "question"
                });
            }
            else {
                const contentList = [{ type: "text", text: prompt }];
                for (const img of images) {
                    if (!img || typeof img.fileId !== "string" || !img.fileId.trim())
                        continue;
                    contentList.push({ type: "image", file_id: img.fileId });
                }
                additional_messages.push({
                    role: "user",
                    content_type: "object_string",
                    content: JSON.stringify(contentList),
                    type: "question"
                });
            }
        }
        else {
            additional_messages.push({ role: "user", content: prompt, content_type: "text", type: "question" });
        }
        return additional_messages;
    }
    async callCozeChat(additionalMessages) {
        const url = new URL("/v3/chat", this.config.baseUrl);
        const body = {
            bot_id: this.config.botId,
            user_id: this.config.userId,
            stream: false,
            auto_save_history: true,
            additional_messages: additionalMessages,
            parameters: {}
        };
        if (this.conversationId)
            body.conversation_id = this.conversationId;
        const res = await fetch(url.toString(), {
            method: "POST",
            headers: { "content-type": "application/json", authorization: `Bearer ${this.config.apiKey}` },
            body: JSON.stringify(body)
        });
        if (!res.ok)
            throw new Error(`Coze Chat API failed: ${res.status} ${await res.text()}`);
        const json = await res.json();
        if (json.code !== 0)
            throw new Error(`Coze Chat API error: ${json.code} ${json.msg}`);
        return json.data;
    }
    async pollStatus(conversationId, chatId) {
        const url = new URL("/v3/chat/retrieve", this.config.baseUrl);
        url.searchParams.set("conversation_id", conversationId);
        url.searchParams.set("chat_id", chatId);
        const start = Date.now();
        while (Date.now() - start < 60000) {
            const res = await fetch(url.toString(), {
                headers: { authorization: `Bearer ${this.config.apiKey}` }
            });
            if (!res.ok)
                throw new Error(`Poll failed: ${res.status}`);
            const json = await res.json();
            if (json.code !== 0)
                throw new Error(`Poll error: ${json.code}`);
            const status = json.data.status;
            if (["completed", "failed", "canceled", "requires_action"].includes(status)) {
                return json.data;
            }
            await new Promise(r => setTimeout(r, 500));
        }
        throw new Error("Polling timed out");
    }
    async fetchMessages() {
        const url = new URL("/v3/chat/message/list", this.config.baseUrl);
        url.searchParams.set("conversation_id", this.conversationId);
        url.searchParams.set("chat_id", this.chatId);
        const res = await fetch(url.toString(), {
            headers: { authorization: `Bearer ${this.config.apiKey}` }
        });
        const json = await res.json();
        return json.data || [];
    }
    extractAnswer(messages) {
        // Filter out tool calls, only get assistant answers
        // Or just join all relevant content?
        // User wants "Final Answer". 
        // We should probably filter for role='assistant' and type='answer'.
        const parts = [];
        for (const msg of messages) {
            if (msg.role === 'assistant' && msg.type === 'answer') {
                parts.push(msg.content);
            }
            // Fallback: if content looks like answer
            else if (msg.role === 'assistant' && !msg.content.includes('FunctionCallPlugin')) {
                parts.push(msg.content);
            }
        }
        return parts.join("\n\n").trim();
    }
    parseFunctionCallMessage(msg) {
        if (msg?.content_type === "text" && typeof msg.content === "string") {
            if (msg.content.includes("FunctionCallPlugin") && msg.content.trim().startsWith("{")) {
                try {
                    const parsed = JSON.parse(msg.content);
                    if (parsed.name === "FunctionCallPlugin") {
                        return {
                            name: parsed.parameters?.name,
                            parameters: parsed.parameters?.parameters,
                            tool_call_id: parsed.tool_call_id
                        };
                    }
                }
                catch { }
            }
        }
        return null;
    }
    async executePlugins(toolCalls) {
        const outputs = [];
        for (const call of toolCalls) {
            let args = {};
            try {
                args = JSON.parse(call.function.arguments);
            }
            catch { }
            const result = await this.executeLocalPlugin({
                id: call.id,
                name: call.function.name,
                arguments: args
            });
            outputs.push({
                tool_call_id: result.id,
                output: typeof result.content === 'string' ? result.content : JSON.stringify(result.content)
            });
        }
        return outputs;
    }
    async executeLocalPlugin(call) {
        console.log(`[Agent] Executing plugin: ${call.name}`);
        try {
            if (call.name === "OCRhuoshanban-general_ocr" || call.name === "tupianlijie-imgUnderstand") {
                // Mock execution for OCR as requested
                // In a real scenario, this would call an internal service
                return {
                    id: call.id,
                    content: {
                        code: 0,
                        msg: "success",
                        data: { line_texts: [], line_rects: [] } // Dummy success to let Coze continue
                    }
                };
            }
            // Default: Echo success
            return { id: call.id, content: { code: 0, msg: "success" } };
        }
        catch (e) {
            console.error(`[Agent] Plugin execution failed: ${e.message}`);
            return { id: call.id, content: { code: 1, msg: e.message }, isError: true };
        }
    }
    async submitToolOutputs(outputs) {
        const url = new URL("/v3/chat/submit_tool_outputs", this.config.baseUrl);
        url.searchParams.set("conversation_id", this.conversationId);
        url.searchParams.set("chat_id", this.chatId);
        const res = await fetch(url.toString(), {
            method: "POST",
            headers: { "content-type": "application/json", authorization: `Bearer ${this.config.apiKey}` },
            body: JSON.stringify({ tool_outputs: outputs })
        });
        if (!res.ok)
            throw new Error(`Submit tool outputs failed: ${await res.text()}`);
    }
}
