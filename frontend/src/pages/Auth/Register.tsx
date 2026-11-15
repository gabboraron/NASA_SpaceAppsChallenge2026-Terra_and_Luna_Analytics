import { useState, type FormEvent } from "react";
import { register } from "../../account/session";
import { Link, ROUTES } from "../../site/router";
import { AuthShell } from "./AuthShell";
import styles from "./Auth.module.css";
import { useAfterSignIn } from "./shared";

/** Mock registration: creates an account in this browser and signs in. */
export function RegisterPage() {
  const done = useAfterSignIn();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [taken, setTaken] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (register(name, email)) done();
    else setTaken(true);
  };

  return (
    <AuthShell mode="register" heading="Create your account">
      <form className={styles.form} onSubmit={submit}>
        <label className={styles.field}>
          Name
          <input
            type="text"
            name="name"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          Email
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            aria-invalid={taken}
            aria-describedby={taken ? "register-error" : undefined}
            onChange={(e) => {
              setEmail(e.target.value);
              setTaken(false);
            }}
          />
        </label>
        <label className={styles.field}>
          Password
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            aria-describedby="auth-note"
          />
        </label>
        {taken && (
          <p id="register-error" role="alert" className={styles.error}>
            An account with this email already exists in this browser.{" "}
            <Link to={ROUTES.login}>Sign in</Link> instead.
          </p>
        )}
        <button type="submit" className={styles.submit}>
          Register
        </button>
      </form>
    </AuthShell>
  );
}
