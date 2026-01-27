import * as esbuild from 'esbuild';
import path from 'node:path';

async function bundle() {
  try {
    await esbuild.build({
      entryPoints: ['packages/mcp-gateway/src/handler.ts'],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outfile: 'api/gateway.js',
      minify: false, // Keep it readable for now but can be true for production
      sourcemap: true,
      footer: {
        js: 'export default handle;',
      },
      // We want to bundle everything EXCEPT node built-ins and Prisma
      external: ['node:*', 'canvas', 'jsdom', '@prisma/client', '.prisma/client'], 
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      banner: {
        js: `
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
`,
      },
    });
    console.log('Successfully bundled gateway to api/gateway.js');
  } catch (error) {
    console.error('Bundle failed:', error);
    process.exit(1);
  }
}

bundle();
