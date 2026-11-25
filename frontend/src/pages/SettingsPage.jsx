import { Info, Languages, LogOut, Palette, Shield, UserRound } from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { useApp } from "../hooks/useApp";
import { logoutUser } from "../services/authApi";

const LANGUAGES = [
  { id: "english", label: "English", native: "English" },
  { id: "hindi", label: "Hindi", native: "हिन्दी" },
  { id: "marathi", label: "Marathi", native: "मराठी" },
];

function SettingsSection({ icon: Icon, title, description, children }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-stone text-forest dark:border-mint/10 dark:bg-forest-deep dark:text-mint">
          <Icon className="size-4" aria-hidden="true" strokeWidth={1.75} />
        </span>
        <div>
          <h2 className="font-editorial text-xl text-ink dark:text-canvas">{title}</h2>
          <p className="mt-1 text-sm text-ink-muted dark:text-mint/60">{description}</p>
        </div>
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
}

export default function SettingsPage() {
  const {
    language,
    setLanguage,
    theme,
    setTheme,
    currentUser,
    authToken,
    clearSessionAuth,
    setView,
    noticeHistory,
  } = useApp();

  async function handleLogout() {
    try {
      if (authToken) await logoutUser(authToken);
    } catch {
      // Still clear local session
    }
    clearSessionAuth();
    setView("dashboard");
  }

  return (
    <div className="mx-auto max-w-2xl slide-up">
      <PageHeader
        eyebrow="Settings"
        title="Preferences"
        description="Profile, language, and appearance. Only real controls are shown."
      />

      <div className="space-y-4">
        <SettingsSection
          icon={UserRound}
          title="Profile"
          description="Identity used across saved notices and Ask Saarthi."
        >
          {currentUser ? (
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/80 bg-stone/40 px-4 py-3 dark:border-mint/10 dark:bg-forest-deep/40">
                <dt className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-faint">
                  Name
                </dt>
                <dd className="mt-1 text-sm font-medium">{currentUser.name || "—"}</dd>
              </div>
              <div className="rounded-xl border border-border/80 bg-stone/40 px-4 py-3 dark:border-mint/10 dark:bg-forest-deep/40">
                <dt className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-faint">
                  Email
                </dt>
                <dd className="mt-1 break-all text-sm font-medium">
                  {currentUser.email || "—"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-ink-muted dark:text-mint/60">
              You are using a local browser session. Sign in to persist notices across devices.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {currentUser ? (
              <Button variant="secondary" onClick={handleLogout}>
                <LogOut className="size-4" aria-hidden="true" strokeWidth={1.75} />
                Sign out
              </Button>
            ) : (
              <Button onClick={() => setView("auth")}>Sign in / Register</Button>
            )}
          </div>
        </SettingsSection>

        <SettingsSection
          icon={Shield}
          title="Account & security"
          description="Session control for your Saarthi account."
        >
          <p className="text-sm leading-relaxed text-ink-muted dark:text-mint/60">
            Password changes and multi-factor authentication are not available in the current API.
            Sign out on shared devices to end this session.
          </p>
          {authToken && (
            <div className="mt-3">
              <Badge tone="mint">Authenticated session active</Badge>
            </div>
          )}
        </SettingsSection>

        <SettingsSection
          icon={Languages}
          title="Language"
          description="Default analysis language for uploads and Ask Saarthi."
        >
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((lang) => (
              <Button
                key={lang.id}
                variant={language === lang.id ? "primary" : "secondary"}
                size="sm"
                onClick={() => setLanguage(lang.id)}
                aria-pressed={language === lang.id}
              >
                {lang.label}
                <span className="opacity-70">({lang.native})</span>
              </Button>
            ))}
          </div>
        </SettingsSection>

        <SettingsSection
          icon={Palette}
          title="Appearance"
          description="Light mode is the default Saarthi experience."
        >
          <div className="flex flex-wrap gap-2">
            <Button
              variant={theme === "light" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setTheme("light")}
              aria-pressed={theme === "light"}
            >
              Light
            </Button>
            <Button
              variant={theme === "dark" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setTheme("dark")}
              aria-pressed={theme === "dark"}
            >
              Dark
            </Button>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={Info}
          title="About Saarthi"
          description="Workspace summary for this browser session."
        >
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/80 px-4 py-3 dark:border-mint/10">
              <dt className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-faint">
                Notices
              </dt>
              <dd className="mt-1 font-editorial text-2xl tabular">{noticeHistory.length}</dd>
            </div>
            <div className="rounded-xl border border-border/80 px-4 py-3 dark:border-mint/10">
              <dt className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-faint">
                Notifications
              </dt>
              <dd className="mt-1 text-sm leading-relaxed text-ink-muted dark:text-mint/60">
                Managed from the top bar when signed in. Preference toggles are not exposed by the
                API yet.
              </dd>
            </div>
          </dl>
        </SettingsSection>
      </div>
    </div>
  );
}
