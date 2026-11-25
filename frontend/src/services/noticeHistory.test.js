import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getDashboardStats } from "./noticeHistory.js";

describe("getDashboardStats", () => {
  it("returns zeros for an empty history", () => {
    const stats = getDashboardStats([], new Date("2026-11-24T10:00:00+05:30"));
    assert.equal(stats.totalNotices, 0);
    assert.equal(stats.upcomingDeadlineCount, 0);
    assert.equal(stats.pendingActions, 0);
    assert.equal(stats.noticesThisMonth, 0);
    assert.deepEqual(stats.upcomingDeadlines, []);
    assert.deepEqual(stats.recentNotices, []);
    assert.deepEqual(stats.categoryCounts, {});
  });

  it("aggregates real session notices without fabricating values", () => {
    const history = [
      {
        id: "1",
        title: "Exam form notice",
        category: "Examination",
        uploadedAt: "2026-11-10T08:00:00.000Z",
        actionItems: ["Submit form", "Pay fee"],
        importantDates: [
          {
            type: "deadline",
            label: "Submit by",
            normalized_date: "2026-11-30",
            original_date: "30 Nov 2026",
            urgency: "upcoming",
            days_remaining: 6,
          },
          {
            type: "event",
            label: "Exam day",
            normalized_date: "2026-12-15",
            urgency: null,
          },
        ],
      },
      {
        id: "2",
        title: "Scholarship circular",
        category: "Scholarship",
        uploadedAt: "2026-10-01T08:00:00.000Z",
        actionItems: ["Attach documents"],
        importantDates: [
          {
            type: "deadline",
            label: "Apply by",
            normalized_date: "2026-10-05",
            urgency: "overdue",
            days_remaining: -20,
          },
        ],
      },
    ];

    const stats = getDashboardStats(history, new Date("2026-11-24T10:00:00+05:30"));
    assert.equal(stats.totalNotices, 2);
    assert.equal(stats.pendingActions, 3);
    assert.equal(stats.noticesThisMonth, 1);
    assert.equal(stats.upcomingDeadlineCount, 1);
    assert.equal(stats.upcomingDeadlines[0].noticeTitle, "Exam form notice");
    assert.deepEqual(stats.categoryCounts, {
      Examination: 1,
      Scholarship: 1,
    });
  });
});
