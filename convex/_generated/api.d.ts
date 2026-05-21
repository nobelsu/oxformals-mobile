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
import type * as adminReset from "../adminReset.js";
import type * as auth from "../auth.js";
import type * as chat from "../chat.js";
import type * as chatMentions from "../chatMentions.js";
import type * as crons from "../crons.js";
import type * as emails from "../emails.js";
import type * as groupSize from "../groupSize.js";
import type * as http from "../http.js";
import type * as listingFormat from "../listingFormat.js";
import type * as listingHelpers from "../listingHelpers.js";
import type * as listings from "../listings.js";
import type * as pushNotifications from "../pushNotifications.js";
import type * as storage from "../storage.js";
import type * as uiFont from "../uiFont.js";
import type * as userVerification from "../userVerification.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  AdminEmail: typeof AdminEmail;
  ResendOTP: typeof ResendOTP;
  adminReset: typeof adminReset;
  auth: typeof auth;
  chat: typeof chat;
  chatMentions: typeof chatMentions;
  crons: typeof crons;
  emails: typeof emails;
  groupSize: typeof groupSize;
  http: typeof http;
  listingFormat: typeof listingFormat;
  listingHelpers: typeof listingHelpers;
  listings: typeof listings;
  pushNotifications: typeof pushNotifications;
  storage: typeof storage;
  uiFont: typeof uiFont;
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
