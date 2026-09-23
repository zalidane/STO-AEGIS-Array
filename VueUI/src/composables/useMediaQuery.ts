import { onScopeDispose, shallowRef, type Ref } from "vue";

/** Reactive `window.matchMedia` result; false when matchMedia is unavailable. */
export function useMediaQuery(query: string): Ref<boolean> {
  const matches = shallowRef(false);
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return matches;
  }

  const mql = window.matchMedia(query);
  matches.value = mql.matches;

  const onChange = () => {
    matches.value = mql.matches;
  };
  mql.addEventListener("change", onChange);
  onScopeDispose(() => mql.removeEventListener("change", onChange));

  return matches;
}
