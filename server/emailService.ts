import { storage } from "./storage.js";

type DeadlineReminderResult = {
  checked: number;
  dueSoon: number;
  sent: number;
  skipped: string;
};

export async function sendDeadlineReminders(): Promise<DeadlineReminderResult> {
  const stories = await storage.getStories();
  const now = Date.now();
  const nextDay = now + 24 * 60 * 60 * 1000;

  const dueSoon = stories.filter((story: any) => {
    if (!story.dueDate) return false;
    const dueAt = new Date(story.dueDate).getTime();
    return Number.isFinite(dueAt) && dueAt >= now && dueAt <= nextDay;
  });

  return {
    checked: stories.length,
    dueSoon: dueSoon.length,
    sent: 0,
    skipped: "Email transport is not configured",
  };
}
