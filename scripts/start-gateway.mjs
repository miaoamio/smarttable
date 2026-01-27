import handle from '../api/gateway.js';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';

// Try to load .env manually
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
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
} catch (e) {}

http.createServer(handle).listen(8787, () => {
  console.log('Production gateway running on http://localhost:8787');
});
