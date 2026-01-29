# Ark (Volcengine) Image Upload & Integration SOP

## 1. SDK Support for Local Files
The Volcengine Ark SDK (`volcenginesdkarkruntime`) supports uploading local images directly using the `file://` protocol.

**Python Example:**
```python
import asyncio
import os
from volcenginesdkarkruntime import AsyncArk

client = AsyncArk(
    base_url='https://ark-cn-beijing.bytedance.net/api/v3',
    api_key=os.getenv('ARK_API_KEY')
)

async def main():
    local_path = "/Users/doc/ark_demo_img_1.png"
    response = await client.responses.create(
        model="<ENDPOINT_ID>",
        input=[
            {"role": "user", "content": [
                {
                    "type": "input_image",
                    "image_url": f"file://{local_path}" 
                },
                {
                    "type": "input_text",
                    "text": "Which model series supports image input?"
                }
            ]},
        ]
    )
    print(response)

if __name__ == "__main__":
    asyncio.run(main())
```

## 2. API Integration (HTTP/MCP)
When integrating via raw HTTP or MCP (Model Context Protocol), especially in web/plugin environments where local file access might be restricted or different:

- **Endpoint**: `https://ark-cn-beijing.bytedance.net/api/v3/responses` (Note: `/responses` suffix for Ark-specific non-standard endpoints, or standard `/chat/completions` if compatible).
- **Payload Structure**:
  ```json
  {
    "model": "endpoint-id",
    "input": [
      {
        "role": "user",
        "content": [
          { "type": "input_image", "image_url": "https://url-to-image.com/img.png" },
          { "type": "input_text", "text": "Describe this image" }
        ]
      }
    ]
  }
  ```
- **Image Handling**:
  - **URLs**: Direct HTTP/HTTPS URLs are supported.
  - **Base64**: For local files in a browser/plugin environment, convert to Base64 (if supported by the specific model endpoint) or upload to a temporary storage (like TOS) to get a URL.
  - **Local Files (Server-side)**: If running on a server (like MCP server), `file://` paths can be used if the server has filesystem access.

## 3. Current Project Integration
In this project (`table`):
- **MCP Server**: Updated to support `arkChat` which handles the Ark API specific payload (`input` array instead of `messages`).
- **MCP Gateway**: Proxies requests.
- **Figma Plugin**: Uploads images to a gateway/storage to get a URL, then passes the URL to the MCP tool.

## 4. Key Configuration
- **Base URL**: `https://ark-cn-beijing.bytedance.net/api/v3`
- **Model**: `ep-20260129104027-mzlwg` (Doubao-Seed-1.8 or similar)
- **Provider**: Set `LLM_PROVIDER=ark` to trigger the specific handler in MCP server.
