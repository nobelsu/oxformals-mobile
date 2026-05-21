import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "expire past listings",
  { hours: 1 },
  internal.listings.expirePastListings,
  {},
);

export default crons;
