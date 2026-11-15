import { useSyncExternalStore, type AnchorHTMLAttributes } from "react";

/** Site routes; nginx and Vite both fall back to index.html for these. */
export const ROUTES = {
  home: "/",
  app: "/app",
  method: "/how-it-works",
  evidence: "/evidence",
  data: "/data",
  guide: "/guide",
} as const;

const subscribe = (notify: () => void) => {
  window.addEventListener("popstate", notify);
  return () => window.removeEventListener("popstate", notify);
};

/** Current pathname, without a trailing slash (except the root). */
export function usePath(): string {
  const path = useSyncExternalStore(subscribe, () => window.location.pathname);
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

function navigate(to: string) {
  window.history.pushState(null, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
  if (!to.includes("#")) window.scrollTo(0, 0);
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string };

/** In-app link: plain <a href> that skips the full page reload. */
export function Link({ to, onClick, ...rest }: LinkProps) {
  return (
    <a
      href={to}
      onClick={(e) => {
        onClick?.(e);
        if (
          e.defaultPrevented ||
          e.button !== 0 ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey ||
          rest.target
        )
          return;
        e.preventDefault();
        navigate(to);
      }}
      {...rest}
    />
  );
}
