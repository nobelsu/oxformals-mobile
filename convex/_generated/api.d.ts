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
import type * as ResendOTP from "../ResendOTP.js";
import type * as account from "../account.js";
import type * as accountDeletion from "../accountDeletion.js";
import type * as adminReset from "../adminReset.js";
import type * as auth from "../auth.js";
import type * as badges from "../badges.js";
import type * as bio from "../bio.js";
import type * as bioLimits from "../bioLimits.js";
import type * as blocks from "../blocks.js";
import type * as chat from "../chat.js";
import type * as chatMentions from "../chatMentions.js";
import type * as collegeAttendance from "../collegeAttendance.js";
import type * as collegeDirectory from "../collegeDirectory.js";
import type * as collegeGuide from "../collegeGuide.js";
import type * as collegeReviewHelpers from "../collegeReviewHelpers.js";
import type * as collegeReviews from "../collegeReviews.js";
import type * as collegeStats from "../collegeStats.js";
import type * as contacts from "../contacts.js";
import type * as credits from "../credits.js";
import type * as crons from "../crons.js";
import type * as emailAssets from "../emailAssets.js";
import type * as emailNotifications from "../emailNotifications.js";
import type * as emailTemplate from "../emailTemplate.js";
import type * as emails from "../emails.js";
import type * as expoPush from "../expoPush.js";
import type * as feed from "../feed.js";
import type * as feedBookmarks from "../feedBookmarks.js";
import type * as feedComments from "../feedComments.js";
import type * as feedLikes from "../feedLikes.js";
import type * as follows from "../follows.js";
import type * as formalAttendance from "../formalAttendance.js";
import type * as groupSize from "../groupSize.js";
import type * as guards from "../guards.js";
import type * as http from "../http.js";
import type * as invites from "../invites.js";
import type * as listingFormat from "../listingFormat.js";
import type * as listingHelpers from "../listingHelpers.js";
import type * as listingMembership from "../listingMembership.js";
import type * as listings from "../listings.js";
import type * as londonTime from "../londonTime.js";
import type * as migrations from "../migrations.js";
import type * as moderation from "../moderation.js";
import type * as notificationCopy from "../notificationCopy.js";
import type * as notificationDelivery from "../notificationDelivery.js";
import type * as notificationKinds from "../notificationKinds.js";
import type * as notificationPrefs from "../notificationPrefs.js";
import type * as notifications from "../notifications.js";
import type * as notify from "../notify.js";
import type * as partyInvites from "../partyInvites.js";
import type * as password from "../password.js";
import type * as peopleSearch from "../peopleSearch.js";
import type * as peopleYouMayKnow from "../peopleYouMayKnow.js";
import type * as profileActivity from "../profileActivity.js";
import type * as pushNotifications from "../pushNotifications.js";
import type * as randomCode from "../randomCode.js";
import type * as referrals from "../referrals.js";
import type * as reports from "../reports.js";
import type * as retention from "../retention.js";
import type * as roles from "../roles.js";
import type * as seatLinks from "../seatLinks.js";
import type * as seats from "../seats.js";
import type * as share from "../share.js";
import type * as storage from "../storage.js";
import type * as swapLinks from "../swapLinks.js";
import type * as uiFont from "../uiFont.js";
import type * as uploadOwnership from "../uploadOwnership.js";
import type * as userVerification from "../userVerification.js";
import type * as userVisibility from "../userVisibility.js";
import type * as users from "../users.js";
import type * as webPushCore from "../webPushCore.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  AdminEmail: typeof AdminEmail;
  ResendOTP: typeof ResendOTP;
  account: typeof account;
  accountDeletion: typeof accountDeletion;
  adminReset: typeof adminReset;
  auth: typeof auth;
  badges: typeof badges;
  bio: typeof bio;
  bioLimits: typeof bioLimits;
  blocks: typeof blocks;
  chat: typeof chat;
  chatMentions: typeof chatMentions;
  collegeAttendance: typeof collegeAttendance;
  collegeDirectory: typeof collegeDirectory;
  collegeGuide: typeof collegeGuide;
  collegeReviewHelpers: typeof collegeReviewHelpers;
  collegeReviews: typeof collegeReviews;
  collegeStats: typeof collegeStats;
  contacts: typeof contacts;
  credits: typeof credits;
  crons: typeof crons;
  emailAssets: typeof emailAssets;
  emailNotifications: typeof emailNotifications;
  emailTemplate: typeof emailTemplate;
  emails: typeof emails;
  expoPush: typeof expoPush;
  feed: typeof feed;
  feedBookmarks: typeof feedBookmarks;
  feedComments: typeof feedComments;
  feedLikes: typeof feedLikes;
  follows: typeof follows;
  formalAttendance: typeof formalAttendance;
  groupSize: typeof groupSize;
  guards: typeof guards;
  http: typeof http;
  invites: typeof invites;
  listingFormat: typeof listingFormat;
  listingHelpers: typeof listingHelpers;
  listingMembership: typeof listingMembership;
  listings: typeof listings;
  londonTime: typeof londonTime;
  migrations: typeof migrations;
  moderation: typeof moderation;
  notificationCopy: typeof notificationCopy;
  notificationDelivery: typeof notificationDelivery;
  notificationKinds: typeof notificationKinds;
  notificationPrefs: typeof notificationPrefs;
  notifications: typeof notifications;
  notify: typeof notify;
  partyInvites: typeof partyInvites;
  password: typeof password;
  peopleSearch: typeof peopleSearch;
  peopleYouMayKnow: typeof peopleYouMayKnow;
  profileActivity: typeof profileActivity;
  pushNotifications: typeof pushNotifications;
  randomCode: typeof randomCode;
  referrals: typeof referrals;
  reports: typeof reports;
  retention: typeof retention;
  roles: typeof roles;
  seatLinks: typeof seatLinks;
  seats: typeof seats;
  share: typeof share;
  storage: typeof storage;
  swapLinks: typeof swapLinks;
  uiFont: typeof uiFont;
  uploadOwnership: typeof uploadOwnership;
  userVerification: typeof userVerification;
  userVisibility: typeof userVisibility;
  users: typeof users;
  webPushCore: typeof webPushCore;
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
