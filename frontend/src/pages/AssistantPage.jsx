import { useEffect, useRef, useState } from "react";
import { Bot, Send } from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { useApp } from "../hooks/useApp";
import {
  clearConversation,
  createConversation,
  getConversation,
  sendAssistantMessage,
} from "../services/assistantApi";
import { SimpleMarkdown } from "../utils/simpleMarkdown";

const SUGGESTIONS = [
  "What is the registration deadline?",
  "Which documents are required?",
  "Summarize the most important points.",
  "Am I eligible according to this notice?",
];

export default function AssistantPage() {
  const {
    authToken,
    noticeHistory,
    assistantNoticeId,
    setAssistantNoticeId,
    language,
    setLanguage,
    setView,
  } = useApp();
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  const selectedNotice =
    noticeHistory.find((item) => item.id === assistantNoticeId) || null;

  useEffect(() => {
    if (!assistantNoticeId && noticeHistory[0]) {
      setAssistantNoticeId(noticeHistory[0].id);
    }
  }, [assistantNoticeId, noticeHistory, setAssistantNoticeId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  if (!authToken) {
    return (
      <EmptyState
        icon={Bot}
        title="Sign in to Ask Saarthi"
        description="The assistant needs a saved notice and an authenticated session so answers stay grounded and private."
        actionLabel="Sign in"
        onAction={() => setView("auth")}
      />
    );
  }

  if (noticeHistory.length === 0) {
    return (
      <EmptyState
        icon={Bot}
        title="No notices available"
        description="Upload and save a notice first. Ask Saarthi only answers from your document context."
        actionLabel="Upload notice"
        onAction={() => setView("upload")}
      />
    );
  }

  async function ensureConversation() {
    if (conversationId) return conversationId;
    const created = await createConversation(authToken, {
      noticeId: assistantNoticeId,
      title: selectedNotice?.title || "Notice chat",
    });
    setConversationId(created.id);
    return created.id;
  }

  async function handleSend(event) {
    event?.preventDefault?.();
    if (!input.trim() || busy) return;
    setBusy(true);
    setError("");
    const content = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content }]);
    try {
      const id = await ensureConversation();
      const response = await sendAssistantMessage(authToken, id, {
        content,
        language,
      });
      const assistantMessage =
        response.message || response.assistant_message || response;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: assistantMessage.content || assistantMessage.message || "",
          sources: assistantMessage.sources || response.sources || [],
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message.");
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    try {
      await clearConversation(authToken, conversationId);
      const refreshed = await getConversation(authToken, conversationId);
      setMessages(refreshed.messages || []);
    } catch {
      setMessages([]);
    }
  }

  function onComposerKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend(event);
    }
  }

  return (
    <div className="slide-up">
      <PageHeader
        eyebrow="Ask Saarthi"
        title="Document intelligence"
        description="Answers use only the selected notice. Missing facts are stated clearly."
        actions={
          <div className="flex flex-wrap gap-2">
            <select
              className="ui-input h-9 w-auto"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              aria-label="Response language"
            >
              <option value="english">English</option>
              <option value="hindi">Hindi</option>
              <option value="marathi">Marathi</option>
            </select>
            <Button variant="secondary" size="sm" onClick={handleClear}>
              Clear
            </Button>
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <Card className="h-fit lg:sticky lg:top-24">
          <CardHeader>
            <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">
              Notice context
            </h2>
          </CardHeader>
          <CardBody className="space-y-1.5">
            {noticeHistory.map((notice) => (
              <button
                key={notice.id}
                type="button"
                onClick={() => {
                  setAssistantNoticeId(notice.id);
                  setConversationId(null);
                  setMessages([]);
                }}
                className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors duration-150 ${
                  assistantNoticeId === notice.id
                    ? "bg-stone font-medium text-forest dark:bg-mint/10 dark:text-mint"
                    : "text-ink-muted hover:bg-stone/60 dark:hover:bg-forest-deep"
                }`}
              >
                <span className="line-clamp-2">{notice.title}</span>
              </button>
            ))}
          </CardBody>
        </Card>

        <Card className="flex min-h-[34rem] flex-col overflow-hidden">
          <CardBody className="flex flex-1 flex-col gap-0 p-0 sm:p-0">
            <div className="flex-1 space-y-4 overflow-auto px-5 py-5 sm:px-6">
              {messages.length === 0 && (
                <div className="mx-auto max-w-lg space-y-5 py-8 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-border/80 bg-stone text-forest dark:border-mint/12 dark:bg-forest-deep dark:text-mint">
                    <Bot className="size-5" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="font-editorial text-2xl text-ink dark:text-canvas">
                      Ask with confidence
                    </p>
                    <p className="mt-2 text-sm text-ink-muted dark:text-mint/60">
                      Deadlines, documents, eligibility, or key instructions — grounded in{" "}
                      <span className="font-medium text-ink dark:text-canvas">
                        {selectedNotice?.title || "the selected notice"}
                      </span>
                      .
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        className="rounded-full border border-border/80 px-3.5 py-1.5 text-xs font-medium text-ink-muted transition-colors duration-150 hover:border-border-strong hover:bg-stone hover:text-ink dark:border-mint/12 dark:hover:bg-mint/10"
                        onClick={() => setInput(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`max-w-[40rem] ${message.role === "user" ? "ml-auto" : ""}`}
                >
                  {message.role === "assistant" && (
                    <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-faint">
                      Saarthi
                    </p>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-3.5 text-sm leading-relaxed ${
                      message.role === "user"
                        ? "bg-forest text-canvas dark:bg-mint dark:text-forest"
                        : "border border-border/80 bg-surface text-ink dark:border-mint/10 dark:bg-forest-deep/50 dark:text-canvas"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <div className="prose-saarthi">
                        <SimpleMarkdown content={message.content} />
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                    {Array.isArray(message.sources) && message.sources.length > 0 && (
                      <div className="mt-3 space-y-1.5 border-t border-border/50 pt-3 dark:border-mint/10">
                        {message.sources.map((source, sourceIndex) => (
                          <p key={sourceIndex} className="text-xs leading-relaxed opacity-90">
                            <Badge tone="neutral">Source</Badge>{" "}
                            {source.evidence_snippet || source.snippet || source}
                            {source.page_number ? ` (p. ${source.page_number})` : ""}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="w-44 rounded-2xl border border-border/80 px-4 py-3 dark:border-mint/10">
                  <div className="skeleton h-3 w-28" />
                  <div className="skeleton mt-2 h-3 w-16" />
                </div>
              )}
              <div ref={endRef} />
            </div>

            {error && (
              <p role="alert" className="px-5 pb-2 text-sm text-danger sm:px-6">
                {error}
                <button
                  type="button"
                  className="ml-2 font-medium underline"
                  onClick={() => setError("")}
                >
                  Dismiss
                </button>
              </p>
            )}

            <form
              className="border-t border-border/70 bg-surface/95 p-4 dark:border-mint/10 dark:bg-forest/70 sm:p-5"
              onSubmit={handleSend}
            >
              {selectedNotice && (
                <p className="mb-2 truncate text-[11px] text-ink-faint dark:text-mint/45">
                  Context · {selectedNotice.title}
                </p>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={onComposerKeyDown}
                  placeholder="Ask about the selected notice…"
                  rows={2}
                  className="ui-input min-h-[2.75rem] flex-1 resize-none"
                  disabled={busy}
                  aria-label="Message"
                />
                <Button type="submit" disabled={busy || !input.trim()} className="shrink-0">
                  <Send className="size-4" strokeWidth={1.75} />
                  Send
                </Button>
              </div>
              <p className="mt-2 text-[10px] text-ink-faint dark:text-mint/40">
                Enter to send · Shift+Enter for a new line
              </p>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
