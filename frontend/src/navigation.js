export const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", path: "dashboard" },
  { id: "upload", label: "Upload Notice", path: "upload" },
  { id: "notices", label: "My Notices", path: "notices" },
  { id: "assistant", label: "AI Assistant", path: "assistant" },
  { id: "calendar", label: "Calendar", path: "calendar" },
  { id: "settings", label: "Settings", path: "settings" },
];

export const PAGE_META = {
  dashboard: {
    title: "Dashboard",
    breadcrumb: "Overview",
    description: "Your notice activity at a glance.",
  },
  upload: {
    title: "Upload Notice",
    breadcrumb: "Workspace",
    description: "Extract and analyze college notices.",
  },
  analysis: {
    title: "Analysis",
    breadcrumb: "Document intelligence",
    description: "Evidence-grounded summary, dates, and actions.",
  },
  notices: {
    title: "My Notices",
    breadcrumb: "Library",
    description: "Notices analyzed in this session.",
  },
  assistant: {
    title: "AI Assistant",
    breadcrumb: "Ask Saarthi",
    description: "Ask grounded questions about your notices.",
  },
  calendar: {
    title: "Calendar",
    breadcrumb: "Deadlines",
    description: "Important dates from analyzed notices.",
  },
  settings: {
    title: "Settings",
    breadcrumb: "Preferences",
    description: "Language, theme, and workspace preferences.",
  },
  auth: {
    title: "Account",
    breadcrumb: "Sign in",
    description: "Register or sign in to save notices permanently.",
  },
};

export function isValidView(view) {
  return Boolean(PAGE_META[view]);
}
