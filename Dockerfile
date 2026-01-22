# Base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Copy packages
COPY packages ./packages

# Install dependencies
RUN npm ci

# Build all packages
RUN npm run build

# Expose the port the gateway runs on
EXPOSE 8787

# Set environment variables (can be overridden at runtime)
ENV PORT=8787
ENV NODE_ENV=production

# Start the gateway
# Note: We need to point to the built gateway file. 
# Based on package.json scripts: "dev:gateway": "npm run build ... && npm run dev -w @mcp/mcp-gateway"
# And mcp-gateway package.json: "dev": "node dist/index.js"
CMD ["node", "packages/mcp-gateway/dist/index.js"]
