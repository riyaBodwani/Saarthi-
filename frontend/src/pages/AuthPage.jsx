import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card, CardBody } from "../components/ui/Card";
import { Field, Input } from "../components/ui/Input";
import { useApp } from "../hooks/useApp";
import { fetchCurrentUser, loginUser, registerUser } from "../services/authApi";
import { fetchNotices, mapServerNoticeToLocal } from "../services/noticesApi";

export default function AuthPage() {
  const { setSessionAuth, setNoticeHistory, setView } = useApp();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "register") {
        await registerUser({ name: name.trim(), email: email.trim(), password });
      }
      const tokenResponse = await loginUser({
        email: email.trim(),
        password,
      });
      const token = tokenResponse.access_token;
      const user = await fetchCurrentUser(token);
      setSessionAuth(token, user);
      try {
        const notices = await fetchNotices(token, { sort: "newest" });
        const mapped = (Array.isArray(notices) ? notices : notices?.items || []).map(
          mapServerNoticeToLocal
        );
        setNoticeHistory(mapped);
      } catch {
        // Keep session history if sync fails
      }
      setView("dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md slide-up">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-5 flex size-12 items-center justify-center rounded-2xl bg-forest text-mint shadow-[var(--shadow-soft)] dark:bg-mint dark:text-forest">
          <Sparkles className="size-5" aria-hidden="true" strokeWidth={1.75} />
        </span>
        <h2 className="font-editorial text-[2.15rem] text-ink dark:text-canvas">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h2>
        <p className="mt-2.5 text-sm leading-relaxed text-ink-muted dark:text-mint/60">
          Save notices permanently and use Ask Saarthi across sessions.
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="flex border-b border-border/70 dark:border-mint/10">
          <button
            type="button"
            className={`flex-1 px-4 py-3.5 text-sm font-medium transition-colors duration-150 ${
              mode === "login"
                ? "border-b-2 border-forest text-forest dark:border-mint dark:text-mint"
                : "text-ink-faint hover:text-ink dark:text-mint/50 dark:hover:text-canvas"
            }`}
            onClick={() => {
              setMode("login");
              setError("");
            }}
            aria-pressed={mode === "login"}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`flex-1 px-4 py-3.5 text-sm font-medium transition-colors duration-150 ${
              mode === "register"
                ? "border-b-2 border-forest text-forest dark:border-mint dark:text-mint"
                : "text-ink-faint hover:text-ink dark:text-mint/50 dark:hover:text-canvas"
            }`}
            onClick={() => {
              setMode("register");
              setError("");
            }}
            aria-pressed={mode === "register"}
          >
            Register
          </button>
        </div>
        <CardBody className="py-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === "register" && (
              <Field label="Name">
                <Input
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                />
              </Field>
            )}
            <Field label="Email">
              <Input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@college.edu"
              />
            </Field>
            <Field label="Password" hint="At least 8 characters">
              <Input
                required
                type="password"
                minLength={8}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
              />
            </Field>
            {error && (
              <p
                role="alert"
                className="rounded-xl border border-danger/20 bg-danger-soft px-3 py-2.5 text-sm text-danger"
              >
                {error}
              </p>
            )}
            <Button className="w-full" disabled={busy} type="submit">
              {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
