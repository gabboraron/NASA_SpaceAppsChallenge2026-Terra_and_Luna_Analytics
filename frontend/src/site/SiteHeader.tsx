import { useState, type ReactNode } from "react";
import { useAccount } from "../account/session";
import { BeeMark } from "./BeeMark";
import { REPO, SPACE_APPS } from "./meta";
import { Link, ROUTES, usePath } from "./router";
import styles from "./SiteHeader.module.css";

const NAV = [
  { to: ROUTES.method, label: "How it works" },
  { to: ROUTES.evidence, label: "Evidence" },
  { to: ROUTES.data, label: "Data" },
  { to: ROUTES.guide, label: "Guide" },
];

type Props = {
  /** "site": light masthead for the reading pages; "app": dark bar over the explorer. */
  variant?: "site" | "app";
  /** Extra controls on the right of the app bar (season switch). */
  children?: ReactNode;
};

/** Shared top bar: bee mark, page links, the account, and the way into the explorer. */
export function SiteHeader({ variant = "site", children }: Props) {
  const path = usePath();
  const account = useAccount();
  const [open, setOpen] = useState(false);
  const app = variant === "app";
  const links = [
    ...(app ? [{ to: ROUTES.app, label: "Explorer" }] : []),
    ...NAV,
    account
      ? { to: ROUTES.placements, label: "My placements" }
      : { to: ROUTES.login, label: "Sign in" },
  ];
  const requests = account?.placements.length ?? 0;
  const initials =
    account?.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "?";
  return (
    <header
      className={styles.bar}
      data-variant={variant}
      data-account={!!account}
    >
      <div className={styles.inner}>
        <Link to={ROUTES.home} className={styles.brand}>
          <BeeMark size={app ? 26 : 30} inverse={app} />
          <span>HappyBee</span>
        </Link>
        {!app && (
          <div className={styles.corner}>
            <a
              href={REPO}
              aria-label="Source code on GitHub"
              title="Source code on GitHub"
            >
              <svg
                aria-hidden="true"
                width="20"
                height="20"
                viewBox="0 0 16 16"
              >
                <path
                  fill="currentColor"
                  d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
                />
              </svg>
              <span>GitHub</span>
            </a>
            <a
              href={SPACE_APPS}
              aria-label="Our NASA Space Apps Challenge 2026 project"
              title="Our NASA Space Apps Challenge 2026 project"
            >
              <svg
                aria-hidden="true"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              >
                <circle cx="12" cy="12" r="5.5" />
                <path d="M6.9 14.4C3.9 16.3 2.2 18.2 2.9 19.3c1 1.600 6.300-.4 11.800-4.400S23.800 6.300 22.800 4.700c-.7-1.100-3.300-.6-6.500.9" />
                <circle cx="19.500" cy="18.500" r=".8" fill="currentColor" />
              </svg>
              <span>NASA Space Apps 2026</span>
            </a>
          </div>
        )}
        <button
          type="button"
          className={styles.menu}
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="sr-only">Menu</span>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 22 22">
            <path
              d={open ? "M5 5l12 12M17 5L5 17" : "M3 7h16M3 15h16"}
              stroke="currentColor"
              strokeWidth="1.8"
            />
          </svg>
        </button>
        <nav
          id="site-nav"
          aria-label="Main"
          className={styles.nav}
          data-open={open}
        >
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              aria-current={path === l.to ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {l.label}
              {l.to === ROUTES.placements && requests > 0 && (
                <span className={styles.count}>
                  {requests}
                  <span className="sr-only"> requested</span>
                </span>
              )}
            </Link>
          ))}
          {account && (
            <Link
              to={ROUTES.account}
              className={styles.who}
              aria-current={path === ROUTES.account ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              <span aria-hidden="true" className={styles.avatar}>
                {initials}
              </span>
              <span className="sr-only">Account: </span>
              <span className={styles.name}>{account.name}</span>
            </Link>
          )}
        </nav>
        {children && <div className={styles.extra}>{children}</div>}
        {!app && (
          <Link to={ROUTES.app} className={styles.enter}>
            <span aria-hidden="true" className="hex" />
            <span>Open the explorer</span>
          </Link>
        )}
      </div>
    </header>
  );
}
