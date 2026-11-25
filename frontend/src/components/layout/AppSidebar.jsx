import { useEffect } from "react";
import {
  Bot,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Moon,
  Settings,
  Sparkles,
  Sun,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { NAV_ITEMS } from "../../navigation";
import { useApp } from "../../hooks/useApp";
import { Tooltip } from "../ui/Tooltip";

const ICONS = {
  dashboard: LayoutDashboard,
  upload: Upload,
  notices: FileText,
  assistant: Bot,
  calendar: CalendarDays,
  settings: Settings,
};

const LANGUAGES = [
  { id: "english", label: "EN" },
  { id: "hindi", label: "HI" },
  { id: "marathi", label: "MR" },
];

function SidebarContent({ collapsed, onNavigate, showClose }) {
  const {
    view,
    language,
    setLanguage,
    theme,
    toggleTheme,
    setMobileNavOpen,
    setSidebarCollapsed,
    currentUser,
  } = useApp();

  return (
    <div className="flex h-full flex-col">
      <div
        className={`flex items-center gap-3 ${collapsed ? "justify-center px-1" : "px-2"} pb-6 pt-1`}
      >
        <button
          type="button"
          onClick={() => onNavigate("dashboard")}
          className="group flex min-w-0 items-center gap-3"
          aria-label="Saarthi home"
        >
          <span className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-forest text-mint transition-transform duration-150 group-hover:scale-[1.02] dark:bg-mint dark:text-forest">
            <Sparkles className="size-4" aria-hidden="true" strokeWidth={1.75} />
          </span>
          {!collapsed && (
            <span className="min-w-0 text-left">
              <span className="block font-editorial text-xl leading-none text-ink dark:text-canvas">
                Saarthi
              </span>
              <span className="mt-1 block truncate text-[11px] text-ink-faint dark:text-mint/50">
                Academic intelligence
              </span>
            </span>
          )}
        </button>
        {showClose && (
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="ml-auto rounded-lg p-2 text-ink-muted transition-colors hover:bg-stone hover:text-ink lg:hidden dark:hover:bg-forest-deep"
            aria-label="Close navigation"
          >
            <X className="size-5" strokeWidth={1.75} />
          </button>
        )}
      </div>

      <nav aria-label="Main" className="flex-1 space-y-0.5 px-1">
        {!collapsed && (
          <p className="px-3 pb-2.5 text-[10px] font-medium uppercase tracking-[0.16em] text-ink-faint dark:text-mint/40">
            Workspace
          </p>
        )}
        {NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.id];
          const active = view === item.id;
          const button = (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={active ? "page" : undefined}
              className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150 ${
                collapsed ? "justify-center" : ""
              } ${
                active
                  ? "bg-stone font-medium text-forest dark:bg-mint/10 dark:text-mint"
                  : "font-normal text-ink-muted hover:bg-stone/70 hover:text-ink dark:text-mint/60 dark:hover:bg-forest-deep dark:hover:text-canvas"
              }`}
            >
              {active && !collapsed && (
                <span
                  className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-forest dark:bg-mint"
                  aria-hidden="true"
                />
              )}
              <Icon className="size-4 shrink-0" aria-hidden="true" strokeWidth={1.75} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
          return collapsed ? (
            <Tooltip key={item.id} label={item.label}>
              {button}
            </Tooltip>
          ) : (
            button
          );
        })}
      </nav>

      <div
        className={`mt-4 space-y-3 border-t border-border/80 pt-4 dark:border-mint/10 ${collapsed ? "px-1" : "px-2"}`}
      >
        {!collapsed && (
          <button
            type="button"
            onClick={() => onNavigate(currentUser ? "settings" : "auth")}
            className="w-full rounded-xl border border-border/80 bg-surface p-3 text-left transition-colors duration-150 hover:bg-stone/60 dark:border-mint/10 dark:bg-forest-deep/40 dark:hover:bg-forest-deep"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-forest text-[11px] font-semibold text-mint dark:bg-mint dark:text-forest">
                {(currentUser?.name || "S").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink dark:text-canvas">
                  {currentUser?.name || "Student"}
                </p>
                <p className="truncate text-[11px] text-ink-faint dark:text-mint/50">
                  {currentUser?.email || "Local workspace · Sign in"}
                </p>
              </div>
            </div>
          </button>
        )}

        {collapsed && (
          <Tooltip label={currentUser?.name || "Account"}>
            <button
              type="button"
              onClick={() => onNavigate(currentUser ? "settings" : "auth")}
              className="mx-auto flex size-9 items-center justify-center rounded-xl border border-border/80 bg-surface dark:border-mint/10 dark:bg-forest-deep"
              aria-label="Account"
            >
              <UserRound className="size-4" strokeWidth={1.75} />
            </button>
          </Tooltip>
        )}

        <div
          className={`flex ${collapsed ? "flex-col items-center" : "items-center justify-between"} gap-2`}
        >
          <div
            role="group"
            aria-label="Language preference"
            className={`inline-flex rounded-lg border border-border/80 bg-surface p-0.5 dark:border-mint/12 dark:bg-forest-deep/50 ${collapsed ? "flex-col" : ""}`}
          >
            {LANGUAGES.map((lang) => (
              <button
                key={lang.id}
                type="button"
                aria-pressed={language === lang.id}
                onClick={() => setLanguage(lang.id)}
                className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors duration-150 ${
                  language === lang.id
                    ? "bg-forest text-canvas dark:bg-mint dark:text-forest"
                    : "text-ink-faint hover:text-ink dark:text-mint/50"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          <Tooltip label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex size-8 items-center justify-center rounded-lg border border-border/80 bg-surface text-ink-muted transition-colors duration-150 hover:bg-stone hover:text-ink dark:border-mint/12 dark:bg-forest-deep dark:text-mint dark:hover:bg-forest"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? (
                <Moon className="size-3.5" strokeWidth={1.75} />
              ) : (
                <Sun className="size-3.5" strokeWidth={1.75} />
              )}
            </button>
          </Tooltip>
        </div>

        <button
          type="button"
          onClick={() => setSidebarCollapsed((value) => !value)}
          className="hidden w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-ink-faint transition-colors duration-150 hover:bg-stone hover:text-ink lg:flex dark:hover:bg-forest-deep dark:hover:text-canvas"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="size-4" strokeWidth={1.75} />
          ) : (
            <ChevronLeft className="size-4" strokeWidth={1.75} />
          )}
          {!collapsed && "Collapse"}
        </button>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const { setView, sidebarCollapsed, mobileNavOpen, setMobileNavOpen } = useApp();

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape" && mobileNavOpen) setMobileNavOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen, setMobileNavOpen]);

  return (
    <>
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border/70 bg-surface/80 p-3.5 backdrop-blur-xl transition-[width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] lg:flex dark:border-mint/10 dark:bg-forest/80 ${
          sidebarCollapsed ? "w-[4.5rem]" : "w-60 xl:w-64"
        }`}
      >
        <SidebarContent collapsed={sidebarCollapsed} onNavigate={setView} />
      </aside>

      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <div
            className="absolute inset-0 bg-forest-deep/40 backdrop-blur-[2px]"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 flex h-full w-72 max-w-[86vw] flex-col border-r border-border bg-surface p-4 shadow-[var(--shadow-lift)] scale-in dark:border-mint/10 dark:bg-forest">
            <SidebarContent collapsed={false} onNavigate={setView} showClose />
          </div>
        </div>
      )}
    </>
  );
}

export default AppSidebar;
