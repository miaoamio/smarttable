import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(scriptDir, "..");
const srcDir = path.join(packageDir, "src");
const distDir = path.join(packageDir, "dist");
const isWatch = process.argv.includes("--watch");

async function ensureDist() {
  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distDir, { recursive: true });
}

function injectUiScript(uiHtml, uiJs, xlsxJs) {
  const marker = '<script src="./ui.js"></script>';
  // Use base64 encoding to completely avoid HTML parsing issues with the library content
  const xlsxBase64 = Buffer.from(xlsxJs).toString('base64');
  
  const combinedScripts = `
    <script>
      (function() {
        var script = document.createElement('script');
        script.text = atob("${xlsxBase64}");
        document.head.appendChild(script);
      })();
    </script>
    <script>
      ${uiJs.replace(/<\/script>/g, '<\\/script>')}
    </script>
  `;
  if (uiHtml.includes(marker)) {
    return uiHtml.replace(marker, combinedScripts);
  }
  return `${uiHtml}\n${combinedScripts}\n`;
}

async function buildOnce() {
  const uiHtmlTemplate = await fs.readFile(path.join(srcDir, "ui.html"), "utf8");
  
  // Read XLSX library content
  // Note: dependencies are hoisted to root node_modules in monorepo
  let xlsxPath = path.join(packageDir, "node_modules", "xlsx", "dist", "xlsx.full.min.js");
  try {
    await fs.access(xlsxPath);
  } catch {
    // Fallback to root node_modules
    xlsxPath = path.join(packageDir, "..", "..", "node_modules", "xlsx", "dist", "xlsx.full.min.js");
  }
  
  const xlsxJs = await fs.readFile(xlsxPath, "utf8");

  const isProduction = process.env.NODE_ENV === "production";
  const uiBuild = await esbuild.build({
    entryPoints: [path.join(srcDir, "ui.ts")],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["es2018"],
    write: false,
    define: {
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development")
    }
  });
  const uiJs = uiBuild.outputFiles?.[0]?.text ?? "";
  const uiHtml = injectUiScript(uiHtmlTemplate, uiJs, xlsxJs);
  await fs.writeFile(path.join(distDir, "ui.html"), uiHtml, "utf8");

  await esbuild.build({
    entryPoints: [path.join(srcDir, "code.ts")],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["es2018"],
    outfile: path.join(distDir, "code.js"),
    define: {
      __html__: JSON.stringify(uiHtml)
    }
  });
}

async function main() {
  await ensureDist();

  if (!isWatch) {
    await buildOnce();
    return;
  }

  let timer = null;
  const debounceMs = 80;
  const trigger = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      buildOnce().catch(() => {});
    }, debounceMs);
  };
  trigger();
  const watcher = await import("node:fs");
  watcher.watch(srcDir, { recursive: true }, () => trigger());
}

await main();
