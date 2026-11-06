import nodemailer, { type Transporter } from "nodemailer";
import { storage } from "./storage.js";

type DeadlineReminderResult = {
  checked: number;
  dueSoon: number;
  sent: number;
  skipped: string;
};

let transporter: Transporter | null = null;

export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter(): Transporter {
  if (!transporter) {
    const port = parseInt(process.env.SMTP_PORT || "465", 10);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

export async function sendEmail(opts: { to: string; subject: string; text: string; replyTo?: string }) {
  if (!isEmailConfigured()) {
    throw new Error("Email is not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS)");
  }
  return getTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    replyTo: opts.replyTo,
  });
}

export async function sendDeadlineReminders(): Promise<DeadlineReminderResult> {
  const stories = await storage.getStories();
  const dueSoon = await storage.getStoriesWithUpcomingDeadlines(24);

  if (!isEmailConfigured()) {
    return { checked: stories.length, dueSoon: dueSoon.length, sent: 0, skipped: "Email transport is not configured" };
  }

  let sent = 0;
  let skipped = 0;
  for (const story of dueSoon) {
    const assignee = story.assignedTo ? await storage.getUser(story.assignedTo) : undefined;
    if (!assignee?.email) {
      skipped++;
      continue;
    }
    try {
      await sendEmail({
        to: assignee.email,
        subject: `Deadline reminder: ${story.title}`,
        text: `Hi ${assignee.firstName || "there"},\n\n"${story.title}" is due ${new Date(story.dueDate).toLocaleString("en-US")}.\n\nStatus: ${story.status}`,
      });
      sent++;
    } catch (err) {
      console.error("Deadline reminder failed for story", story.id, err);
      skipped++;
    }
  }

  return { checked: stories.length, dueSoon: dueSoon.length, sent, skipped: `${skipped} without assignee email or failed` };
}

// Built-in daily scheduler so deadline reminders need no external cron. Runs once per day at/after 09:00 server time.
let lastReminderDay = "";
export function startDeadlineScheduler() {
  if (!isEmailConfigured()) {
    console.log("Scheduler: email not configured, deadline reminders disabled");
    return;
  }
  const tick = async () => {
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    if (now.getHours() < 9 || lastReminderDay === day) return;
    lastReminderDay = day;
    try {
      const result = await sendDeadlineReminders();
      console.log("Scheduler: deadline reminders", result);
    } catch (err) {
      console.error("Scheduler: deadline reminders failed", err);
    }
  };
  setInterval(tick, 60 * 60 * 1000).unref();
  void tick();
}
