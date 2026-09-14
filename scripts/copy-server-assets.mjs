import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(root, "server", "assets");
const destDir = path.join(root, "dist", "assets");

if (!fs.existsSync(srcDir)) {
  console.warn("[copy-server-assets] No hay server/assets; se omite.");
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });

for (const name of fs.readdirSync(srcDir)) {
  if (name.startsWith("_") || name.startsWith(".")) continue;
  const src = path.join(srcDir, name);
  if (!fs.statSync(src).isFile()) continue;
  fs.copyFileSync(src, path.join(destDir, name));
  console.log(`[copy-server-assets] ${name}`);
}
