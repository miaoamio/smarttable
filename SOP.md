# Ark (Volcengine) Integration SOP

## 1. Network & Environment Configuration

### Base URL
- **Public / Vercel**: `https://ark.cn-beijing.volces.com/api/v3`
  - Use this for Vercel deployments or local development outside the corporate network.
  - Ensures connectivity to Volcengine's public API gateway.
- **Internal (Corporate Network)**: `https://ark-cn-beijing.bytedance.net/api/v3`
  - Only accessible within the Bytedance intranet.
  - **Note**: Vercel cannot access this address.

### Critical Environment Variables
```bash
# Public Access (Recommended for Consistency)
LLM_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
LLM_MODEL=ep-20260129104027-mzlwg
LLM_API_KEY=your-ark-api-key
LLM_PROVIDER=ark
```

## 2. System Prompt & JSON Format

To ensure the AI generates the correct JSON format (Smart Table Protocol), the System Prompt must be explicitly passed to the LLM tool call.

- **Issue**: If the AI returns a generic JSON (e.g., just `columns` and `data` objects) instead of the expected `intent` + `schema` structure, it means the System Prompt was not received.
- **Fix**: Ensure `packages/figma-plugin/src/ui.ts` imports `SYSTEM_PROMPT` and passes it in the `llm_chat` arguments:
  ```typescript
  import { distributePrompt, SYSTEM_PROMPT } from "./promptDispatcher";
  // ...
  args: {
    system: SYSTEM_PROMPT, // MUST be present
    prompt: userPrompt,
    // ...
  }
  ```

## 3. Multimodal (Image) Handling

- **Mechanism**: The system now uses **Base64 Data URLs** for image transmission to Ark/Volcengine.
  - Images are NOT uploaded to an intermediate `/files` endpoint.
  - The plugin converts local files to `data:image/png;base64,...` strings.
  - These strings are passed directly in the `image_url` field of the chat completion request.
- **Benefits**:
  - Bypasses potential 500 errors or compatibility issues with the `/files/upload` endpoint on Gateway/Ark.
  - Simplifies the flow by removing stateful file management.
- **Troubleshooting**:
  - If AI fails to "see" the image, check if the Base64 string is correctly formed (starts with `data:image/...`).
  - Ensure `LLM_BASE_URL` is set to the **Public** address (`volces.com`) for Vercel deployments.

## 4. SDK Usage (Reference)

When using the Python SDK or Curl for manual testing, use Base64 for images:

```bash
# Bash / Curl Example
BASE64_IMAGE=$(base64 < demo.png)
curl https://ark-cn-beijing.volces.com/api/v3/chat/completions \
  -H "Authorization: Bearer $ARK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "'"$ENDPOINT_ID"'",
    "messages": [
      {
        "role": "user",
        "content": [
          { "type": "image_url", "image_url": { "url": "data:image/png;base64,'"$BASE64_IMAGE"'" } },
          { "type": "text", "text": "Describe this image" }
        ]
      }
    ]
  }'
```

```python
# Python SDK Example
client = AsyncArk(
    base_url='https://ark-cn-beijing.volces.com/api/v3',
    api_key=os.getenv('ARK_API_KEY')
)
# Use "image_url": "data:image/png;base64,..." in content
```
