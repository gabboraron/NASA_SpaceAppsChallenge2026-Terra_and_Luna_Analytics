import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { DataPage } from "./pages/Data/Data";
import { GuidePage } from "./pages/Guide/Guide";
import { LandingPage } from "./pages/Landing/Landing";
import { MethodPage } from "./pages/Method/Method";
import { ROUTES, usePath } from "./site/router";

// The explorer carries MapLibre; only /app downloads it.
const App = lazy(() => import("./App").then((m) => ({ default: m.App })));

const PAGES: Record<string, { title: string; render: () => ReactNode }> = {
  [ROUTES.home]: { title: "", render: () => <LandingPage /> },
  [ROUTES.app]: {
    title: "Explorer",
    render: () => (
      <Suspense fallback={<p role="status">Loading the explorer…</p>}>
        <App />
      </Suspense>
    ),
  },
  [ROUTES.method]: { title: "How it works", render: () => <MethodPage /> },
  [ROUTES.data]: { title: "Data & sources", render: () => <DataPage /> },
  [ROUTES.guide]: { title: "Guide", render: () => <GuidePage /> },
};

/** Picks the page for the current path; unknown paths show the landing page. */
export function Site() {
  const path = usePath();
  const page = PAGES[path] ?? PAGES[ROUTES.home];
  useEffect(() => {
    document.title = page.title
      ? `${page.title} · Pollination Marketplace`
      : "Pollination Marketplace";
  }, [page]);
  return page.render();
}
