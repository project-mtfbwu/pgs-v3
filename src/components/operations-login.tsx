"use client";

import { FormEvent, useState } from "react";
import styles from "./operations-login.module.css";

export function OperationsLogin({ redirectPath }: { redirectPath: string }) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
        redirect: redirectPath
      })
    });
    const result = await response.json() as { message?: string; redirect?: string };
    if (!response.ok || !result.redirect) {
      setMessage(result.message ?? "Unable to sign in.");
      setSubmitting(false);
      return;
    }
    window.location.assign(result.redirect);
  }

  return (
    <main className={styles.surface}>
      <section className={styles.panel} aria-labelledby="operations-login-title">
        <div className={styles.brand}>
          <span aria-hidden="true">P</span>
          <div>
            <strong>Purple Guide</strong>
            <small>Operations</small>
          </div>
        </div>
        <div className={styles.intro}>
          <p>Internal staff access</p>
          <h1 id="operations-login-title">Sign in to Operations</h1>
          <span>Use your authorized PGS staff identity to continue.</span>
        </div>
        <form onSubmit={submit} className={styles.form}>
          <label>
            Work email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <p className={styles.message} role="status">{message}</p>
          <button type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className={styles.help}>Access is permission-controlled and recorded in the PGS audit system.</p>
      </section>
    </main>
  );
}
