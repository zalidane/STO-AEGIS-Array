import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const STATE_FILE = "output/importState.json";

export async function loadState() {
  if (!existsSync(STATE_FILE)) {
    return {};
  }

  const content = await readFile(STATE_FILE, "utf-8");

  return JSON.parse(content);
}

export async function saveState(state: Record<string, any>) {
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}
