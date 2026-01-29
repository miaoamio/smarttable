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

## 3. Image Upload

- **Endpoint**: The system uses `{LLM_BASE_URL}/v1/files/upload` (or similar) to upload images.
- **Troubleshooting**:
  - If upload fails with network errors on Vercel, ensure `LLM_BASE_URL` is set to the **Public** address.
  - The internal address (`bytedance.net`) will cause `fetch failed` errors on Vercel.

## 4. SDK Usage (Reference)

When using the Python SDK for local testing:
```python
client = AsyncArk(
    base_url='https://ark.cn-beijing.volces.com/api/v3', # Use public URL
    api_key=os.getenv('ARK_API_KEY')
)
```
