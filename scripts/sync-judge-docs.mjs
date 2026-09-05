// Publish a generated copy; docs/judges remains the only authored source.
import { cpSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../docs/judges/", import.meta.url));
const target = fileURLToPath(new URL("../frontend/public/評審請看這/", import.meta.url));
mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true });
console.log("Judge documents synced to /評審請看這/ for local preview and builds.");
