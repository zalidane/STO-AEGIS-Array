export function formatYesNo(
  value: boolean | number | string | null | undefined,
): string {
  if (value === true || value === 1 || value === "1") return "Yes";
  if (value === false || value === 0 || value === "0") return "No";

  return "Unknown";
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return "N/A";

  return value.toLocaleString();
}

export function formatValue<T>(value: T | null | undefined): string {
  return value == null ? "N/A" : String(value);
}
