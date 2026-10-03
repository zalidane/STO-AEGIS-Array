import { infoboxTextBlocks, type InfoboxTextFields } from "@/logic/collection/itemText";

export function loadoutItemSearchText(fields: InfoboxTextFields): string {
  return infoboxTextBlocks(fields)
    .flatMap((block) => [block.text, block.subscript])
    .filter((value): value is string => Boolean(value))
    .join(" ");
}

export function matchesPickerQuery(
  item: { name: string; searchText?: string | null },
  query: string | null | undefined,
): boolean {
  const needle = query?.trim().toLowerCase() ?? "";
  if (!needle) return true;
  if (item.name.toLowerCase().includes(needle)) return true;
  return (item.searchText ?? "").toLowerCase().includes(needle);
}
