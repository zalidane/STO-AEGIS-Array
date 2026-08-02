import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function loadTypeDefs(): string {
  const schemaDir = __dirname;
  return readdirSync(schemaDir)
    .filter((file) => file.endsWith(".graphql"))
    .map((file) => readFileSync(join(schemaDir, file), "utf8"))
    .join("\n");
}
