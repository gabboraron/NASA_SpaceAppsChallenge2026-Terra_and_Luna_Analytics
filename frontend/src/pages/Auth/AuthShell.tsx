import type { ReactNode } from "react";
import { signInDemo } from "../../account/session";
import { CuteBee } from "../../site/CuteBee";
import { SiteFooter } from "../../site/SiteFooter";
import { SiteHeader } from "../../site/SiteHeader";
import { Link, ROUTES } from "../../site/router";
import page from "../../site/page.module.css";
import styles from "./Auth.module.css";
import { useAfterSignIn } from "./shared";

const DEMO_NOTE =
  "Demo sign-in: accounts live only in this browser, the password is not stored or checked, nothing is sent to a server.";

const STEPS = [
  "Draw your home parcel",
  "Pick the honey you want to make",
  "Price the move and request the parcel for a period",
];

type Props = {
  mode: "login" | "register";
  heading: string;
  /** The form's fields, error and submit button. */
  children: ReactNode;
};

/** Sign-in and register share one layout: the pitch on the left, the card on the right. */
export function AuthShell({ mode, heading, children }: Props) {
  const done = useAfterSignIn();
  const tab = (to: string, label: string, on: boolean) => (
    <Link to={to} aria-current={on ? "page" : undefined}>
      {label}
    </Link>
  );
  return (
    <div className={page.page}>
      <SiteHeader />
      <main className={styles.main}>
        <div className={styles.split}>
          <section className={styles.pitch}>
            <span className={page.mascot}>
              <CuteBee pose="heart" />
            </span>
            <span className={page.kicker}>For migratory beekeepers</span>
            <h1 className={styles.title}>
              Put your apiary on the map. See where the bloom is.
            </h1>
            <p className={page.lead}>
              Draw the parcel where your hives stand. Its bloom is modelled at
              that spot from NASA weather, and every listed parcel is priced as
              a move from there, with your own fuel and labour costs.
            </p>
            <ol className={styles.steps}>
              {STEPS.map((s, i) => (
                <li key={s}>
                  <span aria-hidden="true" className={`hex ${page.hexNum}`}>
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          </section>

          <section className={styles.card} aria-labelledby="auth-h">
            <nav aria-label="Account" className={styles.tabs}>
              {tab(ROUTES.login, "Sign in", mode === "login")}
              {tab(ROUTES.register, "Register", mode === "register")}
            </nav>
            <h2 id="auth-h" className={styles.heading}>
              {heading}
            </h2>
            <button
              type="button"
              className={styles.demo}
              onClick={() => {
                signInDemo();
                done();
              }}
            >
              <span aria-hidden="true" className="hex" />
              Continue as demo beekeeper
            </button>
            <p className={styles.hint}>
              No typing: a ready-made beekeeper with a home apiary.
            </p>
            <p className={styles.or}>
              {mode === "login" ? "or with your account" : "or create your own"}
            </p>
            {children}
            <p id="auth-note" role="note" className={styles.note}>
              {DEMO_NOTE}
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
