import { useState, type ReactNode } from "react";
import { useAccount } from "../account/session";
import { BeeMark } from "./BeeMark";
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
    <header className={styles.bar} data-variant={variant}>
      <div className={styles.inner}>
        <Link to={ROUTES.home} className={styles.brand}>
          <BeeMark size={app ? 26 : 30} inverse={app} />
          <span>Pollination Marketplace</span>
        </Link>
        {!app && (
          <span className={`${styles.tagline} mono`}>
            A season atlas from NASA Earth data
          </span>
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
