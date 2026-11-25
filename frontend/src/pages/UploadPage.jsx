import NoticeUpload from "../components/NoticeUpload";
import { PageHeader } from "../components/ui/PageHeader";
import { useApp } from "../hooks/useApp";

export default function UploadPage() {
  const { language, setLanguage, recordNoticeAnalysis } = useApp();

  return (
    <div className="slide-up">
      <PageHeader
        eyebrow="Upload"
        title="Upload notice"
        description="Drop a PDF or notice photo. Saarthi extracts text and prepares a clear analysis."
      />
      <NoticeUpload
        language={language}
        onLanguageChange={setLanguage}
        onAnalysisComplete={recordNoticeAnalysis}
      />
    </div>
  );
}
