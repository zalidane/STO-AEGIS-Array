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

export function formatWikiDate(wikiDate: string | null | undefined): string {
  if (!wikiDate) return "Unknown";

  if (wikiDate.length !== 8) return wikiDate;

  const year = wikiDate.slice(0, 4);
  const month = wikiDate.slice(4, 6);
  const day = wikiDate.slice(6, 8);

  const date = new Date(`${year}-${month}-${day}`);

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
