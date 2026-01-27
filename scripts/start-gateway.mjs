import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';

// Try to load .env manually from root and package dirs
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'packages/mcp-gateway/.env')
];

envPaths.forEach(envPath => {
  try {
    if (fs.existsSync(envPath)) {
      console.log(`Loading env from ${envPath}`);
      const env = fs.readFileSync(envPath, 'utf8');
      env.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) process.env[key] = value;
        }
      });
    }
  } catch (e) {
    console.warn(`Failed to load env from ${envPath}`, e);
  }
});

// Import handle AFTER env vars are loaded
const { default: handle } = await import('../api/gateway.js');

http.createServer(handle).listen(8787, () => {
  console.log('Production gateway running on http://localhost:8787');
});
