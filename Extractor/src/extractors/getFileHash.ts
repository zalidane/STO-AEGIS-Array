import { createHash } from "crypto";
import { readFile } from "node:fs/promises";

export async function getFileHash(filePath: string): Promise<string> {
  const content = await readFile(filePath, "utf-8");

  return createHash("sha256").update(content).digest("hex");
}
