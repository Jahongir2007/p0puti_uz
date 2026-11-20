import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url)); // → client/scripts
const root = path.resolve(__dirname, "..");                     // → client

const regions = JSON.parse(fs.readFileSync(path.join(root, "src/locations/regions.json"), "utf8"));
const districts = JSON.parse(fs.readFileSync(path.join(root, "src/locations/districts.json"), "utf8"));
const regionName = Object.fromEntries(regions.map((r) => [r.id, r.name_uz]));

const locations = districts.map((d) => ({
  id: d.id,
  name: d.name_uz,
  region: regionName[d.region_id],
  alt: [d.name_oz, d.name_ru].filter(Boolean),
}));

const outDir = path.join(root, "src/data");
fs.mkdirSync(outDir, { recursive: true }); // create src/data if missing
fs.writeFileSync(path.join(outDir, "locations.json"), JSON.stringify(locations));

console.log(`✅ ${locations.length} locations written`);