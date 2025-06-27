// scripts/collect_annotations.js
import fs from "fs";
import path from "path";

// 1. Root of your per-image JSON files (may contain subfolders)
const IN_DIR   = path.resolve(process.cwd(), "data/results");
// 2. Path for the merged lookup
const OUT_FILE = path.resolve(process.cwd(), "data/annotations.json");

function walk(dir) {
  const files = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else if (name.endsWith(".json")) {
      files.push(full);
    }
  }
  return files;
}

const annotations = {};
for (const fullPath of walk(IN_DIR)) {
  // e.g. data/results/Caries/123.jpg.json  →  "Caries/123.jpg"
  const rel = path.relative(IN_DIR, fullPath);
  const key = rel.replace(/\.json$/, "");
  const data = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  annotations[key] = data;
}

fs.writeFileSync(OUT_FILE, JSON.stringify(annotations, null, 2));
console.log(`✅ Wrote ${Object.keys(annotations).length} annotations to ${OUT_FILE}`);

