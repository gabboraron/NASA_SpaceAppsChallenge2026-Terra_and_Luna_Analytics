import { useState, type FormEvent } from "react";
import { signIn } from "../../account/session";
import { Link, ROUTES } from "../../site/router";
import { AuthShell } from "./AuthShell";
import styles from "./Auth.module.css";
import { useAfterSignIn } from "./shared";

/** Mock sign-in; also shown in place of a page that needs an account. */
export function LoginPage() {
  const done = useAfterSignIn();
  const [email, setEmail] = useState("");
  const [unknown, setUnknown] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (signIn(email)) done();
    else setUnknown(true);
  };

  return (
    <AuthShell mode="login" heading="Welcome back" onDone={done}>
      <form className={styles.form} onSubmit={submit}>
        <label className={styles.field}>
          Email
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            aria-invalid={unknown}
            aria-describedby={unknown ? "login-error" : undefined}
            onChange={(e) => {
              setEmail(e.target.value);
              setUnknown(false);
            }}
          />
        </label>
        <label className={styles.field}>
          Password
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            aria-describedby="auth-note"
          />
        </label>
        {unknown && (
          <p id="login-error" role="alert" className={styles.error}>
            No account with this email in this browser.{" "}
            <Link to={ROUTES.register}>Register</Link> to create one.
          </p>
        )}
        <button type="submit" className={styles.submit}>
          Sign in
        </button>
      </form>
    </AuthShell>
  );
}
