import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteSource = path.join(root, "site");
const motoSource = path.join(root, "apps", "tap-moto", "out");
const output = path.join(root, "_site");
const motoOutput = path.join(output, "games", "tap-moto");

await rm(output, { recursive: true, force: true });
await cp(siteSource, output, { recursive: true });
await mkdir(motoOutput, { recursive: true });
await cp(motoSource, motoOutput, { recursive: true });

console.log(`Unified site assembled at ${output}`);
