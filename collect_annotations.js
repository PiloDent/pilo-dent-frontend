// scripts/collect_annotations.js
import fs from "fs";
import path from "path";

// 1. Root of your per-image JSON tree (may have subdirectories)
const IN_DIR   = path.resolve(process.cwd(), "data/results");
// 2. Where to write the consolidated lookup
const OUT_FILE = path.resolve(process.cwd(), "data/annotations.json");

function walk(dir) {
  // returns list of absolute paths to all .json files under `dir`
  let files = [];
  for (let name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      files = files.concat(walk(full));
    } else if (name.toLowerCase().endsWith(".json")) {
      files.push(full);
    }
  }
  return files;
}

const annotations = {};
for (const absPath of walk(IN_DIR)) {
  const fname = path.basename(absPath);          // e.g. "52.jpg.json"
  const key   = fname.replace(/\.json$/i, "");   // "52.jpg"
  const json  = JSON.parse(fs.readFileSync(absPath, "utf-8"));
  annotations[key] = json;
}

fs.writeFileSync(OUT_FILE, JSON.stringify(annotations, null, 2));
console.log(`✅ Wrote ${Object.keys(annotations).length} annotations to ${OUT_FILE}`);

