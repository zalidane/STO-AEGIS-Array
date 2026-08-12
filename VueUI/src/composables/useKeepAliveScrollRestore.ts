import { onActivated, onBeforeUnmount, onDeactivated, onMounted } from "vue";

function findScrollParent(el: HTMLElement | null): HTMLElement | Window {
  let node: HTMLElement | null = el;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    if (
      (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
      node.scrollHeight > node.clientHeight
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return window;
}

function readScroll(target: HTMLElement | Window): number {
  if (target === window) return window.scrollY || document.documentElement.scrollTop;
  return (target as HTMLElement).scrollTop;
}

function writeScroll(target: HTMLElement | Window, top: number): void {
  if (target === window) {
    window.scrollTo({ top, left: 0, behavior: "instant" as ScrollBehavior });
    return;
  }
  (target as HTMLElement).scrollTop = top;
}

/**
 * Preserve scroll when a keep-alive view is deactivated and restore on activate.
 * Call from list pages that navigate into detail views and back.
 */
export function useKeepAliveScrollRestore(): void {
  let savedTop = 0;
  let scroller: HTMLElement | Window = window;
  let rootEl: HTMLElement | null = null;

  onMounted(() => {
    // Prefer the nearest scrollable ancestor of the current view root.
    rootEl = document.querySelector(
      ".v-main .v-container, .v-main",
    ) as HTMLElement | null;
    scroller = findScrollParent(rootEl);
  });

  onDeactivated(() => {
    scroller = findScrollParent(rootEl);
    savedTop = readScroll(scroller);
  });

  onActivated(() => {
    scroller = findScrollParent(rootEl);
    requestAnimationFrame(() => {
      writeScroll(scroller, savedTop);
      requestAnimationFrame(() => writeScroll(scroller, savedTop));
    });
  });

  onBeforeUnmount(() => {
    rootEl = null;
  });
}
