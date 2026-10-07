import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "expire past listings",
  { hours: 1 },
  internal.listings.expirePastListings,
  {},
);

crons.interval(
  "pay hosts their credits",
  { hours: 1 },
  internal.credits.settleDueHolds,
  {},
);

// Retention limits promised in the privacy policy (see convex/retention.ts).
crons.cron(
  "enforce retention limits",
  "30 3 * * *",
  internal.retention.runDaily,
  {},
);

// 08:00 and 09:00 UTC: whichever is 09:00 in London sends the reminders.
crons.cron(
  "formal tomorrow reminders",
  "0 8,9 * * *",
  internal.notifications.sendFormalReminders,
  {},
);

crons.cron(
  "delete old notifications",
  "45 3 * * *",
  internal.notifications.pruneOldNotifications,
  {},
);

crons.cron(
  "refresh landing stats",
  "15 3 * * *",
  internal.siteStats.recompute,
  {},
);

export default crons;
