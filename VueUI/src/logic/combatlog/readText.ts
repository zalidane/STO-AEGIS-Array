/** User-facing copy when reading or saving a combat log fails. */
export function combatLogFileError(err: unknown): string {
  const name =
    err && typeof err === "object" && "name" in err ? String(err.name) : "";
  if (name === "NotReadableError" || name === "NotFoundError") {
    return "Couldn’t read combatlog.log while the game has it open. Copy the file out of the GameClient folder and upload that copy.";
  }
  if (name === "QuotaExceededError") {
    return "Parsed, but the browser couldn’t save the summary (storage is full).";
  }
  return "Could not read that file. If Star Trek Online is running, copy combatlog.log to the desktop and upload the copy.";
}

export async function readCombatLogText(file: Blob): Promise<string> {
  if (typeof FileReader !== "undefined") {
    return readWithFileReader(file);
  }
  return file.text();
}

function readWithFileReader(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(
        reader.error ??
          new DOMException("Failed to read file", "NotReadableError"),
      );
    reader.readAsText(file);
  });
}
