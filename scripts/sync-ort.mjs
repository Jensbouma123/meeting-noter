// Copies the onnxruntime-web wasm runtime from node_modules into public/ort/, so the app serves
// it itself (D1 points `ort.env.wasm.wasmPaths` at /ort/) and never loads it from a CDN.
// Runs on postinstall; public/ort is also committed so an --ignore-scripts install still works.
// src/lib/d1/ort-assets.test.ts fails when the two copies differ.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "node_modules/onnxruntime-web/dist");
const dest = path.join(root, "public/ort");
const files = [
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.wasm",
  "ort-wasm-simd-threaded.jsep.mjs",
  "ort-wasm-simd-threaded.jsep.wasm",
];

if (!existsSync(src)) {
  console.log("sync-ort: onnxruntime-web is not installed, skipping");
  process.exit(0);
}
mkdirSync(dest, { recursive: true });
let copied = 0;
for (const name of files) {
  const from = path.join(src, name);
  const to = path.join(dest, name);
  if (existsSync(to) && readFileSync(from).equals(readFileSync(to))) continue;
  copyFileSync(from, to);
  copied += 1;
}
console.log(`sync-ort: ${copied} file(s) updated in public/ort`);
