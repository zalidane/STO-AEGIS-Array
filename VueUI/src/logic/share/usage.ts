export function publicUsageLabel(count: number): string {
  if (count <= 0) return "";
  if (count === 1) return "Used in 1 public build";
  return `Used in ${count} public builds`;
}
