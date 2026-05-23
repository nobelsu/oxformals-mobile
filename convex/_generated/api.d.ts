/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as AdminEmail from "../AdminEmail.js";
import type * as DevEmail from "../DevEmail.js";
import type * as ResendOTP from "../ResendOTP.js";
import type * as TestEmail from "../TestEmail.js";
import type * as adminReset from "../adminReset.js";
import type * as auth from "../auth.js";
import type * as chat from "../chat.js";
import type * as chatMentions from "../chatMentions.js";
import type * as collegeAttendance from "../collegeAttendance.js";
import type * as collegeReviewHelpers from "../collegeReviewHelpers.js";
import type * as collegeReviews from "../collegeReviews.js";
import type * as collegeStats from "../collegeStats.js";
import type * as crons from "../crons.js";
import type * as emails from "../emails.js";
import type * as formalAttendance from "../formalAttendance.js";
import type * as groupSize from "../groupSize.js";
import type * as guards from "../guards.js";
import type * as http from "../http.js";
import type * as listingFormat from "../listingFormat.js";
import type * as listingHelpers from "../listingHelpers.js";
import type * as listingMembership from "../listingMembership.js";
import type * as listings from "../listings.js";
import type * as pushNotifications from "../pushNotifications.js";
import type * as storage from "../storage.js";
import type * as testAuth from "../testAuth.js";
import type * as uiFont from "../uiFont.js";
import type * as uploadOwnership from "../uploadOwnership.js";
import type * as userVerification from "../userVerification.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  AdminEmail: typeof AdminEmail;
  DevEmail: typeof DevEmail;
  ResendOTP: typeof ResendOTP;
  TestEmail: typeof TestEmail;
  adminReset: typeof adminReset;
  auth: typeof auth;
  chat: typeof chat;
  chatMentions: typeof chatMentions;
  collegeAttendance: typeof collegeAttendance;
  collegeReviewHelpers: typeof collegeReviewHelpers;
  collegeReviews: typeof collegeReviews;
  collegeStats: typeof collegeStats;
  crons: typeof crons;
  emails: typeof emails;
  formalAttendance: typeof formalAttendance;
  groupSize: typeof groupSize;
  guards: typeof guards;
  http: typeof http;
  listingFormat: typeof listingFormat;
  listingHelpers: typeof listingHelpers;
  listingMembership: typeof listingMembership;
  listings: typeof listings;
  pushNotifications: typeof pushNotifications;
  storage: typeof storage;
  testAuth: typeof testAuth;
  uiFont: typeof uiFont;
  uploadOwnership: typeof uploadOwnership;
  userVerification: typeof userVerification;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
