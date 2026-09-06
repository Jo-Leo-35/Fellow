// Publish HTML/PDF guides and assets from docs/judges; the product story lives in docs/README.md.
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../docs/judges/", import.meta.url));
const target = fileURLToPath(new URL("../frontend/public/評審請看這/", import.meta.url));
mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true });
// The static site has no parent docs/README.md, so point its legacy entry to GitHub.
const entry = readFileSync(new URL("../docs/judges/README.md", import.meta.url), "utf8");
writeFileSync(`${target}/README.md`, entry.replaceAll("(../README.md)", "(https://github.com/Jo-Leo-35/Fellow/blob/main/docs/README.md)"), "utf8");
console.log("Judge documents synced to /評審請看這/ for local preview and builds.");
