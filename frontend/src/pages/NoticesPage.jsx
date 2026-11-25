import { useMemo, useState } from "react";
import { FileText, LayoutGrid, List, Star, Trash2, Upload } from "lucide-react";
import { useApp } from "../hooks/useApp";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Field, Input, Select } from "../components/ui/Input";
import { NoticeCard } from "../components/ui/NoticeCard";
import { PageHeader } from "../components/ui/PageHeader";

export default function NoticesPage() {
  const {
    noticeHistory,
    setView,
    openNoticeAnalysis,
    removeNotice,
    renameNotice,
    toggleFavorite,
  } = useApp();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [category, setCategory] = useState("all");
  const [urgency, setUrgency] = useState("all");
  const [layout, setLayout] = useState("list");

  const categories = useMemo(() => {
    const values = new Set(noticeHistory.map((item) => item.category || "Notice"));
    return ["all", ...Array.from(values)];
  }, [noticeHistory]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    let items = [...noticeHistory];
    if (normalized) {
      items = items.filter((notice) => {
        const haystack = [
          notice.title,
          notice.filename,
          notice.summary,
          notice.extraction?.text,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalized);
      });
    }
    if (category !== "all") {
      items = items.filter((notice) => (notice.category || "Notice") === category);
    }
    if (urgency !== "all") {
      items = items.filter(
        (notice) => (notice.analysis?.overall_urgency || "unknown") === urgency
      );
    }
    items.sort((a, b) => {
      const aTime = new Date(a.uploadedAt).getTime();
      const bTime = new Date(b.uploadedAt).getTime();
      return sort === "oldest" ? aTime - bTime : bTime - aTime;
    });
    return items;
  }, [noticeHistory, query, sort, category, urgency]);

  if (noticeHistory.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No notices yet"
        description="Analyzed notices appear here. Sign in later to keep them permanently."
        actionLabel="Upload Notice"
        onAction={() => setView("upload")}
      />
    );
  }

  return (
    <div className="space-y-5 slide-up">
      <PageHeader
        eyebrow="Library"
        title="My Notices"
        description={`${filtered.length} of ${noticeHistory.length} notices in your workspace`}
        actions={
          <Button size="sm" onClick={() => setView("upload")}>
            <Upload className="size-3.5" strokeWidth={1.75} />
            Add notice
          </Button>
        }
      />

      <div className="surface-card p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Field label="Search" className="xl:col-span-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Title or content"
            />
          </Field>
          <Field label="Category">
            <Select value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Urgency">
            <Select value={urgency} onChange={(event) => setUrgency(event.target.value)}>
              {["all", "overdue", "due_today", "urgent", "upcoming", "later", "unknown"].map(
                (value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                )
              )}
            </Select>
          </Field>
          <Field label="Sort">
            <Select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </Select>
          </Field>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button
            size="sm"
            variant={layout === "list" ? "soft" : "ghost"}
            onClick={() => setLayout("list")}
            aria-pressed={layout === "list"}
          >
            <List className="size-3.5" />
            List
          </Button>
          <Button
            size="sm"
            variant={layout === "grid" ? "soft" : "ghost"}
            onClick={() => setLayout("grid")}
            aria-pressed={layout === "grid"}
          >
            <LayoutGrid className="size-3.5" />
            Grid
          </Button>
        </div>
      </div>

      <div
        className={
          layout === "grid"
            ? "grid gap-3 sm:grid-cols-2"
            : "space-y-3"
        }
      >
        {filtered.map((notice) => (
          <NoticeCard
            key={notice.id}
            notice={notice}
            onOpen={openNoticeAnalysis}
            actions={
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => toggleFavorite(notice.id)}
                >
                  <Star className="size-3.5" />
                  {notice.favorite ? "Unfavorite" : "Favorite"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const next = window.prompt("Rename notice", notice.title);
                    if (next && next.trim()) renameNotice(notice.id, next.trim());
                  }}
                >
                  Rename
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (window.confirm("Delete this notice from the library?")) {
                      removeNotice(notice.id);
                    }
                  }}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              </>
            }
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <EmptyState
          icon={FileText}
          title="No matches"
          description="Try a different search or clear filters."
          actionLabel="Clear filters"
          onAction={() => {
            setQuery("");
            setCategory("all");
            setUrgency("all");
          }}
        />
      )}
    </div>
  );
}
