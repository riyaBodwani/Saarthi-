import { useApp } from "../../hooks/useApp";
import { AppSidebar } from "./AppSidebar";
import { AppTopBar } from "./AppTopBar";
import DashboardPage from "../../pages/DashboardPage";
import UploadPage from "../../pages/UploadPage";
import AnalysisPage from "../../pages/AnalysisPage";
import NoticesPage from "../../pages/NoticesPage";
import AssistantPage from "../../pages/AssistantPage";
import CalendarPage from "../../pages/CalendarPage";
import SettingsPage from "../../pages/SettingsPage";
import AuthPage from "../../pages/AuthPage";

const VIEWS = {
  dashboard: DashboardPage,
  upload: UploadPage,
  analysis: AnalysisPage,
  notices: NoticesPage,
  assistant: AssistantPage,
  calendar: CalendarPage,
  settings: SettingsPage,
  auth: AuthPage,
};

export function AppShell() {
  const { view } = useApp();
  const Page = VIEWS[view] || DashboardPage;
  const wide = view === "analysis" || view === "assistant" || view === "calendar";

  return (
    <div className="min-h-screen text-ink dark:text-canvas">
      <div className="flex min-h-screen">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopBar />
          <main className="flex-1 px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
            <div className={`${wide ? "page-frame-wide" : "page-frame"} fade-in`}>
              <Page />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default AppShell;
