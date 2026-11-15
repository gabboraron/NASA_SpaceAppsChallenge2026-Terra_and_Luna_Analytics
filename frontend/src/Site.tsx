import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { useAccount } from "./account/session";
import { AccountPage } from "./pages/Account/Account";
import { LoginPage } from "./pages/Auth/Login";
import { RegisterPage } from "./pages/Auth/Register";
import { DataPage } from "./pages/Data/Data";
import { EvidencePage } from "./pages/Evidence/Evidence";
import { GuidePage } from "./pages/Guide/Guide";
import { LandingPage } from "./pages/Landing/Landing";
import { MethodPage } from "./pages/Method/Method";
import { PlacementsPage } from "./pages/Placements/Placements";
import { ROUTES, usePath } from "./site/router";

// The explorer carries MapLibre; only /app downloads it.
const App = lazy(() => import("./App").then((m) => ({ default: m.App })));

type Page = {
  title: string;
  render: () => ReactNode;
  /** Needs a signed-in beekeeper; signed out, the sign-in page shows instead. */
  auth?: true;
};

const LOGIN: Page = { title: "Sign in", render: () => <LoginPage /> };

const PAGES: Record<string, Page> = {
  [ROUTES.home]: { title: "", render: () => <LandingPage /> },
  [ROUTES.app]: {
    title: "Explorer",
    auth: true,
    render: () => (
      <Suspense fallback={<p role="status">Loading the explorer…</p>}>
        <App />
      </Suspense>
    ),
  },
  [ROUTES.method]: { title: "How it works", render: () => <MethodPage /> },
  [ROUTES.evidence]: { title: "Evidence", render: () => <EvidencePage /> },
  [ROUTES.data]: { title: "Data & sources", render: () => <DataPage /> },
  [ROUTES.guide]: { title: "Guide", render: () => <GuidePage /> },
  [ROUTES.login]: LOGIN,
  [ROUTES.register]: { title: "Register", render: () => <RegisterPage /> },
  [ROUTES.account]: {
    title: "Account",
    auth: true,
    render: () => <AccountPage />,
  },
  [ROUTES.placements]: {
    title: "My placements",
    auth: true,
    render: () => <PlacementsPage />,
  },
};

/** Picks the page for the current path; unknown paths show the landing page. */
export function Site() {
  const path = usePath();
  const signedIn = useAccount() !== null;
  const wanted = PAGES[path] ?? PAGES[ROUTES.home];
  // The address stays, so the requested page shows right after signing in.
  const page = wanted.auth && !signedIn ? LOGIN : wanted;
  useEffect(() => {
    document.title = page.title ? `${page.title} · HappyBee` : "HappyBee";
  }, [page]);
  return page.render();
}
