import { useEffect } from "react";

/** Call `onEscape` when the Escape key is pressed anywhere on the page. */
export function useEscape(onEscape: () => void) {
  useEffect(() => {
    const listener = (e: KeyboardEvent) => e.key === "Escape" && onEscape();
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [onEscape]);
}
